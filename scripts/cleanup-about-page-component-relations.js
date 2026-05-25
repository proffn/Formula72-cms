#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

const ABOUT_PAGE_UID = "api::about-page.about-page";
const ABOUT_PAGE_TABLE = "about_pages";
const ABOUT_PAGE_COMPONENTS_TABLE = "about_pages_cmps";
const PARTNER_COMPONENTS_TABLE = "components_about_partner_cards_cmps";

const FIELD_CONFIGS = {
  values: {
    componentUid: "about.value-card",
    componentTable: "components_about_value_cards",
  },
  whyItems: {
    componentUid: "about.why-item",
    componentTable: "components_about_why_items",
  },
  partners: {
    componentUid: "about.partner-card",
    componentTable: "components_about_partner_cards",
  },
};

const NESTED_FIELD_CONFIGS = {
  stores: {
    ownerField: "partners",
    componentUid: "about.store-link",
    componentTable: "components_about_store_links",
  },
};

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const diagnoseDuplicates = args.has("--diagnose-duplicates");
const schemaName = process.env.DATABASE_SCHEMA || "public";
const targetFields = parseTargetFields(process.env.TARGET_FIELDS || "values,whyItems,partners");

if (args.has("--help") || args.has("-h")) {
  console.log(`
Usage:
  node scripts/cleanup-about-page-component-relations.js --dry-run
  node scripts/cleanup-about-page-component-relations.js
  node scripts/cleanup-about-page-component-relations.js --dry-run --diagnose-duplicates

Required env:
  DATABASE_URL=postgres://...

Optional env:
  DATABASE_SSL=true
  DATABASE_SSL_REJECT_UNAUTHORIZED=false
  DATABASE_SCHEMA=public
  TARGET_FIELDS=values,whyItems,partners

This script deletes only rows from about_pages_cmps for selected repeatable fields.
Nested partner stores are diagnostic-only and are never deleted by this script.
`);
  process.exit(0);
}

