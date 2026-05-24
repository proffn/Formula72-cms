function stripComponentId<T extends Record<string, any>>(component: T) {
  if (!component || typeof component !== "object") {
    return component;
  }

  const { id: _id, ...rest } = component;

  return rest;
}

function normalizeAboutPageComponents(data: Record<string, any> | undefined) {
  if (!data) {
    return;
  }

  if (Array.isArray(data.values)) {
    data.values = data.values.map(stripComponentId);
  }

  if (Array.isArray(data.whyItems)) {
    data.whyItems = data.whyItems.map(stripComponentId);
  }

  if (Array.isArray(data.partners)) {
    data.partners = data.partners.map((partner) => {
      const nextPartner = stripComponentId(partner);

      if (Array.isArray(nextPartner.stores)) {
        nextPartner.stores = nextPartner.stores.map(stripComponentId);
      }

      return nextPartner;
    });
  }
}

export default {
  beforeCreate(event: any) {
    normalizeAboutPageComponents(event.params?.data);
  },

  beforeUpdate(event: any) {
    normalizeAboutPageComponents(event.params?.data);
  },
};
