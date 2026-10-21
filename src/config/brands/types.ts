export type BrandKey = 'saad' | 'bab-al-hara' | 'obbeh' | 'madar' | 'ishtar';

export type BrandAssets = {
  full?: string;
  header?: string;
  icon?: string;
  iconBadge?: string;
  monoPrimary?: string;
  monoWhite?: string;
  favicon32?: string;
  appleTouchIcon?: string;
};

export type BrandColors = {
  background: string;
  surface: string;
  section: string;
  border: string;
  accent: string;
  accentSoft: string;
  accentDark: string;
  primary: string;
  primaryHover: string;
  primaryDark: string;
  primaryDeep: string;
  soft: string;
  softAlt: string;
  text: string;
  muted: string;
  brown: string;
  black: string;
  danger: string;
  success: string;
  pageEnd: string;
  footerStart: string;
  footerEnd: string;
};

export type BrandProfile = {
  key: BrandKey;
  isProvisional?: boolean;
  name: string;
  englishName: string;
  monogram: string;
  tagline: string;
  seo: {
    title: string;
    description: string;
  };
  assets: BrandAssets;
  colors: BrandColors;
  copy: {
    announcement: string;
    heroEyebrow: string;
    heroTitle: string;
    heroSubtitle: string;
    heroCta: string;
    heroSecondaryCta: string;
    heroTrustItems: [string, string, string];
    heroCollageLabel: string;
    promoEyebrow: string;
    promoTitle: string;
    promoSubtitle: string;
    promoCta: string;
    boutiqueEyebrow: string;
    boutiqueTitle: string;
    boutiqueDescription: string;
    featuredCollectionTitle: string;
    categoryEyebrow: string;
    categorySearchDescription: string;
    productEyebrow: string;
    virtualNewInDescription: string;
    footerDescriptionAr: string;
    footerDescriptionEn: string;
    footerBadge: string;
    invoiceSubtitle: string;
    invoiceThanks: string;
    packingSlipSubtitle: string;
    adminCatalogDescription: string;
  };
  contact: {
    whatsappNumber: string;
    phoneDisplay: string;
    addressAr: string;
    addressEn: string;
    hoursPrimary: string;
    hoursSecondary: string;
    inquiryText: string;
  };
  social: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
  behavior: {
    /** Shared demo databases can contain copy from another brand. Keep false unless the banner copy is brand-neutral. */
    useDatabaseBannerCopy: boolean;
  };
};
