import type { Schema, Struct } from '@strapi/strapi';

export interface AboutPartnerCard extends Struct.ComponentSchema {
  collectionName: 'components_about_partner_cards';
  info: {
    displayName: '\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u043F\u0430\u0440\u0442\u043D\u0435\u0440\u0430';
    icon: 'briefcase';
  };
  attributes: {
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    logo: Schema.Attribute.Media<'images'>;
    order: Schema.Attribute.Integer;
    stores: Schema.Attribute.Component<'about.store-link', true>;
    title: Schema.Attribute.String;
  };
}

export interface AboutStoreLink extends Struct.ComponentSchema {
  collectionName: 'components_about_store_links';
  info: {
    displayName: '\u0421\u0441\u044B\u043B\u043A\u0430 \u043C\u0430\u0433\u0430\u0437\u0438\u043D\u0430';
    icon: 'link';
  };
  attributes: {
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    href: Schema.Attribute.String;
    logo: Schema.Attribute.Media<'images'>;
    order: Schema.Attribute.Integer;
    title: Schema.Attribute.String;
  };
}

export interface AboutValueCard extends Struct.ComponentSchema {
  collectionName: 'components_about_value_cards';
  info: {
    displayName: '\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0446\u0435\u043D\u043D\u043E\u0441\u0442\u0438';
    icon: 'star';
  };
  attributes: {
    description: Schema.Attribute.RichText;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    highlightText: Schema.Attribute.Text;
    icon: Schema.Attribute.Media<'images'>;
    order: Schema.Attribute.Integer;
    title: Schema.Attribute.String;
  };
}

export interface AboutWhyItem extends Struct.ComponentSchema {
  collectionName: 'components_about_why_items';
  info: {
    displayName: '\u041F\u0440\u0438\u0447\u0438\u043D\u0430 \u0432\u044B\u0431\u043E\u0440\u0430';
    icon: 'check';
  };
  attributes: {
    description: Schema.Attribute.RichText;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    label: Schema.Attribute.String;
    linkHref: Schema.Attribute.String;
    linkLabel: Schema.Attribute.String;
    order: Schema.Attribute.Integer;
    title: Schema.Attribute.String;
    value: Schema.Attribute.String;
  };
}

export interface CertificatesCertificateItem extends Struct.ComponentSchema {
  collectionName: 'components_certificates_certificate_items';
  info: {
    displayName: '\u0421\u0435\u0440\u0442\u0438\u0444\u0438\u043A\u0430\u0442';
    icon: 'file';
  };
  attributes: {
    alt: Schema.Attribute.String;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    image: Schema.Attribute.Media<'images'>;
    order: Schema.Attribute.Integer;
    title: Schema.Attribute.String;
  };
}

export interface SharedBannerSlideItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_banner_slide_items';
  info: {
    displayName: '\u0421\u043B\u0430\u0439\u0434 \u0431\u0430\u043D\u043D\u0435\u0440\u0430';
  };
  attributes: {
    buttonHref: Schema.Attribute.String;
    buttonLabel: Schema.Attribute.String;
    contentAlign: Schema.Attribute.Enumeration<['left', 'center', 'right']> &
      Schema.Attribute.DefaultTo<'left'>;
    contentVerticalAlign: Schema.Attribute.Enumeration<
      ['top', 'center', 'bottom']
    > &
      Schema.Attribute.DefaultTo<'center'>;
    description: Schema.Attribute.Text;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    image: Schema.Attribute.Media<'images'>;
    mobileImage: Schema.Attribute.Media<'images'>;
    order: Schema.Attribute.Integer;
    subtitle: Schema.Attribute.Text;
    textColor: Schema.Attribute.Enumeration<['dark', 'light']> &
      Schema.Attribute.DefaultTo<'dark'>;
    textMaxWidth: Schema.Attribute.String;
    title: Schema.Attribute.Text;
  };
}

export interface SharedCoverageMapReview extends Struct.ComponentSchema {
  collectionName: 'components_shared_coverage_map_reviews';
  info: {
    displayName: '\u041E\u0442\u0437\u044B\u0432 \u043D\u0430 \u043A\u0430\u0440\u0442\u0435';
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
    displayName: '\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F FAQ';
  };
  attributes: {
    items: Schema.Attribute.Component<'shared.faq-item', true>;
    title: Schema.Attribute.Text;
  };
}

export interface SharedFaqItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_faq_items';
  info: {
    displayName: '\u0412\u043E\u043F\u0440\u043E\u0441 FAQ';
  };
  attributes: {
    answer: Schema.Attribute.Text;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    number: Schema.Attribute.Text;
    question: Schema.Attribute.Text;
  };
}

