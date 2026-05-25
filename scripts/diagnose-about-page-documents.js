#!/usr/bin/env node

"use strict";

const { Client } = require("pg");

const ABOUT_PAGE_UID = "api::about-page.about-page";
const ABOUT_PAGE_TABLE = "about_pages";
const ABOUT_PAGE_COMPONENTS_TABLE = "about_pages_cmps";
const PARTNER_COMPONENTS_TABLE = "components_about_partner_cards_cmps";
const FILES_RELATED_TABLE = "files_related_mph";
const FILES_TABLE = "files";

const COMPONENT_TABLES = {
  "about.value-card": "components_about_value_cards",
  "about.why-item": "components_about_why_items",
  "about.partner-card": "components_about_partner_cards",
  "about.store-link": "components_about_store_links",
};

const args = new Set(process.argv.slice(2));
const schemaName = process.env.DATABASE_SCHEMA || "public";
const apiBaseUrl = process.env.STRAPI_PUBLIC_URL || process.env.STRAPI_URL || process.env.PUBLIC_STRAPI_URL || "";

if (args.has("--help") || args.has("-h")) {
  console.log(`
Usage:
  node scripts/diagnose-about-page-documents.js

Required env:
  DATABASE_URL=postgres://...

Optional env:
  DATABASE_SSL=true
  DATABASE_SSL_REJECT_UNAUTHORIZED=false
  DATABASE_SCHEMA=public
  STRAPI_PUBLIC_URL=https://your-strapi-host.onrender.com

This script is read-only. It does not delete, update, or insert anything.
It prints the current about-page documents, component relations, media links,
nested partner stores, and optionally the public API documentId.
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

function assertDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Do not put it in the script; pass it via env.");
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

  requireTable(tables, ABOUT_PAGE_TABLE);
  requireTable(tables, ABOUT_PAGE_COMPONENTS_TABLE);

  const aboutPageColumns = await requireColumns(client, ABOUT_PAGE_TABLE, [
    "id",
    "document_id",
    "title",
    "enabled",
    "subtitle",
    "published_at",
    "created_at",
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

  if (tables.includes(FILES_RELATED_TABLE)) {
    await requireColumns(client, FILES_RELATED_TABLE, [
      "id",
      "file_id",
      "related_id",
      "related_type",
      "field",
      "order",
    ]);
  }

  if (tables.includes(FILES_TABLE)) {
    await requireColumns(client, FILES_TABLE, [
      "id",
      "document_id",
      "name",
      "alternative_text",
      "caption",
      "url",
      "mime",
      "provider",
      "created_at",
      "updated_at",
    ]);
  }

  if (tables.includes(PARTNER_COMPONENTS_TABLE)) {
    await requireColumns(client, PARTNER_COMPONENTS_TABLE, [
      "id",
      "entity_id",
      "cmp_id",
      "component_type",
      "field",
      "order",
    ]);
  }

  return {
    tables,
    interestingTables,
    interestingTableColumns,
    aboutPageColumns,
    componentLinkColumns,
    hasFilesRelatedTable: tables.includes(FILES_RELATED_TABLE),
    hasFilesTable: tables.includes(FILES_TABLE),
    hasPartnerNestedLinksTable: tables.includes(PARTNER_COMPONENTS_TABLE),
  };
}

async function getAboutPages(client) {
  const result = await client.query(`
    select
      id,
      document_id,
      title,
      enabled,
      subtitle,
      published_at,
      created_at,
      updated_at,
      case when published_at is null then 'draft' else 'published' end as status
    from ${qualified(ABOUT_PAGE_TABLE)}
    order by document_id nulls last, published_at nulls first, id
  `);

  return result.rows;
}

async function getAboutPageComponentRows(client) {
  const result = await client.query(`
    select
      cmps.id,
      cmps.entity_id,
      about_pages.document_id,
      about_pages.title as about_title,
      case when about_pages.published_at is null then 'draft' else 'published' end as about_status,
      cmps.field,
      cmps.component_type,
      cmps.cmp_id,
      cmps."order"
    from ${qualified(ABOUT_PAGE_COMPONENTS_TABLE)} cmps
    join ${qualified(ABOUT_PAGE_TABLE)} about_pages
      on about_pages.id = cmps.entity_id
    order by about_pages.document_id nulls last, about_pages.published_at nulls first, cmps.field, cmps."order", cmps.id
  `);

  return result.rows;
}

async function getComponentRows(client, metadata, componentRows) {
  const result = {};

  for (const [componentType, tableName] of Object.entries(COMPONENT_TABLES)) {
    if (!metadata.tables.includes(tableName)) {
      result[componentType] = { tableName, available: false, rows: [] };
      continue;
    }

    const ids = [
      ...new Set(
        componentRows
          .filter((row) => row.component_type === componentType)
          .map((row) => row.cmp_id)
          .filter(Boolean),
      ),
    ];

    if (ids.length === 0) {
      result[componentType] = { tableName, available: true, rows: [] };
      continue;
    }

    const rows = (
      await client.query(
        `
          select *
          from ${qualified(tableName)}
          where id = any($1::int[])
          order by id
        `,
        [ids],
      )
    ).rows;

    result[componentType] = { tableName, available: true, rows };
  }

  return result;
}

async function getNestedStoreRows(client, metadata, componentRows) {
  if (!metadata.hasPartnerNestedLinksTable) {
    return { available: false, rows: [], reason: `${PARTNER_COMPONENTS_TABLE} was not found` };
  }

  const partnerIds = [
    ...new Set(
      componentRows
        .filter((row) => row.component_type === "about.partner-card")
        .map((row) => row.cmp_id)
        .filter(Boolean),
    ),
  ];

  if (partnerIds.length === 0) {
    return { available: true, rows: [], reason: "No partner component rows found" };
  }

  const rows = (
    await client.query(
      `
        select
          partner_cmps.id,
          partner_cmps.entity_id as partner_component_id,
          partner_cmps.cmp_id as store_component_id,
          partner_cmps.component_type,
          partner_cmps.field,
          partner_cmps."order"
        from ${qualified(PARTNER_COMPONENTS_TABLE)} partner_cmps
        where partner_cmps.entity_id = any($1::int[])
        order by partner_cmps.entity_id, partner_cmps.field, partner_cmps."order", partner_cmps.id
      `,
      [partnerIds],
    )
  ).rows;

  return { available: true, rows, reason: null };
}

async function getMediaLinks(client, metadata, aboutPages, componentRows, nestedStoreRows) {
  if (!metadata.hasFilesRelatedTable) {
    return { available: false, rows: [], reason: `${FILES_RELATED_TABLE} was not found` };
  }

  const mediaTargets = [
    ...aboutPages.map((page) => ({
      relatedType: ABOUT_PAGE_UID,
      relatedId: page.id,
      owner: {
        kind: "about-page",
        documentId: page.document_id,
        entityId: page.id,
        title: page.title,
        status: page.status,
      },
    })),
    ...componentRows.map((row) => ({
      relatedType: row.component_type,
      relatedId: row.cmp_id,
      owner: {
        kind: "about-component",
        documentId: row.document_id,
        entityId: row.entity_id,
        field: row.field,
        componentType: row.component_type,
        componentId: row.cmp_id,
      },
    })),
    ...nestedStoreRows.rows.map((row) => ({
      relatedType: row.component_type,
      relatedId: row.store_component_id,
      owner: {
        kind: "nested-store-component",
        partnerComponentId: row.partner_component_id,
        field: row.field,
        componentType: row.component_type,
        componentId: row.store_component_id,
      },
    })),
  ];

  if (mediaTargets.length === 0) {
    return { available: true, rows: [], reason: "No media targets found" };
  }

  const predicates = [];
  const params = [];

  for (const target of mediaTargets) {
    params.push(target.relatedType, target.relatedId);
    predicates.push(`(related_type = $${params.length - 1} and related_id = $${params.length})`);
  }

  const relationRows = (
    await client.query(
      `
        select id, file_id, related_id, related_type, field, "order"
        from ${qualified(FILES_RELATED_TABLE)}
        where ${predicates.join(" or ")}
        order by related_type, related_id, field, "order", id
      `,
      params,
    )
  ).rows;

  if (relationRows.length === 0) {
    return { available: true, rows: [], reason: null };
  }

  const fileIds = [...new Set(relationRows.map((row) => row.file_id).filter(Boolean))];
  const fileRows =
    metadata.hasFilesTable && fileIds.length > 0
      ? (
          await client.query(
            `
              select id, document_id, name, alternative_text, caption, url, mime, provider, created_at, updated_at
              from ${qualified(FILES_TABLE)}
              where id = any($1::int[])
              order by id
            `,
            [fileIds],
          )
        ).rows
      : [];
  const fileById = new Map(fileRows.map((file) => [file.id, file]));

  const ownerByKey = new Map(
    mediaTargets.map((target) => [`${target.relatedType}:${target.relatedId}`, target.owner]),
  );

  return {
    available: true,
    rows: relationRows.map((row) => ({
      ...row,
      owner: ownerByKey.get(`${row.related_type}:${row.related_id}`) || null,
      file: fileById.get(row.file_id) || null,
    })),
    reason: null,
  };
}

function getComponentCountsByDocument(componentRows) {
  const counts = new Map();

  for (const row of componentRows) {
    const key = `${row.document_id || "<null>"}:${row.entity_id}:${row.about_status}`;
    const current = counts.get(key) || {
      documentId: row.document_id,
      entityId: row.entity_id,
      title: row.about_title,
      status: row.about_status,
      values: 0,
      whyItems: 0,
      partners: 0,
      otherFields: {},
    };

    if (["values", "whyItems", "partners"].includes(row.field)) {
      current[row.field] += 1;
    } else {
      current.otherFields[row.field] = (current.otherFields[row.field] || 0) + 1;
    }

    counts.set(key, current);
  }

  return [...counts.values()];
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
    ids: rows.map((row) => row.id),
    titles: [...new Set(rows.map((row) => row.title))],
    enabledValues: [...new Set(rows.map((row) => row.enabled))],
    statuses: rows.map((row) => row.status),
    updatedAt: rows.map((row) => row.updated_at),
  }));
}

function getDbPublicCandidates(aboutPages) {
  return aboutPages
    .filter((page) => page.published_at !== null && page.enabled !== false)
    .map((page) => ({
      id: page.id,
      documentId: page.document_id,
      title: page.title,
      enabled: page.enabled,
      status: page.status,
      publishedAt: page.published_at,
      updatedAt: page.updated_at,
    }));
}

function normalizeApiBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

async function getPublicApiDiagnostic() {
  if (!apiBaseUrl) {
    return {
      skipped: true,
      reason: "Set STRAPI_PUBLIC_URL, STRAPI_URL, or PUBLIC_STRAPI_URL to check the public REST API.",
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
      rawKeys: json?.data && typeof json.data === "object" ? Object.keys(json.data) : null,
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

function summarizeRows(rows, maxRows = 100) {
  return {
    count: rows.length,
    rows: rows.slice(0, maxRows),
    truncated: rows.length > maxRows,
  };
}

async function main() {
  assertDatabaseUrl();

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: getSslConfig(),
  });

  await client.connect();

  try {
    console.log("Formula72 about-page document diagnostics");
    console.log({
      mode: "read-only",
      schema: schemaName,
      aboutPageUid: ABOUT_PAGE_UID,
      apiBaseUrl: apiBaseUrl || null,
    });

    const metadata = await introspect(client);
    const aboutPages = await getAboutPages(client);
    const componentRows = await getAboutPageComponentRows(client);
    const componentDetails = await getComponentRows(client, metadata, componentRows);
    const nestedStoreRows = await getNestedStoreRows(client, metadata, componentRows);
    const mediaLinks = await getMediaLinks(client, metadata, aboutPages, componentRows, nestedStoreRows);
    const apiDiagnostic = await getPublicApiDiagnostic();

    console.log("Discovered relevant tables:");
    console.log(metadata.interestingTables);
    console.log("Discovered relevant table columns:");
    console.log(metadata.interestingTableColumns);
    console.log("About-page rows:");
    console.log(summarizeRows(aboutPages));
    console.log("About-page document groups:");
    console.log(groupDocuments(aboutPages));
    console.log("DB public candidates (published and enabled != false):");
    console.log(getDbPublicCandidates(aboutPages));
    console.log("All about_pages_cmps rows grouped by document_id:");
    console.log(summarizeRows(componentRows));
    console.log("Component counts by about-page row:");
    console.log(getComponentCountsByDocument(componentRows));
    console.log("Component table rows for linked components:");
    console.log(componentDetails);
    console.log("Nested partner store component links:");
    console.log(nestedStoreRows);
    console.log("Media links from files_related_mph for about page and about components:");
    console.log(mediaLinks);
    console.log("Public API diagnostic:");
    console.log(apiDiagnostic);
    console.log("No database changes were made.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Diagnostics failed. No database changes were attempted.");
  console.error(error);
  process.exit(1);
});
