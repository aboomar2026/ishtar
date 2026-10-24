import { QuickViewProvider } from '@/components/QuickViewProvider';
import { CartProvider } from '@/components/CartProvider';
import { WishlistProvider } from '@/components/WishlistProvider';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MobileBottomNav } from '@/components/MobileBottomNav';

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider><WishlistProvider><QuickViewProvider>
      <Header />
      <main className="pageShell">{children}</main>
      <Footer />
      <MobileBottomNav />
    </QuickViewProvider></WishlistProvider></CartProvider>
  );
}
