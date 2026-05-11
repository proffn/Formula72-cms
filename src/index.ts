import type { Core } from "@strapi/strapi";

const publicActions = [
  "api::site-header.site-header.find",
  "api::site-header.site-header.findOne",
  "api::home-page.home-page.find",
  "api::home-page.home-page.findOne",
  "api::formula72-scheme-section.formula72-scheme-section.find",
  "api::formula72-scheme-section.formula72-scheme-section.findOne",
  "api::work-stages-section.work-stages-section.find",
  "api::work-stages-section.work-stages-section.findOne",
  "api::who-suits-section.who-suits-section.find",
  "api::who-suits-section.who-suits-section.findOne",
  "api::why-trust-us-section.why-trust-us-section.find",
  "api::why-trust-us-section.why-trust-us-section.findOne",
  "api::coverage-map-section.coverage-map-section.find",
  "api::coverage-map-section.coverage-map-section.findOne",
  "api::faq-section.faq-section.find",
  "api::faq-section.faq-section.findOne",
  "api::lead-cta-section.lead-cta-section.find",
  "api::lead-cta-section.lead-cta-section.findOne",
  "api::final-brand-section.final-brand-section.find",
  "api::final-brand-section.final-brand-section.findOne",
  "api::footer-section.footer-section.find",
  "api::footer-section.footer-section.findOne",
  "api::floating-contact-section.floating-contact-section.find",
  "api::floating-contact-section.floating-contact-section.findOne",
  "api::production-video-page.production-video-page.find",
  "api::production-video-page.production-video-page.findOne",
  "api::what-we-can-make-section.what-we-can-make-section.find",
  "api::what-we-can-make-section.what-we-can-make-section.findOne",
  "api::pros-cons-section.pros-cons-section.find",
  "api::pros-cons-section.pros-cons-section.findOne",
  "api::banner.banner.find",
  "api::banner.banner.findOne",
  "api::wholesale-contract-section.wholesale-contract-section.find",
  "api::wholesale-contract-section.wholesale-contract-section.findOne",
];

const singleTypesToInitialize = [
  "api::site-header.site-header",
  "api::home-page.home-page",
  "api::formula72-scheme-section.formula72-scheme-section",
  "api::work-stages-section.work-stages-section",
  "api::who-suits-section.who-suits-section",
  "api::why-trust-us-section.why-trust-us-section",
  "api::coverage-map-section.coverage-map-section",
  "api::faq-section.faq-section",
  "api::lead-cta-section.lead-cta-section",
  "api::final-brand-section.final-brand-section",
  "api::footer-section.footer-section",
  "api::floating-contact-section.floating-contact-section",
  "api::production-video-page.production-video-page",
  "api::what-we-can-make-section.what-we-can-make-section",
  "api::pros-cons-section.pros-cons-section",
  "api::wholesale-contract-section.wholesale-contract-section",
] as const;

async function normalizeHomePageContentManagerLabels(strapi: Core.Strapi) {
  const key = "plugin_content_manager_configuration_content_types::api::home-page.home-page";
  const targetLabel = "Третья строчка";
  const rows = await (strapi.db.connection as any)("strapi_core_store_settings")
    .where({ key })
    .select("id", "value")
    .limit(1);
  const row = rows?.[0];

  if (!row?.value) {
    return;
  }

  const config = JSON.parse(row.value);
  const metadata = config?.metadatas?.heroTitleLine3;

  if (!metadata) {
    return;
  }

  const currentEditLabel = metadata.edit?.label;
  const currentListLabel = metadata.list?.label;

  if (currentEditLabel === targetLabel && currentListLabel === targetLabel) {
    return;
  }

  metadata.edit = {
    ...(metadata.edit ?? {}),
    label: targetLabel,
  };
  metadata.list = {
    ...(metadata.list ?? {}),
    label: targetLabel,
  };

  await (strapi.db.connection as any)("strapi_core_store_settings")
    .where({ id: row.id })
    .update({ value: JSON.stringify(config) });

  strapi.log.info("Updated Home Page content manager label for heroTitleLine3");
}

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const uploadConfig = strapi.config.get("plugin::upload");
    const activeUploadProvider =
      uploadConfig && typeof uploadConfig === "object" && "provider" in uploadConfig
        ? String(uploadConfig.provider)
        : "local";

    strapi.log.info(`[upload] Active provider: ${activeUploadProvider}`);
    await normalizeHomePageContentManagerLabels(strapi);

    for (const uid of singleTypesToInitialize) {
      const documents = strapi.documents(uid as any) as any;
      const existingDocument = await documents.findFirst({
        status: "draft",
      });

      if (!existingDocument) {
        const createdDocument = await documents.create({
          data: {},
          status: "published",
        });

        strapi.log.info(`Created missing single type document for ${uid}`);

        if (!createdDocument?.publishedAt && createdDocument?.documentId) {
          await documents.publish({
            documentId: createdDocument.documentId,
          });

          strapi.log.info(`Published single type document for ${uid}`);
        }
      }
    }

    const publicRole = await strapi.db.query("plugin::users-permissions.role").findOne({
      where: { type: "public" },
    });

    if (!publicRole) {
      return;
    }

    for (const action of publicActions) {
      const existingPermission = await strapi.db.query("plugin::users-permissions.permission").findOne({
        where: {
          action,
          role: publicRole.id,
        },
      });

      if (existingPermission) {
        if (!existingPermission.enabled) {
          await strapi.db.query("plugin::users-permissions.permission").update({
            where: { id: existingPermission.id },
            data: { enabled: true },
          });
        }

        continue;
      }

      await strapi.db.query("plugin::users-permissions.permission").create({
        data: {
          action,
          role: publicRole.id,
          enabled: true,
        },
      });
    }
  },
};




