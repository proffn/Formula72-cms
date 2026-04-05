import type { Schema, Struct } from '@strapi/strapi';

export interface SharedCoverageMapReview extends Struct.ComponentSchema {
  collectionName: 'components_shared_coverage_map_reviews';
  info: {
    displayName: 'Coverage Map Review';
  };
  attributes: {
    avatar: Schema.Attribute.Media<'images'>;
    brandImage: Schema.Attribute.Media<'images'>;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    name: Schema.Attribute.Text;
    rating: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      >;
    reviewText: Schema.Attribute.Text;
    xPosition: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      >;
    yPosition: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      >;
  };
}

export interface SharedFaqCategory extends Struct.ComponentSchema {
  collectionName: 'components_shared_faq_categories';
  info: {
    displayName: 'FAQ Category';
  };
  attributes: {
    items: Schema.Attribute.Component<'shared.faq-item', true>;
    title: Schema.Attribute.Text;
  };
}

export interface SharedFaqItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_faq_items';
  info: {
    displayName: 'FAQ Item';
  };
  attributes: {
    answer: Schema.Attribute.Text;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    number: Schema.Attribute.Text;
    question: Schema.Attribute.Text;
  };
}

export interface SharedMakeItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_make_items';
  info: {
    displayName: 'Make Item';
  };
  attributes: {
    hoverImage: Schema.Attribute.Media<'images'>;
    hoverVideo: Schema.Attribute.Media<'videos'>;
    image: Schema.Attribute.Media<'images'>;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    title: Schema.Attribute.Text;
  };
}

export interface SharedTextItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_text_items';
  info: {
    displayName: 'Text Item';
  };
  attributes: {
    text: Schema.Attribute.Text;
  };
}

export interface SharedWhoSuitsItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_who_suits_items';
  info: {
    displayName: 'Who Suits Item';
  };
  attributes: {
    buttonLink: Schema.Attribute.Text;
    buttonText: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images'>;
    text: Schema.Attribute.Text;
    title: Schema.Attribute.Text;
  };
}

export interface SharedWhyTrustGalleryItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_why_trust_gallery_items';
  info: {
    displayName: 'Why Trust Gallery Item';
  };
  attributes: {
    hoverImage: Schema.Attribute.Media<'images'>;
    image: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedWhyTrustPoint extends Struct.ComponentSchema {
  collectionName: 'components_shared_why_trust_points';
  info: {
    displayName: 'Why Trust Point';
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
      'shared.coverage-map-review': SharedCoverageMapReview;
      'shared.faq-category': SharedFaqCategory;
      'shared.faq-item': SharedFaqItem;
      'shared.make-item': SharedMakeItem;
      'shared.text-item': SharedTextItem;
      'shared.who-suits-item': SharedWhoSuitsItem;
      'shared.why-trust-gallery-item': SharedWhyTrustGalleryItem;
      'shared.why-trust-point': SharedWhyTrustPoint;
      'shared.work-stage-item': SharedWorkStageItem;
    }
  }
}
