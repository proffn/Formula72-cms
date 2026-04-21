import { factories } from "@strapi/strapi";

export default factories.createCoreRouter("api::banner-section.banner-section" as any, {
  config: {
    find: {
      auth: false,
    },
  },
});
