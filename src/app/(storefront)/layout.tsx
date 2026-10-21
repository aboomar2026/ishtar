import { CartProvider } from '@/components/CartProvider';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MobileBottomNav } from '@/components/MobileBottomNav';

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Header />
      <main className="pageShell">{children}</main>
      <Footer />
      <MobileBottomNav />
    </CartProvider>
  );
}
