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

function getFileNameFromUrl(urlValue) {
  if (!urlValue || isRemoteUrl(urlValue)) {
    return null;
  }

  const cleanUrl = urlValue.split("?")[0];
  return path.basename(cleanUrl);
}

function stripDerivativePrefix(fileName) {
  return fileName.replace(/^(thumbnail|small|medium|large)_/, "");
}

function stripHashSuffix(fileNameWithoutExt) {
  return fileNameWithoutExt.replace(/_[a-f0-9]{8,}$/i, "");
}

function getSemanticKey(fileName) {
  const ext = path.extname(fileName);
  const nameWithoutExt = ext ? fileName.slice(0, -ext.length) : fileName;
  const withoutDerivative = stripDerivativePrefix(nameWithoutExt);
  return stripHashSuffix(withoutDerivative);
}

function getDerivativePrefix(fileName) {
  const match = fileName.match(/^(thumbnail|small|medium|large)_/);
  return match ? match[1] : "original";
}

function createUploadsIndex(uploadsDir) {
  const files = fs
    .readdirSync(uploadsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  const byExactName = new Map();
  const bySemanticKey = new Map();

  for (const fileName of files) {
    const absolutePath = path.join(uploadsDir, fileName);
    byExactName.set(fileName, absolutePath);

    const semanticKey = getSemanticKey(fileName);
    const derivativePrefix = getDerivativePrefix(fileName);
    const ext = path.extname(fileName).toLowerCase();
    const existing = bySemanticKey.get(semanticKey) ?? [];
    existing.push({
      fileName,
      absolutePath,
      derivativePrefix,
      ext,
    });
    bySemanticKey.set(semanticKey, existing);
  }

  return { byExactName, bySemanticKey };
}

function pickSemanticCandidate(candidates, requestedFileName) {
  const requestedExt = path.extname(requestedFileName).toLowerCase();
  const requestedDerivative = getDerivativePrefix(requestedFileName);

  const exactDerivativeAndExt = candidates.filter(
    (candidate) =>
      candidate.derivativePrefix === requestedDerivative &&
      candidate.ext === requestedExt,
  );

  if (exactDerivativeAndExt.length === 1) {
    return exactDerivativeAndExt[0];
  }

  const derivativeOnly = candidates.filter(
    (candidate) => candidate.derivativePrefix === requestedDerivative,
  );

  if (derivativeOnly.length === 1) {
    return derivativeOnly[0];
  }

  const extOnly = candidates.filter((candidate) => candidate.ext === requestedExt);

  if (extOnly.length === 1) {
    return extOnly[0];
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  return null;
}

function resolveLocalFile(uploadsIndex, uploadsDir, urlValue) {
  const requestedFileName = getFileNameFromUrl(urlValue);

  if (!requestedFileName) {
    return {
      matchType: "unavailable",
      requestedFileName: null,
      absolutePath: null,
      candidateNames: [],
    };
  }

  const exactPath = uploadsIndex.byExactName.get(requestedFileName);

  if (exactPath) {
    return {
      matchType: "exact",
      requestedFileName,
      absolutePath: exactPath,
      candidateNames: [requestedFileName],
    };
  }

  const semanticKey = getSemanticKey(requestedFileName);
  const candidates = uploadsIndex.bySemanticKey.get(semanticKey) ?? [];
  const pickedCandidate = pickSemanticCandidate(candidates, requestedFileName);

  if (pickedCandidate) {
    return {
      matchType: "semantic",
      requestedFileName,
      absolutePath: pickedCandidate.absolutePath,
      candidateNames: candidates.map((candidate) => candidate.fileName),
    };
  }

  const fallbackAbsolutePath = path.join(uploadsDir, requestedFileName);

  return {
    matchType: fs.existsSync(fallbackAbsolutePath) ? "exact" : "missing",
    requestedFileName,
    absolutePath: fs.existsSync(fallbackAbsolutePath) ? fallbackAbsolutePath : null,
    candidateNames: candidates.map((candidate) => candidate.fileName),
  };
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

function parseTargetIds() {
  const rawValue = process.env.TARGET_FILE_IDS;

  if (!rawValue) {
    return null;
  }

  const ids = rawValue
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isFinite(value));

  return ids.length > 0 ? new Set(ids) : null;
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

function logSkipped(file, reason, details = {}) {
  const extra = Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join("|") : value}`)
    .join(" ");

  console.warn(`Skipping file ${file.id}: ${reason}${extra ? ` ${extra}` : ""}`);
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
  const uploadsIndex = createUploadsIndex(uploadsDir);
  const folderPrefix = sanitizePublicIdPart(process.env.CLOUDINARY_FOLDER || "formula72", "formula72");
  const dryRun = process.argv.includes("--dry-run");
  const targetIds = parseTargetIds();
  const database = await createDatabaseClient();

  let updatedCount = 0;
  let skippedCount = 0;
  let missingCount = 0;
  let semanticFallbackCount = 0;

  try {
    const fileRows = await database.getFiles();

    const filteredRows = targetIds
      ? fileRows.filter((file) => targetIds.has(Number(file.id)))
      : fileRows;

    console.info(
      [
        "Migration scope:",
        `rows=${filteredRows.length}`,
        `targeted=${targetIds ? Array.from(targetIds).join(",") : "all"}`,
        `dryRun=${dryRun}`,
      ].join(" "),
    );

    for (const file of filteredRows) {
      if (isRemoteUrl(file.url) && file.provider === "cloudinary") {
        skippedCount += 1;
        logSkipped(file, "already-cloudinary", { url: file.url });
        continue;
      }

      const originalMatch = resolveLocalFile(uploadsIndex, uploadsDir, file.url);
      const formats = normalizeFormats(parseJson(file.formats));
      const formatEntries = Object.entries(formats);
      const formatMatches = formatEntries.map(([formatName, formatValue]) => ({
        formatName,
        formatValue,
        match:
          formatValue && typeof formatValue === "object"
            ? resolveLocalFile(uploadsIndex, uploadsDir, formatValue.url)
            : { matchType: "unavailable", absolutePath: null, candidateNames: [] },
      }));

      if (originalMatch.matchType === "semantic") {
        semanticFallbackCount += 1;
      }

      for (const formatMatch of formatMatches) {
        if (formatMatch.match.matchType === "semantic") {
          semanticFallbackCount += 1;
        }
      }

      const needsOriginalMigration = Boolean(originalMatch.absolutePath);
      const needsFormatMigration = formatMatches.some((entry) => Boolean(entry.match.absolutePath));

      if (!needsOriginalMigration && !needsFormatMigration) {
        skippedCount += 1;

        if (file.url && !isRemoteUrl(file.url)) {
          missingCount += 1;
          logSkipped(file, "local-source-not-found", {
            url: file.url,
            requested: originalMatch.requestedFileName,
            candidates: originalMatch.candidateNames,
          });
        } else {
          logSkipped(file, "no-local-or-format-source", { url: file.url });
        }

        continue;
      }

      const publicIdBase = sanitizePublicIdPart(file.hash || file.name || `file-${file.id}`, `file-${file.id}`);
      let nextUrl = file.url || null;
      let nextProviderMetadata = parseJson(file.provider_metadata);

      if (needsOriginalMigration && originalMatch.absolutePath) {
        const originalUpload = dryRun
          ? {
              secure_url: `[dry-run] ${originalMatch.absolutePath}`,
              public_id: `${folderPrefix}/${publicIdBase}`,
              resource_type: "auto",
            }
          : await uploadToCloudinary(originalMatch.absolutePath, `${folderPrefix}/${publicIdBase}`);

        nextUrl = originalUpload.secure_url;
        nextProviderMetadata = {
          public_id: originalUpload.public_id,
          resource_type: originalUpload.resource_type,
        };
      }

      const nextFormats = { ...formats };

      for (const { formatName, formatValue, match } of formatMatches) {
        if (!formatValue || typeof formatValue !== "object" || !match.absolutePath) {
          continue;
        }

        const uploadedFormat = dryRun
          ? {
              secure_url: `[dry-run] ${match.absolutePath}`,
              public_id: `${folderPrefix}/${publicIdBase}_${sanitizePublicIdPart(formatName, formatName)}`,
              resource_type: "image",
            }
          : await uploadToCloudinary(
              match.absolutePath,
              `${folderPrefix}/${publicIdBase}_${sanitizePublicIdPart(formatName, formatName)}`,
              "image",
            );

        nextFormats[formatName] = {
          ...formatValue,
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
      console.info(
        [
          `${dryRun ? "[dry-run]" : "[write]"} migrated file ${file.id}`,
          `provider=${file.provider ?? "null"}`,
          `url=${file.url ?? "<no-url>"}`,
          `sourceMatch=${originalMatch.matchType}`,
        ].join(" "),
      );
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
      `Semantic fallback matches: ${semanticFallbackCount}`,
      dryRun ? "Mode: dry-run" : "Mode: write",
    ].join(" "),
  );
}

main().catch((error) => {
  console.error("Cloudinary migration failed.");
  console.error(error);
  process.exit(1);
});