export interface SharedFloatingContactItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_floating_contact_items';
  info: {
    displayName: '\u041A\u043E\u043D\u0442\u0430\u043A\u0442 \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440\u0430';
  };
  attributes: {
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    hoverIcon: Schema.Attribute.Media<'images'>;
    href: Schema.Attribute.Text;
    icon: Schema.Attribute.Media<'images'>;
    label: Schema.Attribute.Text;
    order: Schema.Attribute.Integer;
  };
}

export interface SharedFooterLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_footer_links';
  info: {
    displayName: '\u0421\u0441\u044B\u043B\u043A\u0430 \u043F\u043E\u0434\u0432\u0430\u043B\u0430';
  };
  attributes: {
    href: Schema.Attribute.Text;
    label: Schema.Attribute.Text;
  };
}

export interface SharedFooterSocialLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_footer_social_links';
  info: {
    displayName: '\u0421\u043E\u0446\u0441\u0435\u0442\u044C \u043F\u043E\u0434\u0432\u0430\u043B\u0430';
  };
  attributes: {
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    hoverIcon: Schema.Attribute.Media<'images'>;
    href: Schema.Attribute.Text;
    icon: Schema.Attribute.Media<'images'>;
    label: Schema.Attribute.Text;
  };
}

export interface SharedFormula72SchemeItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_formula72_scheme_items';
  info: {
    displayName: '\u041D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 Formula72';
  };
  attributes: {
    description: Schema.Attribute.Text;
    mobileImage: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.Text;
  };
}

export interface SharedMakeItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_make_items';
  info: {
    displayName: '\u0422\u0438\u043F \u043F\u0440\u043E\u0434\u0443\u043A\u0446\u0438\u0438';
  };
  attributes: {
    buttonLink: Schema.Attribute.Text;
    buttonText: Schema.Attribute.Text;
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
    displayName: '\u0422\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0439 \u043F\u0443\u043D\u043A\u0442';
  };
  attributes: {
    text: Schema.Attribute.Text;
  };
}

export interface SharedWhoSuitsItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_who_suits_items';
  info: {
    displayName: '\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0430\u0443\u0434\u0438\u0442\u043E\u0440\u0438\u0438';
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
    displayName: '\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0434\u043E\u0432\u0435\u0440\u0438\u044F';
  };
  attributes: {
    hoverImage: Schema.Attribute.Media<'images'>;
    image: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedWhyTrustPoint extends Struct.ComponentSchema {
  collectionName: 'components_shared_why_trust_points';
  info: {
    displayName: '\u041F\u0443\u043D\u043A\u0442 \u0434\u043E\u0432\u0435\u0440\u0438\u044F';
  };
  attributes: {
    text: Schema.Attribute.Text;
  };
}

export interface SharedWorkStageItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_work_stage_items';
  info: {
    displayName: '\u042D\u0442\u0430\u043F \u0440\u0430\u0431\u043E\u0442\u044B';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
    number: Schema.Attribute.Integer;
    text: Schema.Attribute.Text;
  };
}

export interface TermsTermsSection extends Struct.ComponentSchema {
  collectionName: 'components_terms_terms_sections';
  info: {
    displayName: '\u0421\u0435\u043A\u0446\u0438\u044F \u0443\u0441\u043B\u043E\u0432\u0438\u0439';
    icon: 'file';
  };
  attributes: {
    buttonHref: Schema.Attribute.String;
    buttonLabel: Schema.Attribute.String;
    content: Schema.Attribute.RichText;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    image: Schema.Attribute.Media<'images'>;
    order: Schema.Attribute.Integer;
    title: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'about.partner-card': AboutPartnerCard;
      'about.store-link': AboutStoreLink;
      'about.value-card': AboutValueCard;
      'about.why-item': AboutWhyItem;
      'certificates.certificate-item': CertificatesCertificateItem;
      'shared.banner-slide-item': SharedBannerSlideItem;
      'shared.coverage-map-review': SharedCoverageMapReview;
      'shared.faq-category': SharedFaqCategory;
      'shared.faq-item': SharedFaqItem;
      'shared.floating-contact-item': SharedFloatingContactItem;
      'shared.footer-link': SharedFooterLink;
      'shared.footer-social-link': SharedFooterSocialLink;
      'shared.formula72-scheme-item': SharedFormula72SchemeItem;
      'shared.make-item': SharedMakeItem;
      'shared.text-item': SharedTextItem;
      'shared.who-suits-item': SharedWhoSuitsItem;
      'shared.why-trust-gallery-item': SharedWhyTrustGalleryItem;
      'shared.why-trust-point': SharedWhyTrustPoint;
      'shared.work-stage-item': SharedWorkStageItem;
      'terms.terms-section': TermsTermsSection;
    }
  }
}
