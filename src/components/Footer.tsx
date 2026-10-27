'use client';

import { WhatsAppContact } from './WhatsAppContact';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from '@/components/NavigationLink';
import { brand } from '@/lib/brand';
import { BrandLogo } from './BrandLogo';
import {
  IconTruck,
  IconWallet,
  IconGift,
  IconSparkle,
  IconPin,
  IconPhone,
  IconClock,
  IconLeaf, IconArrowLeft, IconInstagram, IconFacebook, IconTikTok,
  IconWhatsApp
} from './Icons';

const trustItems = brand.key === 'ishtar' ? [
  { Icon: IconSparkle, title: 'تفاصيل تناسب ذوقك', subtitle: 'Find your own style' },
  { Icon: IconGift, title: 'إكسسوارات وقطع مكملة', subtitle: 'Accessories & more' },
  { Icon: IconWallet, title: 'تسوق بخطوات بسيطة', subtitle: 'Simple shopping' },
  { Icon: IconTruck, title: 'التوصيل يُؤكّد عند التواصل', subtitle: 'Delivery confirmed with you' }
] : [
  { Icon: IconTruck, title: 'توصيل سريع داخل غزة', subtitle: 'Fast Local Delivery' },
  { Icon: IconWallet, title: 'دفع عند الاستلام', subtitle: 'Cash on Delivery' },
  { Icon: IconGift, title: 'تغليف أنيق للهدايا', subtitle: 'Elegant Gift Wrapping' },
  { Icon: IconSparkle, title: 'منتجات مختارة بعناية', subtitle: 'Carefully Curated' }
];

const storeLinks = [
  { href: '/', label: 'الرئيسية' },
  { href: '/category/new-in', label: 'وصل حديثاً' },
  { href: '/category/sale', label: 'العروض' },
  { href: '/category/accessories', label: 'الإكسسوارات' },
  { href: '/cart', label: 'السلة' },
  { href: '/track-order', label: 'تتبع الطلب' }
];

const serviceLinks = [
  { href: '/track-order', label: 'تتبع الطلب', pending: false },
  { href: '#', label: 'سياسة الاستبدال والاسترجاع', pending: true },
  { href: '#', label: 'الأسئلة الشائعة', pending: true },
  { href: '#', label: 'تواصل معنا', pending: true }
];

const socialLinks = [
  ...(brand.social.instagram ? [{
    label: 'Instagram',
    href: brand.social.instagram,
    icon: (
      <IconInstagram size={20} />
    )
  }] : []),
  ...(brand.social.facebook ? [{
    label: 'Facebook',
    href: brand.social.facebook,
    icon: (
      <IconFacebook size={20} />
    )
  }] : []),
  ...(brand.social.tiktok ? [{
    label: 'TikTok',
    href: brand.social.tiktok,
    icon: (
      <IconTikTok size={20} />
    )
  }] : []),
  ...(brand.contact.whatsappNumber ? [{
    label: 'WhatsApp',
    href: `https://wa.me/${brand.contact.whatsappNumber}`,
    icon: <IconWhatsApp size={20} />
  }] : [])
];

