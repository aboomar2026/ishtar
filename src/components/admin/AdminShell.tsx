'use client';

import { IconHome, IconReceipt, IconPackage, IconGrid, IconArchive, IconImages, IconMenu } from '@/components/Icons';
import { useDialog } from '@/components/useDialog';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/features/admin/auth/admin-actions';
import { BrandLogo } from '@/components/BrandLogo';
import { brand } from '@/lib/brand';
import { hasAdminPermission } from '@/features/admin/auth/admin-permissions';

type NavItem = { href: string; label: string; icon: React.ReactNode; exact?: boolean };

const NAV: NavItem[] = [
  { href: '/admin', label: 'لوحة التحكم', exact: true, icon: <IconHome className="adminNavIcon" size={20} /> },
  { href: '/admin/orders', label: 'الطلبات', icon: <IconReceipt className="adminNavIcon" size={20} /> },
  { href: '/admin/products', label: 'المنتجات', icon: <IconPackage className="adminNavIcon" size={20} /> },
  { href: '/admin/categories', label: 'التصنيفات', icon: <IconGrid className="adminNavIcon" size={20} /> },
  { href: '/admin/inventory', label: 'المخزون', icon: <IconArchive className="adminNavIcon" size={20} /> },
  { href: '/admin/banners', label: 'البنرات', icon: <IconImages className="adminNavIcon" size={20} /> }
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLinks({ pathname, role, onNavigate }: { pathname: string; role: string; onNavigate?: () => void }) {
  return (
    <nav className="adminNav">
      <span className="adminNavLabel">الكتالوج</span>
      {NAV.filter(item => hasAdminPermission(role, 'orders') || (item.href !== '/admin' && item.href !== '/admin/orders')).map((item) => (
        <Link key={item.href} href={item.href} className={isActive(pathname, item) ? 'active' : ''} aria-current={isActive(pathname, item) ? "page" : undefined} onClick={onNavigate}>
          {item.icon}
          <span>{item.label}</span>
        </Link>
      ))}
      <span className="adminNavLabel">اختصارات</span>
      <Link href="/" className="adminNavStore" target="_blank" onClick={onNavigate}>
        <IconHome className="adminNavIcon" size={20} />
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
  const drawerRef = useDialog(drawerOpen, () => setDrawerOpen(false));
  const current = NAV.find((item) => isActive(pathname, item));
  const title = current?.label ?? 'لوحة التحكم';

  return (
    <div className="adminRoot" dir="rtl">
      <aside className="adminSidebar">
        <div className="adminSidebarBrand">
          <BrandLogo variant="sidebar" subtitle="لوحة الإدارة" />
        </div>
        <NavLinks pathname={pathname} role={admin.role} />
      </aside>

      <div className="adminMainCol">
        <header className="adminTopbar">
          <button type="button" className="adminMenuBtn" aria-label="فتح القائمة" onClick={() => setDrawerOpen(true)}>
            <IconMenu size={24} />
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
          <div className="adminDrawer" ref={drawerRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="قائمة الإدارة">
            <div className="adminSidebarBrand">
              <BrandLogo variant="sidebar" subtitle={admin.name} />
            </div>
            <button type="button" className="adminBtn adminBtnGhost" onClick={() => setDrawerOpen(false)}>إغلاق القائمة</button>
            <NavLinks pathname={pathname} role={admin.role} onNavigate={() => setDrawerOpen(false)} />
            <form action={logoutAction} style={{ marginTop: 14 }}>
              <button type="submit" className="adminBtn adminBtnGhost adminBtnFull">تسجيل الخروج</button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
