function normalizeMediaReference(media: any) {
  if (!media || typeof media !== "object") {
    return media;
  }

  if (typeof media.id === "number" || typeof media.id === "string") {
    return media.id;
  }

  if (typeof media.documentId === "string") {
    return media.documentId;
  }

  if (media.data) {
    return normalizeMediaReference(media.data);
  }

  return media;
}

function normalizeMediaField(data: Record<string, any>, fieldName: string) {
  if (!data || typeof data !== "object") {
    return;
  }

  if (!(fieldName in data)) {
    return;
  }

  data[fieldName] = normalizeMediaReference(data[fieldName]);
}

function normalizeAboutPageComponents(data: Record<string, any> | undefined) {
  if (!data) {
    return;
  }

  normalizeMediaField(data, "logo");
  normalizeMediaField(data, "missionImage");

  if (Array.isArray(data.values)) {
    data.values = data.values.map((value) => {
      const nextValue = { ...value };

      normalizeMediaField(nextValue, "icon");

      return nextValue;
    });
  }

  if (Array.isArray(data.whyItems)) {
    data.whyItems = data.whyItems.map((item) => ({ ...item }));
  }

  if (Array.isArray(data.partners)) {
    data.partners = data.partners.map((partner) => {
      const nextPartner = { ...partner };

      normalizeMediaField(nextPartner, "logo");

      if (Array.isArray(nextPartner.stores)) {
        nextPartner.stores = nextPartner.stores.map((store) => {
          const nextStore = { ...store };

          normalizeMediaField(nextStore, "logo");

          return nextStore;
        });
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