function parseTargetFields(value) {
  const fields = value
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
  const unknownFields = fields.filter((field) => !FIELD_CONFIGS[field]);

  if (unknownFields.length > 0) {
    throw new Error(
      `Unknown TARGET_FIELDS value(s): ${unknownFields.join(", ")}. Allowed: ${Object.keys(FIELD_CONFIGS).join(", ")}`,
    );
  }

  return [...new Set(fields)];
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
  return /(about|value|component|components|morph|links|lnk|cmps)/i.test(tableName);
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

  for (const field of targetFields) {
    requireTable(tables, FIELD_CONFIGS[field].componentTable);
  }

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
  const componentTableColumns = {};

  for (const field of targetFields) {
    componentTableColumns[FIELD_CONFIGS[field].componentTable] = await requireColumns(
      client,
      FIELD_CONFIGS[field].componentTable,
      ["id"],
    );
  }

  const nestedDiagnosticsAvailable =
    tables.includes(PARTNER_COMPONENTS_TABLE) &&
    tables.includes(NESTED_FIELD_CONFIGS.stores.componentTable);

  if (tables.includes(PARTNER_COMPONENTS_TABLE)) {
    await requireColumns(client, PARTNER_COMPONENTS_TABLE, [
      "id",
      "entity_id",
      "cmp_id",
      "component_type",
      "field",
    ]);
  }

  if (tables.includes(NESTED_FIELD_CONFIGS.stores.componentTable)) {
    await requireColumns(client, NESTED_FIELD_CONFIGS.stores.componentTable, ["id"]);
  }

  return {
    tables,
    interestingTables,
    interestingTableColumns,
    aboutPageColumns,
    componentLinkColumns,
    componentTableColumns,
    nestedDiagnosticsAvailable,
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

async function getTargetRelationsForField(client, field) {
  const config = FIELD_CONFIGS[field];
  const result = await client.query(
    `
      select
        cmps.id,
        cmps.entity_id,
        cmps.cmp_id,
        cmps.component_type,
        cmps.field,
        cmps."order",
        about_pages.document_id as about_document_id,
        about_pages.title as about_title,
        about_pages.locale as about_locale,
        about_pages.published_at as about_published_at,
        case when about_pages.published_at is null then 'draft' else 'published' end as about_status,
        component_table.id is not null as component_exists,
        $2::text as expected_component_type,
        $3::text as expected_component_table
      from ${qualified(ABOUT_PAGE_COMPONENTS_TABLE)} cmps
      join ${qualified(ABOUT_PAGE_TABLE)} about_pages
        on about_pages.id = cmps.entity_id
      left join ${qualified(config.componentTable)} component_table
        on component_table.id = cmps.cmp_id
      where cmps.field = $1
      order by cmps.field, cmps.entity_id, cmps."order", cmps.id
    `,
    [field, config.componentUid, config.componentTable],
  );

  return result.rows;
}

async function getTargetRelations(client) {
  const rows = [];

  for (const field of targetFields) {
    rows.push(...(await getTargetRelationsForField(client, field)));
  }

  return rows;
}

async function getNestedStoreDiagnostics(client, partnerRelationRows) {
  if (partnerRelationRows.length === 0) {
    return [];
  }

  const partnerIds = [...new Set(partnerRelationRows.map((row) => row.cmp_id).filter(Boolean))];

  if (partnerIds.length === 0) {
    return [];
  }

  const storesConfig = NESTED_FIELD_CONFIGS.stores;
  const result = await client.query(
    `
      select
        partner_cmps.id,
        partner_cmps.entity_id as partner_component_id,
        partner_cmps.cmp_id as store_component_id,
        partner_cmps.component_type,
        partner_cmps.field,
        partner_cmps."order",
        partner_cards.title as partner_title,
        store_links.id is not null as store_component_exists,
        $2::text as expected_component_type,
        $3::text as expected_component_table
      from ${qualified(PARTNER_COMPONENTS_TABLE)} partner_cmps
      join ${qualified(FIELD_CONFIGS.partners.componentTable)} partner_cards
        on partner_cards.id = partner_cmps.entity_id
      left join ${qualified(storesConfig.componentTable)} store_links
        on store_links.id = partner_cmps.cmp_id
      where partner_cmps.entity_id = any($1::int[])
        and partner_cmps.field = 'stores'
      order by partner_cmps.entity_id, partner_cmps."order", partner_cmps.id
    `,
    [partnerIds, storesConfig.componentUid, storesConfig.componentTable],
  );

  return result.rows;
}

function getDuplicateDocumentDiagnostics(aboutPages) {
  const byDocumentId = new Map();
  const byTitle = new Map();

  for (const page of aboutPages) {
    const documentId = page.document_id || "<null>";
    const title = page.title || "<empty>";

    byDocumentId.set(documentId, [...(byDocumentId.get(documentId) || []), page]);
    byTitle.set(title, [...(byTitle.get(title) || []), page]);
  }

  return {
    documentGroups: [...byDocumentId.entries()].map(([documentId, rows]) => ({
      documentId,
      rowCount: rows.length,
      titles: [...new Set(rows.map((row) => row.title))],
      rows,
    })),
    suspiciousSingleTypeDocuments: [...byDocumentId.entries()]
      .filter(([, rows]) => rows.length > 0)
      .map(([documentId, rows]) => ({
        documentId,
        rowCount: rows.length,
        titles: [...new Set(rows.map((row) => row.title))],
        statuses: rows.map((row) => (row.published_at ? "published" : "draft")),
      })),
    titleGroups: [...byTitle.entries()].map(([title, rows]) => ({
      title,
      rowCount: rows.length,
      documentIds: [...new Set(rows.map((row) => row.document_id))],
    })),
  };
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
  const fieldsPart = targetFields.join("-");
  const backupPath = path.join(backupDir, `about-page-component-relations-${fieldsPart}-${stamp}.json`);

  fs.writeFileSync(backupPath, JSON.stringify(payload, null, 2));
  return backupPath;
}

async function deleteTargetRelations(client, relationRows) {
  const relationIds = relationRows.map((row) => row.id);

  if (relationIds.length === 0) {
    return [];
  }

  const result = await client.query(
    `
      delete from ${qualified(ABOUT_PAGE_COMPONENTS_TABLE)}
      where id = any($1::int[])
        and field = any($2::text[])
      returning *
    `,
    [relationIds, targetFields],
  );

  return result.rows;
}

async function main() {
  assertDatabaseUrl();

  if (targetFields.length === 0) {
    throw new Error("TARGET_FIELDS resolved to an empty list. Nothing to do.");
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: getSslConfig(),
  });

  await client.connect();

  try {
    console.log("Formula72 about-page repeatable component relation cleanup");
    console.log({
      mode: dryRun ? "dry-run" : "write",
      schema: schemaName,
      aboutPageUid: ABOUT_PAGE_UID,
      targetFields,
      fieldConfig: Object.fromEntries(targetFields.map((field) => [field, FIELD_CONFIGS[field]])),
      duplicateDiagnostics: diagnoseDuplicates,
    });

    const metadata = await introspect(client);
    const aboutPages = await getAboutPages(client);
    const relationRows = await getTargetRelations(client);
    const invalidRows = relationRows.filter(
      (row) => row.component_type !== row.expected_component_type || row.component_exists === false,
    );
    const partnerRelationRows = relationRows.filter((row) => row.field === "partners");
    const nestedStoreRows = metadata.nestedDiagnosticsAvailable
      ? await getNestedStoreDiagnostics(client, partnerRelationRows)
      : [];
    const invalidNestedStoreRows = nestedStoreRows.filter(
      (row) => row.component_type !== row.expected_component_type || row.store_component_exists === false,
    );
    const duplicateDiagnostics = getDuplicateDocumentDiagnostics(aboutPages);

    console.log("Required table columns:");
    console.log({
      [ABOUT_PAGE_TABLE]: metadata.aboutPageColumns,
      [ABOUT_PAGE_COMPONENTS_TABLE]: metadata.componentLinkColumns,
      ...metadata.componentTableColumns,
    });
    console.log("About-page rows:");
    console.log(summarizeRows(aboutPages));
    console.log("About-page document diagnostics:");
    console.log({
      totalRows: aboutPages.length,
      documentCount: duplicateDiagnostics.documentGroups.length,
      documentGroups: duplicateDiagnostics.documentGroups.map((group) => ({
        documentId: group.documentId,
        rowCount: group.rowCount,
        titles: group.titles,
      })),
      titleGroups: duplicateDiagnostics.titleGroups,
    });

    if (diagnoseDuplicates) {
      console.log("Full duplicate/document diagnostic rows:");
      console.log(duplicateDiagnostics);
      console.log("This script does not delete duplicate about-page documents.");
    }

    console.log("Current about-page target component relation rows:");
    console.log(summarizeRows(relationRows));
    console.log("Invalid target component relation rows:");
    console.log(summarizeRows(invalidRows));

    if (metadata.nestedDiagnosticsAvailable) {
      console.log("Nested partner stores diagnostic rows only:");
      console.log(summarizeRows(nestedStoreRows));
      console.log("Invalid nested partner stores diagnostic rows:");
      console.log(summarizeRows(invalidNestedStoreRows));
      console.log("Nested stores are not deleted by this script.");
    } else {
      console.log(
        `Nested stores diagnostics skipped: ${PARTNER_COMPONENTS_TABLE} or ${NESTED_FIELD_CONFIGS.stores.componentTable} was not found.`,
      );
    }

    if (relationRows.length === 0) {
      console.log("No about-page target component relations found. Nothing to delete.");
      return;
    }

    console.log(
      `Planned action: delete ${relationRows.length} row(s) from ${schemaName}.${ABOUT_PAGE_COMPONENTS_TABLE} where field in (${targetFields.join(", ")}).`,
    );
    console.log("No component table rows and no nested stores rows will be deleted.");

    if (dryRun) {
      console.log("Dry-run only. No database changes were made.");
      console.log("Run without --dry-run to delete these relation rows.");
      return;
    }

    const backupPayload = {
      createdAt: new Date().toISOString(),
      schema: schemaName,
      aboutPageUid: ABOUT_PAGE_UID,
      targetFields,
      fieldConfig: Object.fromEntries(targetFields.map((field) => [field, FIELD_CONFIGS[field]])),
      aboutPages,
      relationRows,
      invalidRows,
      nestedStoreRows,
      invalidNestedStoreRows,
      duplicateDiagnostics,
    };
    const backupPath = writeBackup(backupPayload);
    console.log(`Backup written before deletion: ${backupPath}`);

    await client.query("begin");

    try {
      const deletedRelations = await deleteTargetRelations(client, relationRows);

      await client.query("commit");

      console.log("Cleanup committed.");
      console.log({
        deletedRelationRows: deletedRelations.length,
        deletedFields: [...new Set(deletedRelations.map((row) => row.field))],
        untouchedTables: [
          ...new Set(targetFields.map((field) => FIELD_CONFIGS[field].componentTable)),
          PARTNER_COMPONENTS_TABLE,
          NESTED_FIELD_CONFIGS.stores.componentTable,
        ],
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
