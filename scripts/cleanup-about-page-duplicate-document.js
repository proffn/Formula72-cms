#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

const ABOUT_PAGE_UID = "api::about-page.about-page";
const ABOUT_PAGE_TABLE = "about_pages";
const ABOUT_PAGE_COMPONENTS_TABLE = "about_pages_cmps";
const PARTNER_COMPONENTS_TABLE = "components_about_partner_cards_cmps";
const PARTNER_COMPONENT_TABLE = "components_about_partner_cards";
const FILES_RELATED_TABLE = "files_related_mph";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const schemaName = process.env.DATABASE_SCHEMA || "public";
const deleteDocumentId = process.env.DELETE_ABOUT_DOCUMENT_ID || "";
const keepDocumentId = process.env.KEEP_ABOUT_DOCUMENT_ID || "";
const apiBaseUrl = process.env.STRAPI_PUBLIC_URL || process.env.STRAPI_URL || process.env.PUBLIC_STRAPI_URL || "";

if (args.has("--help") || args.has("-h")) {
  console.log(`
Usage:
  node scripts/cleanup-about-page-duplicate-document.js --dry-run
  node scripts/cleanup-about-page-duplicate-document.js

Required env:
  DATABASE_URL=postgres://...
  DELETE_ABOUT_DOCUMENT_ID=cnaufgttn6z0w49yxqh4n84i
  KEEP_ABOUT_DOCUMENT_ID=k07ubdddnvgb6d84gj1n08uc

Optional env:
  DATABASE_SSL=true
  DATABASE_SSL_REJECT_UNAUTHORIZED=false
  DATABASE_SCHEMA=public
  STRAPI_PUBLIC_URL=https://formula72-cms.onrender.com

This script deletes only duplicate rows from about_pages and their direct rows
from about_pages_cmps. It also deletes files_related_mph rows directly attached
to the deleted about_pages rows. Component tables, nested partner stores, media
files, and other content types are never deleted by this script.
`);
  process.exit(0);
}

function getSslConfig() {
  if (process.env.DATABASE_SSL !== "true") {
    return undefined;
  }

  return {
    rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
  };
}

function assertRequiredEnv() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Do not put it in the script; pass it via env.");
  }

  if (!deleteDocumentId) {
    throw new Error("DELETE_ABOUT_DOCUMENT_ID is required. Refusing to guess which about-page document to delete.");
  }

  if (!keepDocumentId) {
    throw new Error("KEEP_ABOUT_DOCUMENT_ID is required. Refusing to delete without an explicit keep guard.");
  }
}

function quoteIdent(identifier) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }

  return `"${identifier}"`;
}

function qualified(tableName) {
  return `${quoteIdent(schemaName)}.${quoteIdent(tableName)}`;
}

function isInterestingTable(tableName) {
  return /(about|file|upload|media|morph|mph|links|lnk|cmps|relation|localizations)/i.test(tableName);
}

async function getTables(client) {
  const result = await client.query(
    `
      select table_name
      from information_schema.tables
      where table_schema = $1
        and table_type = 'BASE TABLE'
      order by table_name
    `,
    [schemaName],
  );

  return result.rows.map((row) => row.table_name);
}

async function getColumns(client, tableName) {
  const result = await client.query(
    `
      select column_name
      from information_schema.columns
      where table_schema = $1
        and table_name = $2
      order by ordinal_position
    `,
    [schemaName, tableName],
  );

  return result.rows.map((row) => row.column_name);
}

function requireTable(tables, tableName) {
  if (!tables.includes(tableName)) {
    throw new Error(`Required table not found: ${schemaName}.${tableName}`);
  }
}

async function requireColumns(client, tableName, requiredColumns) {
  const columns = await getColumns(client, tableName);
  const missing = requiredColumns.filter((column) => !columns.includes(column));

  if (missing.length > 0) {
    throw new Error(
      `Table ${schemaName}.${tableName} has unexpected structure. Missing columns: ${missing.join(", ")}`,
    );
  }

  return columns;
}

