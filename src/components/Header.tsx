'use client';

import { useState } from 'react';
import Link from 'next/link';
import { brand } from '@/lib/brand';
import { useCart } from './CartProvider';
import { BrandLogo } from './BrandLogo';
import { IconCart, IconMenu } from './Icons';
import { SearchBar } from './SearchBar';

const navLinks = [
  { href: '/category/new-in', label: 'وصل حديثاً' },
  { href: '/category/bags', label: 'شنط' },
  { href: '/category/perfumes', label: 'عطور' },
  { href: '/category/creams-makeup', label: 'مكياج' },
  { href: '/category/accessories', label: 'إكسسوارات' },
  { href: '/category/sale', label: 'العروض' },
  { href: '/track-order', label: 'تتبع الطلب' }
];

const drawerLinks = [
  { href: '/', label: 'الرئيسية' },
  { href: '/category/new-in', label: 'وصل حديثاً' },
  { href: '/category/sale', label: 'العروض' },
  { href: '/category/accessories', label: 'الإكسسوارات' },
  { href: '/track-order', label: 'تتبع الطلب' },
  { href: '/cart', label: 'السلة' }
];

export function Header() {
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="siteHeader">
        <div className="headerNotice">{brand.copy.announcement}</div>
        <div className="headerTop">
          <button
            className="iconButton mobileMenuBtn"
            type="button"
            aria-label="فتح القائمة"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <IconMenu size={20} />
          </button>
          <Link href="/" className="brandLink" aria-label={`${brand.name} الرئيسية`}>
            <BrandLogo variant="header" />
          </Link>
          <SearchBar compact />
          <div className="headerActions">
            <Link href="/cart" className="cartButton" aria-label="السلة">
              <IconCart size={20} />
              {itemCount > 0 ? <span>{itemCount}</span> : null}
            </Link>
          </div>
        </div>
        <nav className="desktopNav" aria-label="التصنيفات الرئيسية">
          {navLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </nav>
      </header>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="storeDrawerBackdrop"
            aria-label="إغلاق القائمة"
            onClick={() => setMenuOpen(false)}
          />
          <div className="storeDrawer" role="dialog" aria-modal="true" aria-label="قائمة التنقل">
            <div className="storeDrawerHead">
              <BrandLogo variant="header" />
              <button
                type="button"
                className="iconButton"
                aria-label="إغلاق القائمة"
                onClick={() => setMenuOpen(false)}
              >
                ✕
              </button>
            </div>
            <nav className="storeDrawerNav" aria-label="القائمة الرئيسية">
              {drawerLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </>
      ) : null}
    </>
  );
}
