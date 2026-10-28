import { NavigationProvider } from '@/components/NavigationProvider';
import { buildPageMetadata } from '@/lib/seo';
import { publicSiteUrl } from '@/lib/site-url';
import type { Metadata, Viewport } from 'next';
import { Tajawal, El_Messiri } from 'next/font/google';
import { activeBrandKey, brand, getBrandCssVariables } from '@/lib/brand';
import './globals.css';
import './ishtar.css';
import './hero.css';
import './controls.css';
import './collections.css';

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700', '800', '900'],
  variable: '--font-brand',
  display: 'swap'
});

const elMessiri = El_Messiri({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap'
});

export const metadata: Metadata = {
  metadataBase: publicSiteUrl(),
  ...buildPageMetadata({ title: brand.seo.title, description: brand.seo.description, path: '/' }),
  alternates: undefined,
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  applicationName: brand.englishName,
  manifest: brand.key === 'ishtar' ? '/brand/ishtar/site.webmanifest' : undefined,
  icons: {
    icon: brand.assets.favicon32 ?? '/icon.svg',
    apple: brand.assets.appleTouchIcon ?? brand.assets.favicon32 ?? '/icon.svg'
  }
};

export const viewport: Viewport = {
  themeColor: brand.colors.primary
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${tajawal.variable} ${elMessiri.variable}`}
      data-brand={activeBrandKey}
      data-scroll-behavior="smooth"
      style={getBrandCssVariables()}
    >
      <body><NavigationProvider>{children}</NavigationProvider></body>
    </html>
  );
}