async function introspect(client) {
  const tables = await getTables(client);
  const interestingTables = tables.filter(isInterestingTable);
  const interestingTableColumns = {};

  for (const table of interestingTables) {
    interestingTableColumns[table] = await getColumns(client, table);
  }

  console.log("Discovered relevant tables during introspection:");
  console.log(interestingTables);
  console.log("Discovered relevant table columns:");
  console.log(interestingTableColumns);

  requireTable(tables, ABOUT_PAGE_TABLE);
  requireTable(tables, ABOUT_PAGE_COMPONENTS_TABLE);

  const aboutPageColumns = await requireColumns(client, ABOUT_PAGE_TABLE, [
    "id",
    "document_id",
    "title",
    "locale",
    "published_at",
    "updated_at",
  ]);
  const componentLinkColumns = await requireColumns(client, ABOUT_PAGE_COMPONENTS_TABLE, [
    "id",
    "entity_id",
    "cmp_id",
    "component_type",
    "field",
    "order",
  ]);

  if (tables.includes(PARTNER_COMPONENTS_TABLE)) {
    await requireColumns(client, PARTNER_COMPONENTS_TABLE, [
      "id",
      "entity_id",
      "cmp_id",
      "component_type",
      "field",
    ]);
  }

  if (tables.includes(FILES_RELATED_TABLE)) {
    await requireColumns(client, FILES_RELATED_TABLE, ["id", "file_id", "related_id", "related_type", "field"]);
  }

  return {
    tables,
    interestingTables,
    interestingTableColumns,
    aboutPageColumns,
    componentLinkColumns,
    hasPartnerNestedLinksTable: tables.includes(PARTNER_COMPONENTS_TABLE),
    hasPartnerComponentTable: tables.includes(PARTNER_COMPONENT_TABLE),
    hasFilesRelatedTable: tables.includes(FILES_RELATED_TABLE),
  };
}

async function getAboutPages(client) {
  const result = await client.query(`
    select id, document_id, title, locale, published_at, updated_at
    from ${qualified(ABOUT_PAGE_TABLE)}
    order by document_id nulls last, published_at nulls first, id
  `);

  return result.rows;
}

async function getRowsToDelete(client) {
  const result = await client.query(
    `
      select id, document_id, title, locale, published_at, updated_at
      from ${qualified(ABOUT_PAGE_TABLE)}
      where document_id = $1
      order by published_at nulls first, id
    `,
    [deleteDocumentId],
  );

  return result.rows;
}

async function getRowsToKeep(client) {
  if (!keepDocumentId) {
    return [];
  }

  const result = await client.query(
    `
      select id, document_id, title, locale, published_at, updated_at
      from ${qualified(ABOUT_PAGE_TABLE)}
      where document_id = $1
      order by published_at nulls first, id
    `,
    [keepDocumentId],
  );

  return result.rows;
}

async function getComponentRelationsForPages(client, aboutPageIds) {
  if (aboutPageIds.length === 0) {
    return [];
  }

  const result = await client.query(
    `
      select
        cmps.*,
        about_pages.document_id as about_document_id,
        about_pages.title as about_title,
        case when about_pages.published_at is null then 'draft' else 'published' end as about_status
      from ${qualified(ABOUT_PAGE_COMPONENTS_TABLE)} cmps
      join ${qualified(ABOUT_PAGE_TABLE)} about_pages
        on about_pages.id = cmps.entity_id
      where cmps.entity_id = any($1::int[])
      order by cmps.entity_id, cmps.field, cmps."order", cmps.id
    `,
    [aboutPageIds],
  );

  return result.rows;
}

async function getAboutPageMediaRelations(client, metadata, aboutPageIds) {
  if (!metadata.hasFilesRelatedTable) {
    return [];
  }

  if (aboutPageIds.length === 0) {
    return [];
  }

  const result = await client.query(
    `
      select *
      from ${qualified(FILES_RELATED_TABLE)}
      where related_type = $1
        and related_id = any($2::int[])
      order by related_id, field, id
    `,
    [ABOUT_PAGE_UID, aboutPageIds],
  );

  return result.rows;
}

