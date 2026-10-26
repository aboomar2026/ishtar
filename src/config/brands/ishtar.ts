import type { BrandProfile } from './types';

/** Approved ISHTAR v1 brand kit — logo option 3, palette option 2. */
export const ishtarBrand: BrandProfile = {
  key: 'ishtar',
  name: 'عشتار',
  englishName: 'ISHTAR',
  monogram: 'ع',
  tagline: 'إكسسوارات ولمسات تكمّل أناقتك',
  seo: {
    title: 'عشتار | ISHTAR — إكسسوارات ولمسات أنيقة',
    description: 'عشتار — مساحة لاكتشاف الإكسسوارات والحقائب والعطور ولمسات الجمال المختارة لتناسب ذوقك.'
  },
  assets: {
    full: '/brand/ishtar/ishtar-horizontal-reverse.svg',
    header: '/brand/ishtar/ishtar-horizontal-brand.svg',
    icon: '/brand/ishtar/ishtar-symbol-brand.svg',
    iconBadge: '/brand/ishtar/ishtar-symbol-brand.svg',
    monoPrimary: '/brand/ishtar/ishtar-symbol-burgundy.svg',
    monoWhite: '/brand/ishtar/ishtar-symbol-white.svg',
    favicon32: '/brand/ishtar/favicon-32.png',
    appleTouchIcon: '/brand/ishtar/apple-touch-icon.png'
  },
  colors: {
    background: '#FBF5ED', surface: '#FFFFFF', section: '#F5EAE6', border: '#DFCFCC',
    accent: '#C79A83', accentSoft: '#ECD7CB', accentDark: '#795342',
    primary: '#522B3A', primaryHover: '#613648', primaryDark: '#41202D', primaryDeep: '#2D1922',
    soft: '#D9B5B4', softAlt: '#F5E7E5', text: '#2D2428', muted: '#695760',
    brown: '#522B3A', black: '#2D2428', danger: '#9F3B42', success: '#286647',
    pageEnd: '#F6ECE6', footerStart: '#522B3A', footerEnd: '#2D1922'
  },
  copy: {
    announcement: 'عشتار | تفاصيل صغيرة تكمّل إطلالتك',
    heroEyebrow: 'ISHTAR · ACCESSORIES',
    heroTitle: 'تفاصيل تعبّر عنكِ',
    heroSubtitle: 'إكسسوارات وحقائب وعطور ولمسات جمال تضيف طابعك الخاص لكل إطلالة.',
    heroCta: 'اكتشفي المجموعة',
    heroSecondaryCta: 'تصفّحي جميع المنتجات',
    heroTrustItems: ['إكسسوارات مميزة', 'اختيارات متنوعة', 'تسوّق بسهولة'],
    heroCollageLabel: 'عشتار · اختيارات تناسبك',
    promoEyebrow: 'ISHTAR EDIT',
    promoTitle: 'لمساتك الخاصة تبدأ من هنا',
    promoSubtitle: 'اكتشفي تفاصيل مختارة تكمّل أسلوبك، من الإكسسوارات إلى لمسات الجمال.',
    promoCta: 'تصفّحي المنتجات',
    boutiqueEyebrow: 'ISHTAR · DETAILS MATTER',
    boutiqueTitle: 'أناقة في كل تفصيل',
    boutiqueDescription: 'مساحة تجمع الإكسسوارات والقطع المكملة لإطلالتك في تجربة تسوق واضحة وبسيطة.',
    featuredCollectionTitle: 'مختارات عشتار',
    categoryEyebrow: 'تصفّحي تصنيفات عشتار',
    categorySearchDescription: 'منتجات مطابقة من مجموعة عشتار.',
    productEyebrow: 'ISHTAR SELECTION',
    virtualNewInDescription: 'اكتشفي أحدث المنتجات المعروضة في عشتار.',
    footerDescriptionAr: 'عشتار — إكسسوارات ولمسات مختارة تعبّر عن ذوقك وتضيف تفصيلاً مميزاً لكل إطلالة.',
    footerDescriptionEn: 'ISHTAR — accessories and thoughtfully chosen details for your personal style.',
    footerBadge: 'DETAILS THAT SHINE',
    invoiceSubtitle: 'ISHTAR — عشتار للإكسسوارات',
    invoiceThanks: 'شكراً لتسوقك من عشتار',
    packingSlipSubtitle: 'عشتار — ورقة تجهيز الطلب',
    adminCatalogDescription: 'سجّل الدخول لإدارة متجر عشتار.'
  },
  // Business contact details are unconfirmed. Never copy sample numbers from other brands.
  contact: { whatsappNumber: '', phoneDisplay: '', addressAr: 'فلسطين', addressEn: 'Palestine',
    hoursPrimary: '', hoursSecondary: '', inquiryText: '' },
  social: {
    instagram: 'https://www.instagram.com/ishtarr_3/',
    facebook: 'https://www.facebook.com/profile.php?id=61591305881099',
    tiktok: 'https://www.tiktok.com/@ishtarr_3'
  },
  behavior: { useDatabaseBannerCopy: false }
};
