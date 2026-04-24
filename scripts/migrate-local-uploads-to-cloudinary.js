const fs = require("fs");
const path = require("path");
const { v2: cloudinary } = require("cloudinary");
const Database = require("better-sqlite3");
const { Client: PgClient } = require("pg");

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function parseJson(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toDbJson(value) {
  return value ? JSON.stringify(value) : null;
}

function sanitizePublicIdPart(value, fallback) {
  const normalized = String(value || fallback)
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9/_-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function isRemoteUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function resolveLocalFile(baseDir, urlValue) {
  if (!urlValue || isRemoteUrl(urlValue)) {
    return null;
  }

  const relativePath = urlValue.replace(/^\/+/, "");
  const absolutePath = path.join(baseDir, relativePath);

  return fs.existsSync(absolutePath) ? absolutePath : null;
}

async function uploadToCloudinary(filePath, publicId, resourceType = "auto") {
  return cloudinary.uploader.upload(filePath, {
    public_id: publicId,
    overwrite: true,
    resource_type: resourceType,
    unique_filename: false,
    use_filename: false,
  });
}

function normalizeFormats(formats) {
  if (!formats || typeof formats !== "object" || Array.isArray(formats)) {
    return {};
  }

  return formats;
}

function createSqliteClient(filename) {
  const database = new Database(filename);

  return {
    async getFiles() {
      return database
        .prepare(
          [
            "SELECT id, name, hash, ext, mime, url, provider, provider_metadata, formats, preview_url",
            "FROM files",
            "ORDER BY id ASC",
          ].join(" "),
        )
        .all();
    },
    async updateFile(id, payload) {
      database
        .prepare(
          [
            "UPDATE files",
            "SET url = ?, provider = ?, provider_metadata = ?, formats = ?, preview_url = ?, updated_at = ?",
            "WHERE id = ?",
          ].join(" "),
        )
        .run(
          payload.url,
          payload.provider,
          toDbJson(payload.provider_metadata),
          toDbJson(payload.formats),
          payload.preview_url,
          Date.now(),
          id,
        );
    },
    async close() {
      database.close();
    },
  };
}

function createPostgresClient(connectionString, sslEnabled) {
  const client = new PgClient({
    connectionString,
    ssl: sslEnabled
      ? {
          rejectUnauthorized: parseBoolean(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED, true),
        }
      : false,
  });

  return {
    async connect() {
      await client.connect();
    },
    async getFiles() {
      const result = await client.query(
        [
          "SELECT id, name, hash, ext, mime, url, provider, provider_metadata, formats, preview_url",
          "FROM files",
          "ORDER BY id ASC",
        ].join(" "),
      );

      return result.rows;
    },
    async updateFile(id, payload) {
      await client.query(
        [
          "UPDATE files",
          "SET url = $1, provider = $2, provider_metadata = $3::jsonb, formats = $4::jsonb, preview_url = $5, updated_at = NOW()",
          "WHERE id = $6",
        ].join(" "),
        [
          payload.url,
          payload.provider,
          toDbJson(payload.provider_metadata),
          toDbJson(payload.formats),
          payload.preview_url,
          id,
        ],
      );
    },
    async close() {
      await client.end();
    },
  };
}

async function createDatabaseClient() {
  const client = process.env.DATABASE_CLIENT || "sqlite";

  if (client === "postgres") {
    const db = createPostgresClient(requireEnv("DATABASE_URL"), parseBoolean(process.env.DATABASE_SSL, false));
    await db.connect();
    return db;
  }

  if (client === "sqlite") {
    const filename = path.resolve(process.cwd(), process.env.DATABASE_FILENAME || ".tmp/data.db");
    return createSqliteClient(filename);
  }

  throw new Error(`Unsupported DATABASE_CLIENT "${client}". Use sqlite or postgres.`);
}

async function main() {
  requireEnv("CLOUDINARY_NAME");
  requireEnv("CLOUDINARY_KEY");
  requireEnv("CLOUDINARY_SECRET");

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
    secure: true,
  });

  const uploadsDir = path.resolve(process.cwd(), process.env.LOCAL_UPLOADS_DIR || "public/uploads");
  const folderPrefix = sanitizePublicIdPart(process.env.CLOUDINARY_FOLDER || "formula72", "formula72");
  const dryRun = process.argv.includes("--dry-run");
  const database = await createDatabaseClient();

  let updatedCount = 0;
  let skippedCount = 0;
  let missingCount = 0;

  try {
    const fileRows = await database.getFiles();

    for (const file of fileRows) {
      const originalUrl = file.url || null;
      const originalPath = resolveLocalFile(path.dirname(uploadsDir), originalUrl);
      const formats = normalizeFormats(parseJson(file.formats));
      const formatEntries = Object.entries(formats);
      const needsOriginalMigration = Boolean(originalPath);
      const needsFormatMigration = formatEntries.some(([, formatValue]) =>
        Boolean(resolveLocalFile(path.dirname(uploadsDir), formatValue && formatValue.url)),
      );

      if (!needsOriginalMigration && !needsFormatMigration) {
        skippedCount += 1;
        continue;
      }

      if (needsOriginalMigration === false && originalUrl && !isRemoteUrl(originalUrl)) {
        missingCount += 1;
        console.warn(`Skipping file ${file.id}: local source not found for ${originalUrl}`);
        continue;
      }

      const publicIdBase = sanitizePublicIdPart(file.hash || file.name || `file-${file.id}`, `file-${file.id}`);
      let nextUrl = originalUrl;
      let nextProviderMetadata = parseJson(file.provider_metadata);

      if (needsOriginalMigration && originalPath) {
        const originalUpload = dryRun
          ? { secure_url: `[dry-run] ${originalPath}`, public_id: `${folderPrefix}/${publicIdBase}`, resource_type: "auto" }
          : await uploadToCloudinary(originalPath, `${folderPrefix}/${publicIdBase}`);

        nextUrl = originalUpload.secure_url;
        nextProviderMetadata = {
          public_id: originalUpload.public_id,
          resource_type: originalUpload.resource_type,
        };
      }

      const nextFormats = { ...formats };

      for (const [formatName, rawFormatValue] of formatEntries) {
        if (!rawFormatValue || typeof rawFormatValue !== "object") {
          continue;
        }

        const formatPath = resolveLocalFile(path.dirname(uploadsDir), rawFormatValue.url);

        if (!formatPath) {
          continue;
        }

        const uploadedFormat = dryRun
          ? {
              secure_url: `[dry-run] ${formatPath}`,
              public_id: `${folderPrefix}/${publicIdBase}_${sanitizePublicIdPart(formatName, formatName)}`,
              resource_type: "image",
            }
          : await uploadToCloudinary(
              formatPath,
              `${folderPrefix}/${publicIdBase}_${sanitizePublicIdPart(formatName, formatName)}`,
              "image",
            );

        nextFormats[formatName] = {
          ...rawFormatValue,
          url: uploadedFormat.secure_url,
          provider: "cloudinary",
          provider_metadata: {
            public_id: uploadedFormat.public_id,
            resource_type: uploadedFormat.resource_type,
          },
        };
      }

      if (!dryRun) {
        await database.updateFile(file.id, {
          url: nextUrl,
          provider: "cloudinary",
          provider_metadata: nextProviderMetadata,
          formats: nextFormats,
          preview_url: file.preview_url,
        });
      }

      updatedCount += 1;
      console.info(`${dryRun ? "[dry-run] " : ""}migrated file ${file.id}: ${originalUrl ?? "<no-url>"}`);
    }
  } finally {
    await database.close();
  }

  console.info(
    [
      "Cloudinary migration finished.",
      `Updated: ${updatedCount}`,
      `Skipped: ${skippedCount}`,
      `Missing local files: ${missingCount}`,
      dryRun ? "Mode: dry-run" : "Mode: write",
    ].join(" "),
  );
}

main().catch((error) => {
  console.error("Cloudinary migration failed.");
  console.error(error);
  process.exit(1);
});