async function getNestedPartnerStoreDiagnostics(client, metadata, componentRelations) {
  if (!metadata.hasPartnerNestedLinksTable || !metadata.hasPartnerComponentTable) {
    return {
      available: false,
      rows: [],
      reason: `${PARTNER_COMPONENTS_TABLE} or ${PARTNER_COMPONENT_TABLE} was not found`,
    };
  }

  const partnerComponentIds = [
    ...new Set(
      componentRelations
        .filter((row) => row.field === "partners" && row.component_type === "about.partner-card")
        .map((row) => row.cmp_id)
        .filter(Boolean),
    ),
  ];

  if (partnerComponentIds.length === 0) {
    return { available: true, rows: [], reason: "No partner component relations on deleted about-page rows" };
  }

  const result = await client.query(
    `
      select
        partner_cmps.*,
        partner_cards.title as partner_title
      from ${qualified(PARTNER_COMPONENTS_TABLE)} partner_cmps
      join ${qualified(PARTNER_COMPONENT_TABLE)} partner_cards
        on partner_cards.id = partner_cmps.entity_id
      where partner_cmps.entity_id = any($1::int[])
      order by partner_cmps.entity_id, partner_cmps.field, partner_cmps."order", partner_cmps.id
    `,
    [partnerComponentIds],
  );

  return { available: true, rows: result.rows, reason: null };
}

function candidateReferenceColumns(columns) {
  return columns.filter((column) =>
    [
      "entity_id",
      "related_id",
      "inv_entity_id",
      "about_page_id",
      "about_id",
      "page_id",
      "document_id",
      "related_type",
      "field",
    ].includes(column),
  );
}

async function getPotentialRelatedRows(client, metadata, aboutPageIds) {
  const diagnostics = [];
  const textTargets = [deleteDocumentId, ABOUT_PAGE_UID].filter(Boolean);

  for (const tableName of metadata.interestingTables) {
    if ([ABOUT_PAGE_TABLE, ABOUT_PAGE_COMPONENTS_TABLE, FILES_RELATED_TABLE].includes(tableName)) {
      continue;
    }

    const columns = metadata.interestingTableColumns[tableName] || [];
    const referenceColumns = candidateReferenceColumns(columns);

    if (referenceColumns.length === 0) {
      continue;
    }

    const predicates = [];
    const params = [];

    for (const column of referenceColumns) {
      if (["entity_id", "related_id", "inv_entity_id", "about_page_id", "about_id", "page_id"].includes(column)) {
        params.push(aboutPageIds);
        predicates.push(`${quoteIdent(column)} = any($${params.length}::int[])`);
      }

      if (["document_id", "related_type"].includes(column) && textTargets.length > 0) {
        params.push(textTargets);
        predicates.push(`${quoteIdent(column)} = any($${params.length}::text[])`);
      }
    }

    if (predicates.length === 0) {
      continue;
    }

    const result = await client.query(
      `
        select *
        from ${qualified(tableName)}
        where ${predicates.join(" or ")}
        limit 100
      `,
      params,
    );

    if (result.rows.length > 0) {
      diagnostics.push({
        tableName,
        referenceColumns,
        rows: result.rows,
        truncatedAt: 100,
      });
    }
  }

  return diagnostics;
}

function groupDocuments(aboutPages) {
  const groups = new Map();

  for (const page of aboutPages) {
    const documentId = page.document_id || "<null>";
    groups.set(documentId, [...(groups.get(documentId) || []), page]);
  }

  return [...groups.entries()].map(([documentId, rows]) => ({
    documentId,
    rowCount: rows.length,
    titles: [...new Set(rows.map((row) => row.title))],
    statuses: rows.map((row) => (row.published_at ? "published" : "draft")),
    ids: rows.map((row) => row.id),
  }));
}

function summarizeRows(rows, maxRows = 50) {
  return {
    count: rows.length,
    rows: rows.slice(0, maxRows),
    truncated: rows.length > maxRows,
  };
}

function writeBackup(payload) {
  const backupDir = path.resolve(process.cwd(), ".tmp", "cleanup-backups");
  fs.mkdirSync(backupDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `about-page-duplicate-document-${deleteDocumentId}-${stamp}.json`);

  fs.writeFileSync(backupPath, JSON.stringify(payload, null, 2));
  return backupPath;
}

function normalizeApiBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

