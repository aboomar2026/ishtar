'use client';

import Link from '@/components/NavigationLink';
import { usePathname } from 'next/navigation';
import { useWishlist } from './WishlistProvider';
import { useCart } from './CartProvider';
import { IconCart, IconGrid, IconHome, IconGift, IconHeart } from './Icons';

const links = [
  { href: '/', label: 'الرئيسية', icon: IconHome },
  { href: '/category/new-in', label: 'الجديد', icon: IconGrid },
  { href: '/category/sale', label: 'العروض', icon: IconGift },
  { href: '/cart', label: 'السلة', icon: IconCart },
  { href: '/wishlist', label: 'المفضّلة', icon: IconHeart }
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { ids, loaded } = useWishlist();

  return (
    <nav className="mobileBottomNav" aria-label="التنقل السريع">
      {links.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Link href={item.href} key={item.href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
            <span className="bottomIconWrap">
              <Icon size={20} />
              {item.href === '/cart' && itemCount > 0 ? <em>{itemCount}</em> : null}
              {item.href === '/wishlist' && loaded && ids.length > 0 ? <em>{ids.length}</em> : null}
            </span>
            <small>{item.label}</small>
          </Link>
        );
      })}
    </nav>
  );
}
