import type { Core } from "@strapi/strapi";

const publicActions = [
  "api::site-header.site-header.find",
  "api::site-header.site-header.findOne",
  "api::home-page.home-page.find",
  "api::home-page.home-page.findOne",
  "api::terms-page.terms-page.find",
  "api::terms-page.terms-page.findOne",
  "api::certificates-page.certificates-page.find",
  "api::certificates-page.certificates-page.findOne",
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

const termsPageUid = "api::terms-page.terms-page" as const;
const termsButtonHref = "https://b24-2uwhq2.bitrix24site.ru/?utm_source=website_contract72";
const defaultTermsPageData = {
  enabled: true,
  title: "ОПЛАТА, ПАРТИЯ, СРОКИ.",
  sections: [
    {
      title: "МИНИМАЛЬНАЯ ПАРТИЯ И СРОКИ",
      content:
        "Минимальная партия: 50 000₽\n" +
        "• Каждого **SKU не менее 50 шт;\n" +
        "*SKU – это идентификатор товарной позиции (артикул)\n" +
        "**В рамках одной минимальной партии может быть несколько товарных позиций\n" +
        "• Срок изготовления партии: до 30 рабочих дней согласно производственной очереди;\n" +
        "ВАЖНО! Срок в 30 рабочих дней – это время на изготовление продукта.\n" +
        "+ 3 рабочих дня на упаковку и отправку.\n" +
        "+ 3 рабочих дня, если ваш заказ включает дополнительные услуги:\n" +
        "• Оклейка;\n" +
        "• Датировка;\n" +
        "• Термоусадка;",
      buttonLabel: "ПОДРОБНЕЕ",
      buttonHref: termsButtonHref,
      order: 1,
      enabled: true,
    },
    {
      title: "ЗАКАЗ ДЕМО-ОБРАЗЦОВ",
      content:
        "Минимальной суммы заказа нет.\n" +
        "• В одном заказе может быть до 11 образцов;\n" +
        "• Каждого продукта в заказе может быть не более 2 штук;\n" +
        "• Срок изготовления образцов: до 14 рабочих дней;\n" +
        "• Образцы полноразмерные по той же цене, что в прайсе;\n" +
        "• Образцы изготавливаются под заказ, мы их не храним;\n" +
        "• Вы получаете максимально свежий продукт;\n" +
        "• Подробный файл с заказанными позициями, составами и способами применения вам отправит менеджер.",
      buttonLabel: "СМОТРЕТЬ ОБРАЗЦЫ",
      buttonHref: termsButtonHref,
      order: 2,
      enabled: true,
    },
    {
      title: "ОПЛАТА И ДОСТАВКА",
      content:
        "Мы запускаем производство после 100% предоплаты.\n" +
        "Ваш персональный менеджер вышлет вам счёт на электронную почту или в WhatsApp для оплаты.\n" +
        "Оплатить заказ можно двумя способами:\n" +
        "• на расчётный счёт организации;\n" +
        "• на карту банка.\n\n" +
        "После поступления средств мы передаём ваш заказ в производство.\n\n" +
        "Доставка До терминалов CDEK, ПЭК, Кит, Энергия, Байкал, Мэйджиктранс, ЖелДорЭкспедиция и прочих — бесплатно.\n" +
        "Транспортные расходы до вашего города и услуги по дополнительной жёсткой упаковке оплачивает клиент.\n\n" +
        "Как только мы отправим заказ, менеджер пришлёт вам письмо с номером транспортной накладной.\n\n" +
        "С ним вы сможете отслеживать статус перемещения груза.",
      buttonLabel: "СВЯЗАТЬСЯ",
      buttonHref: termsButtonHref,
      order: 3,
      enabled: true,
    },
  ],
};

const certificatesPageUid = "api::certificates-page.certificates-page" as const;
const certificatesButtonHref = "https://b24-2uwhq2.bitrix24site.ru/?utm_source=website_contract72";
const defaultCertificatesPageData = {
  enabled: true,
  title: "СЕРТИФИКАТЫ",
  description:
    "Компания ФОРМУЛА72 имеет все необходимые сертификаты и разрешения.\n" +
    "С ними можно ознакомиться, пролистав изображения в карусели.\n" +
    "Остались вопросы?\n" +
    "Задайте их сотруднику компании ФОРМУЛА72.",
  buttonLabel: "КОНСУЛЬТАЦИЯ",
  buttonHref: certificatesButtonHref,
  certificates: Array.from({ length: 8 }, (_, index) => ({
    title: `Сертификат ${index + 1}`,
    alt: `Сертификат Formula72 ${index + 1}`,
    order: index + 1,
    enabled: true,
  })),
};

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
    key: "plugin_content_manager_configuration_content_types::api::banner.banner",
    labels: {
      title: { label: "Заголовок" },
      subtitle: { label: "Подзаголовок" },
      image: {
        label: "Изображение",
        description: "Основное изображение.",
      },
      mobileImage: {
        label: "Изображение для мобильной версии",
        description: "Отдельное изображение, которое будет показано на мобильных экранах.",
      },
      order: {
        label: "Порядок",
        description: "Чем меньше число, тем выше элемент в списке.",
      },
      isActive: { label: "Активно" },
      textPosition: { label: "Положение текста" },
    },
  },
  {
    key: "plugin_content_manager_configuration_content_types::api::terms-page.terms-page",
    labels: {
      enabled: {
        label: "Включено",
        description: "Включает или скрывает страницу на сайте.",
      },
      title: { label: "Заголовок страницы" },
      sections: { label: "Секции" },
    },
  },
  {
    key: "plugin_content_manager_configuration_components::terms.terms-section",
    labels: {
      title: { label: "Заголовок" },
      content: { label: "Текст" },
      image: {
        label: "Изображение",
        description: "Если поле пустое, сайт использует локальное fallback-изображение.",
      },
      buttonLabel: { label: "Текст кнопки" },
      buttonHref: {
        label: "Ссылка кнопки",
        description: "URL или якорь для перехода по кнопке.",
      },
      order: {
        label: "Порядок",
        description: "Чем меньше число, тем выше секция на странице.",
      },
      enabled: {
        label: "Включено",
        description: "Включает или скрывает секцию на сайте.",
      },
    },
  },
  {
    key: "plugin_content_manager_configuration_content_types::api::certificates-page.certificates-page",
    labels: {
      enabled: {
        label: "Включено",
        description: "Включает или скрывает страницу на сайте.",
      },
      title: { label: "Заголовок страницы" },
      description: { label: "Описание" },
      buttonLabel: { label: "Текст кнопки" },
      buttonHref: {
        label: "Ссылка кнопки",
        description: "URL или якорь для перехода по кнопке.",
      },
      certificates: { label: "Сертификаты" },
    },
  },
  {
    key: "plugin_content_manager_configuration_components::certificates.certificate-item",
    labels: {
      title: { label: "Название" },
      alt: { label: "Alt-текст" },
      image: {
        label: "Изображение",
        description: "Изображение сертификата. Если поле пустое, сайт использует локальный fallback.",
      },
      order: {
        label: "Порядок",
        description: "Чем меньше число, тем раньше сертификат в слайдере.",
      },
      enabled: {
        label: "Включено",
        description: "Включает или скрывает сертификат на сайте.",
      },
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

async function seedTermsPage(strapi: Core.Strapi) {
  const documents = strapi.documents(termsPageUid as any) as any;
  const existingDocument = await documents.findFirst({
    status: "draft",
    populate: {
      sections: true,
    },
  });

  const hasExistingContent =
    Boolean(existingDocument?.title?.trim()) ||
    (Array.isArray(existingDocument?.sections) && existingDocument.sections.length > 0);

  if (hasExistingContent) {
    return;
  }

  const documentId = existingDocument?.documentId;

  if (documentId) {
    await documents.update({
      documentId,
      data: defaultTermsPageData,
    });

    await documents.publish({ documentId });
    strapi.log.info("Filled empty terms page with default content");
    return;
  }

  const createdDocument = await documents.create({
    data: defaultTermsPageData,
    status: "published",
  });

  if (!createdDocument?.publishedAt && createdDocument?.documentId) {
    await documents.publish({
      documentId: createdDocument.documentId,
    });
  }

  strapi.log.info("Created terms page with default content");
}

async function seedCertificatesPage(strapi: Core.Strapi) {
  const documents = strapi.documents(certificatesPageUid as any) as any;
  const existingDocument = await documents.findFirst({
    status: "draft",
    populate: {
      certificates: true,
    },
  });

  const hasExistingContent =
    Boolean(existingDocument?.title?.trim()) ||
    (Array.isArray(existingDocument?.certificates) && existingDocument.certificates.length > 0);

  if (hasExistingContent) {
    return;
  }

  const documentId = existingDocument?.documentId;

  if (documentId) {
    await documents.update({
      documentId,
      data: defaultCertificatesPageData,
    });

    await documents.publish({ documentId });
    strapi.log.info("Filled empty certificates page with default content");
    return;
  }

  const createdDocument = await documents.create({
    data: defaultCertificatesPageData,
    status: "published",
  });

  if (!createdDocument?.publishedAt && createdDocument?.documentId) {
    await documents.publish({
      documentId: createdDocument.documentId,
    });
  }

  strapi.log.info("Created certificates page with default content");
}

async function normalizeFooterTermsLink(strapi: Core.Strapi) {
  const documents = strapi.documents("api::footer-section.footer-section" as any) as any;
  const targetWorkingHours = "график работы с пн –пт\nс 07:00 до 16:00 по мск.";
  const footerDocument = await documents.findFirst({
    status: "draft",
    populate: {
      companyLinks: true,
    },
  });

  if (!footerDocument?.documentId || !Array.isArray(footerDocument.companyLinks)) {
    return;
  }

  let changed = false;
  const currentWorkingHours = footerDocument.workingHours?.trim();

  if (!currentWorkingHours || currentWorkingHours === "график работы с 11:00 до 16:00 по Мск") {
    footerDocument.workingHours = targetWorkingHours;
    changed = true;
  }

  const companyLinks = footerDocument.companyLinks.map((link: any) => {
    const label = link?.label?.trim();
    const targetHref =
      label === "Условия" ? "/terms" : label === "Сертификаты" ? "/certificates" : null;

    if (!targetHref) {
      return link;
    }

    if (link.href === targetHref) {
      return link;
    }

    changed = true;
    return {
      ...link,
      href: targetHref,
    };
  });

  if (!changed) {
    return;
  }

  await documents.update({
    documentId: footerDocument.documentId,
    data: {
      workingHours: footerDocument.workingHours,
      companyLinks,
    },
  });

  await documents.publish({ documentId: footerDocument.documentId });
  strapi.log.info("Updated footer company links");
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
    await seedTermsPage(strapi);
    await seedCertificatesPage(strapi);
    await normalizeFooterTermsLink(strapi);

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




