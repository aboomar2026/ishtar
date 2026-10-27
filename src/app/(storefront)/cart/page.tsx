import { WhatsAppContact } from '@/components/WhatsAppContact';
import { CartPageClient } from '@/components/CartPageClient';

export default function CartPage() {
  return (
    <div className="plainPage">
      <div className="pageTitleBlock">
        <span className="eyebrow">Shopping cart</span>
        <h1>سلة التسوق</h1>
      </div>
      <CartPageClient />
      <div className="heroActions"><WhatsAppContact context={{ kind: 'cart' }} label="مساعدة بالسلة عبر واتساب" /></div>
    </div>
  );
}
