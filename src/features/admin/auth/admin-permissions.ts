import type { AdminRole } from '@prisma/client';

export type AdminPermission = 'catalog' | 'orders';

// Keep order/customer information restricted to the store administrator.
// Unknown/future roles must opt in explicitly rather than inherit access.
export function hasAdminPermission(role: string, permission: AdminPermission): boolean {
  return role === 'SUPER_ADMIN' || (role === 'CATALOG_MANAGER' && permission === 'catalog');
}

export function adminLandingPath(role: AdminRole): string {
  return hasAdminPermission(role, 'orders') ? '/admin' : '/admin/products';
}
