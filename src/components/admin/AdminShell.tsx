'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/features/admin/auth/admin-actions';
import { BrandLogo } from '@/components/BrandLogo';
import { brand } from '@/lib/brand';

type NavItem = { href: string; label: string; icon: React.ReactNode; exact?: boolean };

function Icon({ path }: { path: string }) {
  return (
    <svg className="adminNavIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

const NAV: NavItem[] = [
  { href: '/admin', label: 'لوحة التحكم', exact: true, icon: <Icon path="M3 12l9-9 9 9M5 10v10h14V10" /> },
  { href: '/admin/orders', label: 'الطلبات', icon: <Icon path="M6 2l1.5 3h9L18 2M3 6h18l-1.5 14a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1L3 6zM9 11h6" /> },
  { href: '/admin/products', label: 'المنتجات', icon: <Icon path="M20 7l-8-4-8 4 8 4 8-4zM4 7v10l8 4 8-4V7M12 11v10" /> },
  { href: '/admin/categories', label: 'التصنيفات', icon: <Icon path="M4 5h16M4 12h16M4 19h10" /> },
  { href: '/admin/inventory', label: 'المخزون', icon: <Icon path="M3 4h18v4H3zM5 8v12h14V8M9 12h6" /> },
  { href: '/admin/banners', label: 'البنرات', icon: <Icon path="M3 5h18v10H3zM7 19h10M12 15v4" /> }
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="adminNav">
      <span className="adminNavLabel">الكتالوج</span>
      {NAV.map((item) => (
        <Link key={item.href} href={item.href} className={isActive(pathname, item) ? 'active' : ''} onClick={onNavigate}>
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
      <span className="adminNavLabel">اختصارات</span>
      <Link href="/" className="adminNavStore" target="_blank" onClick={onNavigate}>
        <Icon path="M3 9l9-7 9 7v11a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
        <span>عرض المتجر</span>
      </Link>
    </nav>
  );
}

export function AdminShell({
  admin,
  children
}: {
  admin: { name: string; email: string; role: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const current = NAV.find((item) => isActive(pathname, item));
  const title = current?.label ?? 'لوحة التحكم';

  return (
    <div className="adminRoot" dir="rtl">
      <aside className="adminSidebar">
        <div className="adminSidebarBrand">
          <BrandLogo variant="sidebar" subtitle="لوحة الإدارة" />
        </div>
        <NavLinks pathname={pathname} />
      </aside>

      <div className="adminMainCol">
        <header className="adminTopbar">
          <button type="button" className="adminMenuBtn" aria-label="فتح القائمة" onClick={() => setDrawerOpen(true)}>
            ☰
          </button>
          <div className="adminTopbarTitle">
            <span>{brand.name}</span>
            <strong>{title}</strong>
          </div>
          <div className="adminTopbarRight">
            <div className="adminUser">
              <strong>{admin.name}</strong>
              <span>{admin.email}</span>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="adminBtn adminBtnGhost adminBtnSm">تسجيل الخروج</button>
            </form>
          </div>
        </header>

        <main className="adminContent">{children}</main>
      </div>

      {drawerOpen && (
        <>
          <button type="button" className="adminDrawerBackdrop" aria-label="إغلاق القائمة" onClick={() => setDrawerOpen(false)} />
          <div className="adminDrawer" role="dialog" aria-label="قائمة الإدارة">
            <div className="adminSidebarBrand">
              <BrandLogo variant="sidebar" subtitle={admin.name} />
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            <form action={logoutAction} style={{ marginTop: 14 }}>
              <button type="submit" className="adminBtn adminBtnGhost adminBtnFull">تسجيل الخروج</button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
