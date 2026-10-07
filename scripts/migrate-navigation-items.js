/** Explicit, one-time migration through Strapi Document Service. Never runs on startup. */
const fs = require("node:fs");
const path = require("node:path");
const { compileStrapi, createStrapi } = require("@strapi/strapi");
const { createHash } = require("node:crypto");

const uid = "api::site-header.site-header";
const markerKey = "navigation-items-v1";
const wholesaleHref = "https://b24-k8i1gh.bitrix24site.ru/crm_form_cw6nx/?utm_source=website_contract72";

function menuFromLegacy(header) {
  const items = [
    { label: header.navAboutLabel, href: header.navAboutHref },
    { label: header.navProductionLabel, href: header.navProductionHref },
    { label: "Опт", href: wholesaleHref },
    { label: header.navReviewsLabel, href: header.navReviewsHref },
  ];
  // Preserve the existing mapper's /about behavior, not the legacy #hero value.
  if (["#hero", "/#hero"].includes(items[0].href)) items[0].href = "/about";
  for (const item of items) {
    if (typeof item.label !== "string" || typeof item.href !== "string" ||
        !item.label.replace(/[\s\p{Cf}\u2800]/gu, "") || !item.href.trim()) {
      throw new Error("Invalid legacy item: inspect its values before migration.");
    }
  }
  return items;
}

function validateApprovedMenu(value) {
  if (!Array.isArray(value)) throw new Error("Approved menu must be a JSON array.");
  const seen = new Set();
  return value.map((item) => {
    const label = item?.label;
    const href = item?.href;
    if (typeof label !== "string" || label !== label.trim() ||
        !label.replace(/[\p{White_Space}\p{Cf}\p{Cc}\p{M}\u115f\u1160\u2800\u3164\uffa0]/gu, "") ||
        /[\p{Cc}\u115f\u1160\u2800\u3164\uffa0]/u.test(label)) {
      throw new Error("Approved menu contains an invalid label.");
    }
    if (typeof href !== "string" || !href ||
        /[\p{White_Space}\p{Cf}\p{Cc}\u115f\u1160\u2800\u3164\uffa0\\]/u.test(href) ||
        !((href.startsWith("/") && !href.startsWith("//")) || (() => {
          try { const url = new URL(href); return /^(http:|https:)$/.test(url.protocol) && !url.username && !url.password; }
          catch { return false; }
        })())) {
      throw new Error("Approved menu contains an invalid href.");
    }
    const key = JSON.stringify([label, href]);
    if (seen.has(key)) throw new Error("Approved menu contains a duplicate item.");
    seen.add(key);
    return { label, href };
  });
}

function readOptions(args = process.argv.slice(2), env = process.env) {
  let menuFile = env.FORMULA72_NAVIGATION_MENU_FILE;
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") dryRun = true;
    else if (args[i] === "--menu-file" && args[i + 1]) menuFile = args[++i];
    else throw new Error(`Unknown or incomplete option: ${args[i]}`);
  }
  return {
    dryRun,
    approvedMenu: menuFile ? validateApprovedMenu(JSON.parse(fs.readFileSync(path.resolve(menuFile), "utf8").replace(/^\uFEFF/, ""))) : undefined,
  };
}

function listOnly(items) {
  return (items ?? []).map(({ label, href }) => ({ label, href }));
}

function editableData(header, strapi, navigationItems) {
  const data = {};
  for (const [name, attribute] of Object.entries(strapi.contentTypes[uid].attributes)) {
    if (name === "navigationItems" || attribute.type === "relation" || !(name in header)) continue;
    if (["id", "documentId", "createdAt", "updatedAt", "publishedAt"].includes(name)) continue;
    data[name] = attribute.type === "media" ? header[name]?.id ?? null : header[name];
  }
  return { ...data, navigationItems };
}