async function getPublicApiDiagnostic() {
  if (!apiBaseUrl) {
    return {
      skipped: true,
      reason: "Set STRAPI_PUBLIC_URL, STRAPI_URL, or PUBLIC_STRAPI_URL to enable the public API keep guard.",
    };
  }

  const url = `${normalizeApiBaseUrl(apiBaseUrl)}/api/about-page?populate=*`;

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
    });
    const text = await response.text();
    let json = null;

    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    return {
      skipped: false,
      url,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      dataDocumentId: json?.data?.documentId || json?.data?.document_id || null,
      dataId: json?.data?.id || null,
      dataTitle: json?.data?.title || json?.data?.attributes?.title || null,
      dataEnabled: json?.data?.enabled ?? json?.data?.attributes?.enabled ?? null,
      bodyPreview: text.slice(0, 2000),
    };
  } catch (error) {
    return {
      skipped: false,
      url,
      ok: false,
      error: error.message,
    };
  }
}

function assertPublicApiKeepGuard(apiDiagnostic) {
  if (apiDiagnostic.skipped) {
    return;
  }

  if (!apiDiagnostic.ok) {
    throw new Error(`Public API guard failed: ${apiDiagnostic.url} did not return OK.`);
  }

  if (apiDiagnostic.dataDocumentId !== keepDocumentId) {
    throw new Error(
      `Public API guard failed: expected documentId ${keepDocumentId}, got ${apiDiagnostic.dataDocumentId || "<empty>"}.`,
    );
  }
}

function assertSafeDeletePlan(rowsToDelete, rowsToKeep) {
  if (rowsToDelete.length === 0) {
    throw new Error(`No about-page rows found for DELETE_ABOUT_DOCUMENT_ID=${deleteDocumentId}`);
  }

  if (rowsToKeep.length === 0) {
    throw new Error(`KEEP_ABOUT_DOCUMENT_ID=${keepDocumentId} was not found. Refusing to continue.`);
  }

  if (keepDocumentId === deleteDocumentId) {
    throw new Error("KEEP_ABOUT_DOCUMENT_ID and DELETE_ABOUT_DOCUMENT_ID must be different.");
  }

  const wrongDeleteRows = rowsToDelete.filter((row) => row.document_id !== deleteDocumentId);

  if (wrongDeleteRows.length > 0) {
    throw new Error("Delete rows include an unexpected document_id. Refusing to continue.");
  }

  const wrongKeepRows = rowsToKeep.filter((row) => row.document_id !== keepDocumentId);

  if (wrongKeepRows.length > 0) {
    throw new Error("Keep rows include an unexpected document_id. Refusing to continue.");
  }

  const deleteIds = new Set(rowsToDelete.map((row) => row.id));
  const overlappingRows = rowsToKeep.filter((row) => deleteIds.has(row.id));

  if (overlappingRows.length > 0) {
    throw new Error("Keep and delete rows overlap. Refusing to continue.");
  }
}

async function deleteDuplicateDocument(client, rowsToDelete, componentRelations, mediaRelations) {
  const aboutPageIds = rowsToDelete.map((row) => row.id);
  const relationIds = componentRelations.map((row) => row.id);
  const mediaRelationIds = mediaRelations.map((row) => row.id);
  const deletedComponentRelations =
    relationIds.length === 0
      ? []
      : (
          await client.query(
            `
              delete from ${qualified(ABOUT_PAGE_COMPONENTS_TABLE)}
              where id = any($1::int[])
                and entity_id = any($2::int[])
              returning *
            `,
            [relationIds, aboutPageIds],
          )
        ).rows;

  const deletedMediaRelations =
    mediaRelationIds.length === 0
      ? []
      : (
          await client.query(
            `
              delete from ${qualified(FILES_RELATED_TABLE)}
              where id = any($1::int[])
                and related_type = $2
                and related_id = any($3::int[])
              returning *
            `,
            [mediaRelationIds, ABOUT_PAGE_UID, aboutPageIds],
          )
        ).rows;

  const deletedAboutPages = (
    await client.query(
      `
        delete from ${qualified(ABOUT_PAGE_TABLE)}
        where id = any($1::int[])
          and document_id = $2
        returning id, document_id, title, locale, published_at, updated_at
      `,
      [aboutPageIds, deleteDocumentId],
    )
  ).rows;

  return { deletedComponentRelations, deletedMediaRelations, deletedAboutPages };
}

async function main() {
  assertRequiredEnv();

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: getSslConfig(),
  });

  await client.connect();

  try {
    console.log("Formula72 about-page duplicate document cleanup");
    console.log({
      mode: dryRun ? "dry-run" : "write",
      schema: schemaName,
      aboutPageUid: ABOUT_PAGE_UID,
      deleteDocumentId,
      keepDocumentId: keepDocumentId || null,
      apiBaseUrl: apiBaseUrl || null,
    });

    const metadata = await introspect(client);
    const aboutPages = await getAboutPages(client);
    const rowsToDelete = await getRowsToDelete(client);
    const rowsToKeep = await getRowsToKeep(client);
    const publicApiDiagnostic = await getPublicApiDiagnostic();

    assertSafeDeletePlan(rowsToDelete, rowsToKeep);

    const aboutPageIdsToDelete = rowsToDelete.map((row) => row.id);
    const componentRelations = await getComponentRelationsForPages(client, aboutPageIdsToDelete);
    const mediaRelations = await getAboutPageMediaRelations(client, metadata, aboutPageIdsToDelete);
    const nestedPartnerStores = await getNestedPartnerStoreDiagnostics(client, metadata, componentRelations);
    const potentialRelatedRows = await getPotentialRelatedRows(client, metadata, aboutPageIdsToDelete);

    console.log("All current about-page rows:");
    console.log(summarizeRows(aboutPages));
    console.log("About-page document groups:");
    console.log(groupDocuments(aboutPages));
    console.log("Rows that will be deleted from about_pages:");
    console.log(summarizeRows(rowsToDelete));
    console.log("Rows that will be kept for KEEP_ABOUT_DOCUMENT_ID:");
    console.log(summarizeRows(rowsToKeep));
    console.log("Rows that will be deleted from about_pages_cmps:");
    console.log(summarizeRows(componentRelations));
    console.log("Rows that will be deleted from files_related_mph for deleted about_pages only:");
    console.log(summarizeRows(mediaRelations));
    console.log("Public API keep guard:");
    console.log(publicApiDiagnostic);
    assertPublicApiKeepGuard(publicApiDiagnostic);
    console.log("Nested partner store links related to deleted partner components, diagnostic only:");
    console.log(nestedPartnerStores);
    console.log("Other potential link/morph rows related to deleted about_pages, diagnostic only:");
    console.log(summarizeRows(potentialRelatedRows));

    console.log(
      `Planned action: delete ${componentRelations.length} row(s) from ${schemaName}.${ABOUT_PAGE_COMPONENTS_TABLE}, delete ${mediaRelations.length} row(s) from ${schemaName}.${FILES_RELATED_TABLE}, then delete ${rowsToDelete.length} row(s) from ${schemaName}.${ABOUT_PAGE_TABLE}.`,
    );
    console.log("No component tables, nested partner stores, media files, or other content types will be deleted.");

    if (dryRun) {
      console.log("Dry-run only. No database changes were made.");
      console.log("Run without --dry-run to delete only the duplicate about-page document rows shown above.");
      return;
    }

    const backupPayload = {
      createdAt: new Date().toISOString(),
      schema: schemaName,
      aboutPageUid: ABOUT_PAGE_UID,
      deleteDocumentId,
      keepDocumentId: keepDocumentId || null,
      allAboutPagesBeforeCleanup: aboutPages,
      rowsToDelete,
      rowsToKeep,
      componentRelations,
      mediaRelations,
      nestedPartnerStores,
      potentialRelatedRows,
      publicApiDiagnostic,
    };
    const backupPath = writeBackup(backupPayload);
    console.log(`Backup written before deletion: ${backupPath}`);

    await client.query("begin");

    try {
      const result = await deleteDuplicateDocument(client, rowsToDelete, componentRelations, mediaRelations);
      await client.query("commit");

      const remainingAboutPages = await getAboutPages(client);

      console.log("Cleanup committed.");
      console.log({
        deletedAboutPageRows: result.deletedAboutPages,
        deletedComponentRelationRows: result.deletedComponentRelations.length,
        deletedMediaRelationRows: result.deletedMediaRelations.length,
        remainingAboutPageDocumentGroups: groupDocuments(remainingAboutPages),
      });
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Cleanup failed. No changes were committed if the failure happened during write mode.");
  console.error(error);
  process.exit(1);
});
