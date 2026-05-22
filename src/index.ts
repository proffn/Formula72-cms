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

type ContentManagerFieldLabels = Record<
  string,
  {
    label: string;
    description?: string;
  }
>;

const contentManagerLabelConfigs: Array<{
  key: string;
  labels: ContentManagerFieldLabels;
}> = [
  {
    key: "plugin_content_manager_configuration_content_types::api::home-page.home-page",
    labels: {
      heroTitleLine3: { label: "Третья строчка" },
    },
  },
  {
    key: "plugin_content_manager_configuration_content_types::api::about-page.about-page",
    labels: {
      enabled: {
        label: "Включено",
        description: "Включает или скрывает страницу на сайте.",
      },
      title: { label: "Заголовок" },
      subtitle: { label: "Подзаголовок" },
      logo: { label: "Логотип" },
      backButtonLabel: { label: "Текст кнопки назад" },
      backButtonHref: {
        label: "Ссылка кнопки назад",
        description: "URL или якорь для перехода по кнопке.",
      },
      valuesTitle: { label: "Заголовок блока ценностей" },
      values: { label: "Ценности" },
      missionTitle: { label: "Заголовок миссии" },
      missionText: { label: "Текст миссии" },
      missionImage: { label: "Изображение миссии" },
      whyTitle: { label: "Заголовок блока выбора" },
      whyItems: { label: "Причины выбрать нас" },
      partners: { label: "Партнеры" },
    },
  },
  {
    key: "plugin_content_manager_configuration_components::about.value-card",
    labels: {
      title: { label: "Заголовок" },
      description: { label: "Описание" },
      highlightText: { label: "Выделенный текст" },
      icon: { label: "Иконка" },
      order: {
        label: "Порядок",
        description: "Чем меньше число, тем выше элемент в списке.",
      },
      enabled: {
        label: "Включено",
        description: "Включает или скрывает элемент на сайте.",
      },
    },
  },
  {
    key: "plugin_content_manager_configuration_components::about.why-item",
    labels: {
      title: { label: "Заголовок" },
      label: { label: "Подпись" },
      value: { label: "Значение" },
      description: { label: "Описание" },
      linkLabel: { label: "Текст ссылки" },
      linkHref: {
        label: "Ссылка",
        description: "URL или якорь для перехода.",
      },
      order: {
        label: "Порядок",
        description: "Чем меньше число, тем выше элемент в списке.",
      },
      enabled: {
        label: "Включено",
        description: "Включает или скрывает элемент на сайте.",
      },
    },
  },
  {
    key: "plugin_content_manager_configuration_components::about.partner-card",
    labels: {
      title: { label: "Название" },
      logo: { label: "Логотип" },
      stores: { label: "Магазины" },
      order: {
        label: "Порядок",
        description: "Чем меньше число, тем выше элемент в списке.",
      },
      enabled: {
        label: "Включено",
        description: "Включает или скрывает элемент на сайте.",
      },
    },
  },
  {
    key: "plugin_content_manager_configuration_components::about.store-link",
    labels: {
      title: { label: "Название" },
      logo: { label: "Логотип" },
      href: {
        label: "Ссылка",
        description: "URL магазина или маркетплейса.",
      },
      order: {
        label: "Порядок",
        description: "Чем меньше число, тем выше элемент в списке.",
      },
      enabled: {
        label: "Включено",
        description: "Включает или скрывает элемент на сайте.",
      },
    },
  },
];

async function normalizeContentManagerLabels(strapi: Core.Strapi) {
  for (const labelConfig of contentManagerLabelConfigs) {
    const rows = await (strapi.db.connection as any)("strapi_core_store_settings")
      .where({ key: labelConfig.key })
      .select("id", "value")
      .limit(1);
    const row = rows?.[0];

    if (!row?.value) {
      continue;
    }

    const config = JSON.parse(row.value);
    const metadatas = config?.metadatas;

    if (!metadatas) {
      continue;
    }

    let changed = false;

    for (const [fieldName, target] of Object.entries(labelConfig.labels)) {
      const metadata = metadatas[fieldName];

      if (!metadata) {
        continue;
      }

      const nextEdit = {
        ...(metadata.edit ?? {}),
        label: target.label,
        ...(target.description ? { description: target.description } : {}),
      };
      const nextList = {
        ...(metadata.list ?? {}),
        label: target.label,
      };

      if (
        metadata.edit?.label !== nextEdit.label ||
        metadata.edit?.description !== nextEdit.description ||
        metadata.list?.label !== nextList.label
      ) {
        metadata.edit = nextEdit;
        metadata.list = nextList;
        changed = true;
      }
    }

    if (!changed) {
      continue;
    }

    await (strapi.db.connection as any)("strapi_core_store_settings")
      .where({ id: row.id })
      .update({ value: JSON.stringify(config) });

    strapi.log.info(`Updated content manager labels for ${labelConfig.key}`);
  }
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
    await normalizeContentManagerLabels(strapi);

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




