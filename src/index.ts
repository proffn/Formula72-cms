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
  "api::pros-cons-section.pros-cons-section",
  "api::wholesale-contract-section.wholesale-contract-section",
] as const;

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    for (const uid of singleTypesToInitialize) {
      const existingDocument = await strapi.documents(uid).findFirst({
        status: "draft",
      });

      if (!existingDocument) {
        const createdDocument = await strapi.documents(uid).create({
          data: {},
          status: "published",
        });

        strapi.log.info(`Created missing single type document for ${uid}`);

        if (!createdDocument?.publishedAt && createdDocument?.documentId) {
          await strapi.documents(uid).publish({
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