export function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const currentYear = new Date().getFullYear();

  function handleSubscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) return;
    setSubscribed(true);
    setEmail('');
  }

  return (
    <footer className="siteFooter" aria-labelledby="siteFooterHeading">
      <h2 id="siteFooterHeading" className="srOnly">معلومات المتجر وروابط {brand.name}</h2>

      <div className="footerTrustStrip">
        <ul className="footerTrustGrid">
          {trustItems.map(({ Icon, title, subtitle }) => (
            <li key={title} className="footerTrustItem">
              <span className="footerTrustIcon" aria-hidden="true"><Icon size={22} /></span>
              <span className="footerTrustText"><strong>{title}</strong><small>{subtitle}</small></span>
            </li>
          ))}
        </ul>
      </div>

      <div className="footerMain">
        <div className="footerInner">
          <div className={`footerGrid${brand.key === 'ishtar' ? ` footerGridIshtar${socialLinks.length ? ' hasSocials' : ''}` : ''}`}>
            <div className="footerBrand">
              <span className="footerGlow" aria-hidden="true" />
              <BrandLogo variant="full" />
              <p className="footerBrandDesc">{brand.copy.footerDescriptionAr}</p>
              <p className="footerBrandEn">{brand.copy.footerDescriptionEn}</p>
              <Link className="footerBadge" href="/category/new-in">
                <IconSparkle size={15} />
                <span>{brand.copy.footerBadge}</span>
                <IconArrowLeft className="footerBadgeArrow" size={22} />
              </Link>
            </div>

            <nav className="footerColumn" aria-label="روابط المتجر">
              <h3 className="footerColTitle">المتجر</h3>
              <ul className="footerLinkList">
                {storeLinks.map((link) => (
                  <li key={link.href}>
                    <Link className="footerLink" href={link.href}>
                      <span className="footerLinkDot" aria-hidden="true" />
                      <span className="footerLinkLabel">{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {brand.key !== 'ishtar' && <nav className="footerColumn" aria-label="خدمة العملاء">
              <h3 className="footerColTitle">خدمة العملاء</h3>
              <ul className="footerLinkList">
                {serviceLinks.filter((link) => brand.key !== 'ishtar' || !link.pending).map((link) => link.pending ? (
                  <li key={link.label}>
                    <span className="footerLink footerLink--pending" aria-disabled="true">
                      <span className="footerLinkDot" aria-hidden="true" />
                      <span className="footerLinkLabel">{link.label}</span>
                      <em className="footerSoon">قريباً</em>
                    </span>
                  </li>
                ) : (
                  <li key={link.label}>
                    <Link className="footerLink" href={link.href}>
                      <span className="footerLinkDot" aria-hidden="true" />
                      <span className="footerLinkLabel">{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>}

            <div className="footerColumn footerContact">
              <h3 className="footerColTitle">{brand.contact.whatsappNumber ? "تواصلي معنا" : "موقع المتجر"}</h3>
              <ul className="footerContactList">
                <li>
                  <span className="footerContactIcon" aria-hidden="true"><IconPin size={18} /></span>
                  <span className="footerContactText"><span>{brand.contact.addressAr}</span><small>{brand.contact.addressEn}</small></span>
                </li>
                {brand.contact.phoneDisplay && brand.contact.whatsappNumber ? <li>
                  <span className="footerContactIcon" aria-hidden="true"><IconPhone size={18} /></span>
                  <a className="footerContactLink" href={`tel:+${brand.contact.whatsappNumber}`} dir="ltr">{brand.contact.phoneDisplay}</a>
                </li> : null}
                {brand.contact.whatsappNumber ? <li>
                  <span className="footerContactIcon" aria-hidden="true"><IconWhatsApp size={18} /></span>
                  <a className="footerContactLink" href={`https://wa.me/${brand.contact.whatsappNumber}`} target="_blank" rel="noopener noreferrer" dir="ltr">
                    {brand.contact.phoneDisplay}
                  </a>
                </li> : null}
                {brand.contact.whatsappNumber && brand.contact.inquiryText ? <li>
                  <WhatsAppContact label={brand.contact.inquiryText} />
                </li> : null}
                {brand.contact.hoursPrimary ? <li>
                  <span className="footerContactIcon" aria-hidden="true"><IconClock size={18} /></span>
                  <span className="footerContactText"><span>{brand.contact.hoursPrimary}</span><small>{brand.contact.hoursSecondary}</small></span>
                </li> : null}
              </ul>
            </div>

            <div className="footerColumn footerNewsletterCol" hidden={brand.key === "ishtar" && !socialLinks.length}>
              <div className="footerNewsletter">
                <h3 className="footerColTitle">{brand.key === 'ishtar' ? 'تابعي عشتار' : 'كوني أول من يعرف'}</h3>
                {brand.key !== 'ishtar' ? <p className="footerNewsletterDesc">اشتركي ليصلك جديد العروض والمنتجات المختارة.</p> : null}
                {brand.key === 'ishtar' ? (
                  <p className="footerNewsletterDesc">خلّيكِ قريبة من عشتار. اكتشفي جديدنا ولمسات تكمّل إطلالتك على صفحاتنا.</p>
                ) : (
                  <>
                  {subscribed ? (
                  <p className="footerNewsletterSuccess" role="status">تم الاشتراك بنجاح، شكراً لكِ! <IconLeaf size={18} /></p>
                ) : (
                  <form className="footerNewsletterForm" onSubmit={handleSubscribe} noValidate>
                    <label htmlFor="footerNewsletterEmail" className="srOnly">البريد الإلكتروني للاشتراك في النشرة</label>
                    <input
                      id="footerNewsletterEmail"
                      className="footerNewsletterInput"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="أدخلي بريدك الإلكتروني"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                    <button type="submit" className="footerNewsletterBtn">اشتراك</button>
                  </form>
                )}
                  </>
                )}

                <nav className="footerSocials" aria-label={`تابعي ${brand.name} على السوشيال ميديا`}>
                  {socialLinks.map((social) => (
                    <a key={social.label} className="footerSocialBtn" href={social.href} target="_blank" rel="noopener noreferrer" aria-label={`${brand.name} على ${social.label} (يفتح في تبويب جديد)`}>
                      <span className="footerSocialIcon">{social.icon}</span>
                      {brand.key === 'ishtar' ? <>
                        <span className="footerSocialLabel" lang="en" dir="ltr">{social.label}</span>
                        <svg className="footerSocialArrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg>
                      </> : null}
                    </a>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>

        <div className="footerBottom">
          <div className="footerBottomInner">
            <p className="footerCopy">© {currentYear} {brand.englishName}. جميع الحقوق محفوظة.</p>
            <p className="footerTagline">{brand.name} — {brand.tagline}.</p>
            <p className="footerCredit">Crafted with care for {brand.englishName}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
