'use client';

import { useDialog } from './useDialog';
import { storeLinks } from '@/lib/store-navigation';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { brand } from '@/lib/brand';
import { useCart } from './CartProvider';
import { BrandLogo } from './BrandLogo';
import { IconCart, IconMenu } from './Icons';
import { SearchBar } from './SearchBar';

const navLinks = storeLinks;
const drawerLinks = [{ href: '/', label: 'الرئيسية' }, ...storeLinks, { href: '/cart', label: 'السلة' }];

export function Header() {
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartPressed, setCartPressed] = useState(false);
  const pathname = usePathname();
  const drawerRef = useDialog(menuOpen, () => setMenuOpen(false));

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
            <Link
              href="/cart"
              className={`cartButton${itemCount > 0 ? ' hasItems' : ''}${cartPressed ? ' isPressed' : ''}`}
              aria-label="السلة"
              onClick={() => {
                if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setCartPressed(true);
              }}
              onAnimationEnd={() => setCartPressed(false)}
            >
              <IconCart key={itemCount} size={brand.key === 'ishtar' ? 28 : 20} />
              {itemCount > 0 ? <span>{itemCount}</span> : null}
            </Link>
          </div>
        </div>
        <nav className="desktopNav" aria-label="التصنيفات الرئيسية">
          {navLinks.map((link) => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}>{link.label}</Link>)}
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
          <div className="storeDrawer" ref={drawerRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="قائمة التنقل">
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
