const fs = require("node:fs");
const path = require("node:path");

const { compileStrapi, createStrapi } = require("@strapi/strapi");

const ABOUT_UID = "api::about-page.about-page";
const FRONTEND_ROOT = path.resolve(__dirname, "..", "..", "Formula72");
const ABOUT_ASSETS_ROOT = path.join(FRONTEND_ROOT, "public", "images", "home", "about");

const ASSET_FILES = {
  speedIcon: ["icons", "speed-icon"],
  accessibilityIcon: ["icons", "accessibility-icon"],
  professionalismIcon: ["icons", "professionalism-icon"],
  creamHeart: ["icons", "cream-heart"],
  evsiLogo: ["partners", "evsi-logo"],
  qtixLogo: ["partners", "qtix-logo"],
  drGroomerLogo: ["partners", "dr-groomer-logo"],
  goldenAppleLogo: ["stores", "golden-apple-logo"],
  detmirLogo: ["stores", "detmir-logo"],
  letualLogo: ["stores", "letual-logo"],
  zoozavrLogo: ["stores", "zoozavr-logo"],
};

const MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function findAsset([folder, basename]) {
  for (const extension of [".png", ".svg", ".webp", ".jpg", ".jpeg"]) {
    const filePath = path.join(ABOUT_ASSETS_ROOT, folder, `${basename}${extension}`);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
}

async function uploadAsset(strapi, key, descriptor) {
  const filePath = findAsset(descriptor);

  if (!filePath) {
    console.warn(`[about-page] Asset not found: ${key}`);
    return null;
  }

  const name = path.basename(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const mimetype = MIME_TYPES[extension] || "application/octet-stream";
  const existing = await strapi.db.query("plugin::upload.file").findOne({
    where: { name },
  });

  if (existing) {
    if (existing.ext === extension && existing.mime === mimetype) {
      return existing.id;
    }

    await strapi.plugin("upload").service("upload").remove(existing);
  }

  const stats = fs.statSync(filePath);
  const files = await strapi.plugin("upload").service("upload").upload({
    data: {
      fileInfo: {
        name,
        alternativeText: name.replace(extension, ""),
      },
    },
    files: {
      filepath: filePath,
      originalFilename: name,
      mimetype,
      size: stats.size,
    },
  });

  return files?.[0]?.id ?? null;
}

async function uploadAssets(strapi) {
  const assets = {};

  for (const [key, descriptor] of Object.entries(ASSET_FILES)) {
    assets[key] = await uploadAsset(strapi, key, descriptor);
  }

  return assets;
}

async function enablePublicFind(strapi) {
  const publicRole = await strapi.db.query("plugin::users-permissions.role").findOne({
    where: { type: "public" },
  });

  if (!publicRole) {
    console.warn("[about-page] Public role was not found");
    return;
  }

  const action = `${ABOUT_UID}.find`;
  const permissionQuery = strapi.db.query("plugin::users-permissions.permission");
  const existing = await permissionQuery.findOne({
    where: {
      action,
      role: publicRole.id,
    },
  });

  if (!existing) {
    await permissionQuery.create({
      data: {
        action,
        role: publicRole.id,
      },
    });
  }
}

function aboutPageData(assets) {
  return {
    enabled: true,
    title: "ФОРМУЛА [72]",
    subtitle: "ВАША ИДЕЯ - НАШЕ ВОПЛОЩЕНИЕ",
    backButtonLabel: "На главную",
    backButtonHref: "/",
    valuesTitle: "ЦЕННОСТИ ФОРМУЛА72",
    values: [
      {
        title: "Скорость",
        description: "Сейчас мир на расстоянии\nклика. Хочешь свой бренд\nкосметики?",
        highlightText: "Мы уложимся за 30\nрабочих дней.",
        icon: assets.speedIcon,
        order: 1,
        enabled: true,
      },
      {
        title: "Доступность",
        description: "Чтобы запустить свой бренд\nкосметики – больше не нужен\nзавод и огромные вложения:",
        highlightText:
          "Минимальная партия у нас\nдействительно минимальная,\nа не для “галочки”.\n\nК Вашим услугам экспертиза\nотдела маркетинга\n#ФОРМУЛА[72]: если Вы наш\nклиент - консультация, как\nвыйти в “Золотое Яблоко”\nили Летуаль - БЕСПЛАТНО.",
        icon: assets.accessibilityIcon,
        order: 2,
        enabled: true,
      },
      {
        title: "Профессионализм",
        description:
          "1000 проверенных составов,\nсовременное производство\nи целая команда маркетинга\nбудет работать над Вашим\nбрендом, начиная\nс минимальной партии.\n\nЗа Вашим брендом закрепляется\nпрофессиональный менеджер,\nкоторый заинтересован в том,\nчтобы Ваш продукт\nреально продавался.",
        highlightText: "",
        icon: assets.professionalismIcon,
        order: 3,
        enabled: true,
      },
    ],
    missionTitle: "МИССИЯ БРЕНДА",
    missionText:
      "Хочешь покорить мир через свой бренд косметики?\nМы поможем. Ваша идея - наше воплощение.",
    missionImage: assets.creamHeart,
    whyTitle: "ПОЧЕМУ СТОИТ ВЫБРАТЬ #ФОРМУЛА[72]",
    whyItems: [
      {
        title: "Скорость",
        label: "Формула",
        value: "14 / 30",
        description:
          "14 рабочих дней займёт\nразработка опытных\nобразцов.\n\n30 рабочих дней займёт\nразработка Вашего\nбренда под ключ.",
        order: 1,
        enabled: true,
      },
      {
        title: "Доступность",
        label: "Минимальная партия",
        value: "от 50 000₽",
        description:
          "Это самый низкий порог\nвхода для бизнеса в 2026*\n\n*Согласно данным\nЯНДЕКС БИЗНЕС открыть,\nнапример, ПВЗ от 250 000 ₽",
        linkLabel: "ЯНДЕКС БИЗНЕС",
        linkHref: "https://business.yandex/praktika/kakoj-biznes-otkryt-v-rossii/",
        order: 2,
        enabled: true,
      },
      {
        title: "Профессионализм",
        label: "Полная",
        value: "ПОДДЕРЖКА",
        description:
          "Полная поддержка на всех\nстадиях от производства\nдо маркетинга.\n\nМы точно знаем, как создать\nуспешный косметический\nбренд - потому что наши\nсобственные продукты\nпродаются:",
        order: 3,
        enabled: true,
      },
    ],
    partners: [
      {
        title: "ÉVSI",
        logo: assets.evsiLogo,
        order: 1,
        enabled: true,
        stores: [
          {
            title: "Золотое яблоко",
            logo: assets.goldenAppleLogo,
            href: "https://goldapple.ru/brands/evsi",
            order: 1,
            enabled: true,
          },
          {
            title: "Летуаль",
            logo: assets.letualLogo,
            href: "https://www.letu.ru/merchant/41500012",
            order: 2,
            enabled: true,
          },
          {
            title: "Детский мир",
            logo: assets.detmirLogo,
            href: "https://www.detmir.ru/catalog/index/name/skin_care_mom/brand/113897/",
            order: 3,
            enabled: true,
          },
        ],
      },
      {
        title: "QTIX",
        logo: assets.qtixLogo,
        order: 2,
        enabled: true,
        stores: [
          {
            title: "Летуаль",
            logo: assets.letualLogo,
            href: "https://www.letu.ru/merchant/215000004",
            order: 1,
            enabled: true,
          },
        ],
      },
      {
        title: "DR.GROOMER",
        logo: assets.drGroomerLogo,
        order: 3,
        enabled: true,
        stores: [
          {
            title: "Зоозавр",
            logo: assets.zoozavrLogo,
            href: "https://zoozavr.ru/catalog/index/name/uhod-i-kosmetika-dlya-sobak/brand/113898/",
            order: 1,
            enabled: true,
          },
        ],
      },
    ],
  };
}

async function seed(strapi) {
  const assets = await uploadAssets(strapi);
  const data = aboutPageData(assets);
  const existing = await strapi.documents(ABOUT_UID).findFirst();

  if (existing?.documentId) {
    await strapi.documents(ABOUT_UID).update({
      documentId: existing.documentId,
      data,
      status: "published",
    });
  } else {
    await strapi.documents(ABOUT_UID).create({
      data,
      status: "published",
    });
  }

  await enablePublicFind(strapi);
  console.log("[about-page] Seed completed");
}

async function main() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  try {
    await seed(app);
  } finally {
    await app.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
