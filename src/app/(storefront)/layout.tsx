import './analytics.css';
import { StoreAnalytics } from '@/components/StoreAnalytics';
import { QuickViewProvider } from '@/components/QuickViewProvider';
import { CartProvider } from '@/components/CartProvider';
import { WishlistProvider } from '@/components/WishlistProvider';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MobileBottomNav } from '@/components/MobileBottomNav';

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider><WishlistProvider><QuickViewProvider>
      <StoreAnalytics measurementId={process.env.VERCEL_ENV === 'production' ? process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID : undefined} />
      <Header />
      <main className="pageShell">{children}</main>
      <Footer />
      <MobileBottomNav />
    </QuickViewProvider></WishlistProvider></CartProvider>
  );
}