async function configureNavigationAdmin(strapi) {
  const contentTypes = strapi.plugin("content-manager").service("content-types");
  const model = contentTypes.findContentType(uid);
  const config = await contentTypes.findConfiguration(model);
  for (const name of Object.keys(config.metadatas)) {
    if (/^nav(About|Production|Wholesale|Reviews)(Label|Href)$/.test(name)) {
      config.metadatas[name].edit.visible = false;
    }
  }
  config.layouts.edit = [
    [{ name: "navigationItems", size: 12 }],
    [{ name: "logoImage", size: 6 }, { name: "burgerMenuLogo", size: 6 }],
    [{ name: "phone", size: 6 }, { name: "workSchedule", size: 6 }],
  ];
  await contentTypes.updateConfiguration(model, config);
  const components = strapi.plugin("content-manager").service("components");
  const component = components.findComponent("shared.navigation-item");
  const componentConfig = await components.findConfiguration(component);
  componentConfig.settings.mainField = "label";
  componentConfig.layouts.edit = [[{ name: "label", size: 6 }, { name: "href", size: 6 }]];
  await components.updateConfiguration(component, componentConfig);
}

async function main() {
  // An explicit reviewed list takes precedence over legacy values. Omitted input
  // preserves the original legacy migration behavior; it never guesses approval.
  const { approvedMenu, dryRun } = readOptions();
  const context = await compileStrapi();
  const strapi = createStrapi(context);
  await strapi.load();
  try {
    const store = strapi.store({ type: "core", name: "formula72-navigation" });
    const documents = strapi.documents(uid);
    const draft = await documents.findFirst({ status: "draft", populate: "*" });
    const published = await documents.findFirst({ status: "published", populate: "*" });
    if (!draft || !published || draft.documentId !== published.documentId) {
      throw new Error("Expected one existing draft/published Site Header; no content updated.");
    }
    if (await store.get({ key: markerKey })) {
      if (approvedMenu && JSON.stringify(listOnly(published.navigationItems)) !== JSON.stringify(approvedMenu)) {
        throw new Error("Migration marker exists but published menu differs from the approved list; refusing to overwrite editor changes.");
      }
      console.log("Navigation migration already completed; no changes.");
      return;
    }
    if (draft.navigationItems?.length || published.navigationItems?.length) {
      throw new Error("Navigation already contains data; refusing to replace it.");
    }
    const publishedMenu = approvedMenu ?? menuFromLegacy(published);
    const draftMenu = approvedMenu ?? menuFromLegacy(draft);
    const menuHash = createHash("sha256").update(JSON.stringify(publishedMenu)).digest("hex");
    console.log(JSON.stringify({ migration: markerKey, documentId: published.documentId, source: approvedMenu ? "explicit-approved-list" : "legacy", navigationItems: publishedMenu, menuHash, dryRun }));
    if (dryRun) return;
    fs.mkdirSync(path.resolve(".tmp"), { recursive: true });
    const backup = path.resolve(".tmp", `navigation-before-${Date.now()}.json`);
    fs.writeFileSync(backup, JSON.stringify({ draft, published }, null, 2), { flag: "wx", mode: 0o600 });
    // Publish the existing published version plus the new list; restore the original
    // draft separately so unrelated unpublished edits are never published or lost.
    await documents.update({ documentId: published.documentId, data: editableData(published, strapi, publishedMenu), status: "published" });
    await documents.update({ documentId: draft.documentId, data: editableData(draft, strapi, draftMenu) });
    const after = await documents.findFirst({ status: "published", populate: "*" });
    if (JSON.stringify(listOnly(after?.navigationItems)) !== JSON.stringify(publishedMenu)) {
      throw new Error("Post-migration published menu verification failed; original versions are backed up.");
    }
    await configureNavigationAdmin(strapi);
    await store.set({ key: markerKey, value: { documentId: draft.documentId, migratedAt: new Date().toISOString(), menuHash } });
    console.log(`Navigation migrated: ${draft.documentId}; original versions saved in ${backup}`);
  } finally {
    await strapi.destroy();
  }
}

module.exports = { configureNavigationAdmin, validateApprovedMenu, readOptions, listOnly, menuFromLegacy, editableData };
if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });
