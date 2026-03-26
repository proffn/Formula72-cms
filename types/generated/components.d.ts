import type { Schema, Struct } from '@strapi/strapi';

export interface SharedTextItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_text_items';
  info: {
    displayName: 'Text Item';
  };
  attributes: {
    text: Schema.Attribute.Text;
  };
}

export interface SharedWorkStageItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_work_stage_items';
  info: {
    displayName: 'Work Stage Item';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
    text: Schema.Attribute.Text;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'shared.text-item': SharedTextItem;
      'shared.work-stage-item': SharedWorkStageItem;
    }
  }
}
