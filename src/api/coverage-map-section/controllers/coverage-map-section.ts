import { factories } from "@strapi/strapi";
import type { Core } from "@strapi/strapi";

type FileRow = {
  id: number;
  document_id: string | null;
  name: string | null;
  alternative_text: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  formats: string | null;
  hash: string | null;
  ext: string | null;
  mime: string | null;
  size: number | null;
  url: string | null;
  preview_url: string | null;
  provider: string | null;
  provider_metadata: string | null;
  created_at: number | null;
  updated_at: number | null;
  published_at: number | null;
};

type RelationRow = {
  related_id: number;
  field: "avatar" | "brandImage";
  file_id: number;
};

type SectionRow = {
  id: number;
  document_id: string;
  published_at: number | null;
};

type SectionComponentRow = {
  cmp_id: number;
  order: number;
};

function parseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function toMedia(file: FileRow | undefined) {
  if (!file) {
    return null;
  }

  return {
    id: file.id,
    documentId: file.document_id ?? undefined,
    name: file.name ?? undefined,
    alternativeText: file.alternative_text,
    caption: file.caption,
    width: file.width ?? undefined,
    height: file.height ?? undefined,
    formats: parseJson<Record<string, unknown>>(file.formats) ?? undefined,
    hash: file.hash ?? undefined,
    ext: file.ext ?? undefined,
    mime: file.mime ?? undefined,
    size: file.size ?? undefined,
    url: file.url ?? undefined,
    previewUrl: file.preview_url,
    provider: file.provider ?? undefined,
    provider_metadata: parseJson<Record<string, unknown>>(file.provider_metadata) ?? undefined,
  };
}

export default factories.createCoreController("api::coverage-map-section.coverage-map-section", ({ strapi }) => ({
  async find(ctx) {
    const response = await super.find(ctx);
    await attachCoverageReviewMedia(response, ctx, strapi);
    return response;
  },

  async findOne(ctx) {
    const response = await super.findOne(ctx);
    await attachCoverageReviewMedia(response, ctx, strapi);
    return response;
  },
}));

async function attachCoverageReviewMedia(
  response: { data?: { documentId?: string; publishedAt?: string | null; reviews?: Array<Record<string, unknown>> } | null },
  ctx: { query?: { status?: string } },
  strapi: Core.Strapi,
) {
  const data = response?.data;

  if (!data?.documentId || !Array.isArray(data.reviews) || data.reviews.length === 0) {
    return;
  }

  const status = ctx.query?.status === "draft" ? "draft" : "published";
  const sectionRows = (await strapi.db.connection<SectionRow>("coverage_map_sections")
    .select("id", "document_id", "published_at")
    .where({ document_id: data.documentId })) as SectionRow[];

  const matchingSection = sectionRows.find((row) =>
    status === "draft" ? row.published_at === null : row.published_at !== null,
  );

  if (!matchingSection) {
    return;
  }

  const componentRows = (await strapi.db.connection<SectionComponentRow>("coverage_map_sections_cmps")
    .select("cmp_id", "order")
    .where("entity_id", matchingSection.id)
    .andWhere("component_type", "shared.coverage-map-review")
    .andWhere("field", "reviews")
    .orderBy("order")) as SectionComponentRow[];

  if (componentRows.length === 0) {
    return;
  }

  const componentIds = componentRows.map((row) => row.cmp_id);
  const relationRows = (await strapi.db.connection<RelationRow>("files_related_mph")
    .select("related_id", "field", "file_id")
    .whereIn("related_id", componentIds)
    .andWhere("related_type", "shared.coverage-map-review")
    .whereIn("field", ["avatar", "brandImage"])) as RelationRow[];

  if (relationRows.length === 0) {
    return;
  }

  const fileIds = [...new Set(relationRows.map((row) => row.file_id))];
  const fileRows = (await strapi.db.connection<FileRow>("files")
    .select(
      "id",
      "document_id",
      "name",
      "alternative_text",
      "caption",
      "width",
      "height",
      "formats",
      "hash",
      "ext",
      "mime",
      "size",
      "url",
      "preview_url",
      "provider",
      "provider_metadata",
      "created_at",
      "updated_at",
      "published_at",
    )
    .whereIn("id", fileIds)) as FileRow[];

  const filesById = new Map(fileRows.map((file) => [file.id, file]));
  const relationsByComponentId = new Map<number, Partial<Record<"avatar" | "brandImage", FileRow>>>();

  for (const relation of relationRows) {
    const existing = relationsByComponentId.get(relation.related_id) ?? {};
    const file = filesById.get(relation.file_id);

    if (file) {
      existing[relation.field] = file;
      relationsByComponentId.set(relation.related_id, existing);
    }
  }

  data.reviews = data.reviews.map((review, index) => {
    const componentRow = componentRows[index];

    if (!componentRow) {
      return review;
    }

    const relation = relationsByComponentId.get(componentRow.cmp_id);

    return {
      ...review,
      avatar: toMedia(relation?.avatar),
      brandImage: toMedia(relation?.brandImage),
    };
  });
}
