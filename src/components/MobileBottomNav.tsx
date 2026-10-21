'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from './CartProvider';
import { IconCart, IconGrid, IconHome, IconSearch, IconUser } from './Icons';

const links = [
  { href: '/', label: 'الرئيسية', icon: IconHome },
  { href: '/category/new-in', label: 'الجديد', icon: IconGrid },
  { href: '/category/sale', label: 'العروض', icon: IconSearch },
  { href: '/cart', label: 'السلة', icon: IconCart },
  { href: '/checkout', label: 'الدفع', icon: IconUser }
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  return (
    <nav className="mobileBottomNav" aria-label="التنقل السريع">
      {links.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Link href={item.href} key={item.href} className={active ? 'active' : ''}>
            <span className="bottomIconWrap">
              <Icon size={20} />
              {item.href === '/cart' && itemCount > 0 ? <em>{itemCount}</em> : null}
            </span>
            <small>{item.label}</small>
          </Link>
        );
      })}
    </nav>
  );
}
