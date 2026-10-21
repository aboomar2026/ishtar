import { brand } from './brand';

// Retain existing browser data for the four original profiles. ISHTAR has its
// own namespace so switching from a demo does not import its cart or addresses.
const namespace = brand.key === 'ishtar' ? 'ishtar' : 'bab-al-hara';

export const brandStorageKeys = {
  cart: `${namespace}-cart-v2`,
  shipping: `${namespace}-shipping`,
  recentOrders: `${namespace}:recent-orders`
};
