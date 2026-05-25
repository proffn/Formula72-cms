#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

const ABOUT_PAGE_UID = "api::about-page.about-page";
const ABOUT_PAGE_TABLE = "about_pages";
const ABOUT_PAGE_COMPONENTS_TABLE = "about_pages_cmps";
const VALUE_CARD_COMPONENT_UID = "about.value-card";
const VALUE_CARD_TABLE = "components_about_value_cards";
const VALUES_FIELD = "values";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const deleteOrphanComponents = args.has("--delete-orphan-components");
const schemaName = process.env.DATABASE_SCHEMA || "public";

if (args.has("--help") || args.has("-h")) {
  console.log(`
Usage:
  node scripts/cleanup-about-values-relations.js --dry-run
  node scripts/cleanup-about-values-relations.js
  node scripts/cleanup-about-values-relations.js --delete-orphan-components

Required env:
  DATABASE_URL=postgres://...

Optional env:
  DATABASE_SSL=true
  DATABASE_SSL_REJECT_UNAUTHORIZED=false
  DATABASE_SCHEMA=public
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
  requireTable(tables, VALUE_CARD_TABLE);

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
  const valueCardColumns = await requireColumns(client, VALUE_CARD_TABLE, ["id"]);

  return {
    tables,
    interestingTables,
    interestingTableColumns,
    aboutPageColumns,
    componentLinkColumns,
    valueCardColumns,
  };
}

async function getAboutPages(client) {
  const result = await client.query(`
    select id, document_id, title, locale, published_at, updated_at
    from ${qualified(ABOUT_PAGE_TABLE)}
    order by id
  `);

  return result.rows;
}

async function getValueRelations(client) {
  const result = await client.query(
    `
      select
        cmps.*,
        about_pages.document_id as about_document_id,
        about_pages.title as about_title,
        about_pages.locale as about_locale,
        about_pages.published_at as about_published_at,
        value_cards.id as value_card_exists
      from ${qualified(ABOUT_PAGE_COMPONENTS_TABLE)} cmps
      join ${qualified(ABOUT_PAGE_TABLE)} about_pages
        on about_pages.id = cmps.entity_id
      left join ${qualified(VALUE_CARD_TABLE)} value_cards
        on value_cards.id = cmps.cmp_id
      where cmps.field = $1
      order by cmps.entity_id, cmps."order", cmps.id
    `,
    [VALUES_FIELD],
  );

  return result.rows;
}

async function getOrphanCandidates(client, relationRows) {
  const componentIds = [...new Set(relationRows.map((row) => row.cmp_id).filter(Boolean))];
  const relationIds = relationRows.map((row) => row.id);

  if (componentIds.length === 0) {
    return [];
  }

  const result = await client.query(
    `
      select value_cards.*
      from ${qualified(VALUE_CARD_TABLE)} value_cards
      where value_cards.id = any($1::int[])
        and not exists (
          select 1
          from ${qualified(ABOUT_PAGE_COMPONENTS_TABLE)} cmps
          where cmps.cmp_id = value_cards.id
            and cmps.field = $2
            and cmps.component_type = $3
            and not (cmps.id = any($4::int[]))
        )
      order by value_cards.id
    `,
    [componentIds, VALUES_FIELD, VALUE_CARD_COMPONENT_UID, relationIds],
  );

  return result.rows;
}

function summarizeRows(rows, maxRows = 20) {
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
  const backupPath = path.join(backupDir, `about-values-relations-${stamp}.json`);

  fs.writeFileSync(backupPath, JSON.stringify(payload, null, 2));
  return backupPath;
}

async function deleteRelations(client, relationRows) {
  const relationIds = relationRows.map((row) => row.id);

  if (relationIds.length === 0) {
    return [];
  }

  const result = await client.query(
    `
      delete from ${qualified(ABOUT_PAGE_COMPONENTS_TABLE)}
      where id = any($1::int[])
      returning *
    `,
    [relationIds],
  );

  return result.rows;
}

async function deleteOrphans(client, relationRows) {
  const componentIds = [...new Set(relationRows.map((row) => row.cmp_id).filter(Boolean))];

  if (componentIds.length === 0) {
    return [];
  }

  const result = await client.query(
    `
      delete from ${qualified(VALUE_CARD_TABLE)} value_cards
      where value_cards.id = any($1::int[])
        and not exists (
          select 1
          from ${qualified(ABOUT_PAGE_COMPONENTS_TABLE)} cmps
          where cmps.cmp_id = value_cards.id
            and cmps.field = $2
            and cmps.component_type = $3
        )
      returning *
    `,
    [componentIds, VALUES_FIELD, VALUE_CARD_COMPONENT_UID],
  );

  return result.rows;
}

async function main() {
  assertDatabaseUrl();

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: getSslConfig(),
  });

  await client.connect();

  try {
    console.log("Formula72 about-page values cleanup");
    console.log({
      mode: dryRun ? "dry-run" : "write",
      schema: schemaName,
      aboutPageUid: ABOUT_PAGE_UID,
      valuesComponentUid: VALUE_CARD_COMPONENT_UID,
      deleteOrphanComponents,
    });

    const metadata = await introspect(client);
    const aboutPages = await getAboutPages(client);
    const relationRows = await getValueRelations(client);
    const invalidRows = relationRows.filter(
      (row) => row.component_type !== VALUE_CARD_COMPONENT_UID || row.value_card_exists === null,
    );

    console.log("Discovered relevant tables:");
    console.log(metadata.interestingTables);
    console.log("Required table columns:");
    console.log({
      [ABOUT_PAGE_TABLE]: metadata.aboutPageColumns,
      [ABOUT_PAGE_COMPONENTS_TABLE]: metadata.componentLinkColumns,
      [VALUE_CARD_TABLE]: metadata.valueCardColumns,
    });
    console.log("About-page rows:");
    console.log(summarizeRows(aboutPages));
    console.log("Current about-page values relation rows:");
    console.log(summarizeRows(relationRows));
    console.log("Strictly invalid values relation rows:");
    console.log(summarizeRows(invalidRows));

    if (relationRows.length === 0) {
      console.log("No about-page values relations found. Nothing to delete.");
      return;
    }

    console.log(
      `Planned action: delete ${relationRows.length} row(s) from ${schemaName}.${ABOUT_PAGE_COMPONENTS_TABLE} where field='${VALUES_FIELD}'.`,
    );

    if (dryRun) {
      console.log("Dry-run only. No database changes were made.");
      console.log("Run without --dry-run to delete these values relation rows.");
      return;
    }

    const backupPayload = {
      createdAt: new Date().toISOString(),
      schema: schemaName,
      aboutPageUid: ABOUT_PAGE_UID,
      valuesComponentUid: VALUE_CARD_COMPONENT_UID,
      aboutPages,
      relationRows,
      invalidRows,
    };
    const backupPath = writeBackup(backupPayload);
    console.log(`Backup written before deletion: ${backupPath}`);

    await client.query("begin");

    try {
      const deletedRelations = await deleteRelations(client, relationRows);
      let deletedOrphans = [];

      if (deleteOrphanComponents) {
        deletedOrphans = await deleteOrphans(client, relationRows);
      } else {
        const orphanCandidates = await getOrphanCandidates(client, relationRows);

        console.log("Orphan value-card component candidates after relation cleanup:");
        console.log(summarizeRows(orphanCandidates));
        console.log("They were not deleted. Add --delete-orphan-components if you need to remove them.");
      }

      await client.query("commit");

      console.log("Cleanup committed.");
      console.log({
        deletedRelationRows: deletedRelations.length,
        deletedOrphanComponentRows: deletedOrphans.length,
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
