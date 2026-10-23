'use client';
import { useWishlist } from './WishlistProvider';
import { IconHeart } from './Icons';
export function WishlistButton({ id, name, label = false }: { id: string; name: string; label?: boolean }) {
  const { ids, loaded, toggle } = useWishlist();
  const saved = ids.includes(id);
  return <button type="button" className={`wishlistButton${saved ? ' isSaved' : ''}${label ? ' hasLabel' : ''}`} disabled={!loaded}
    aria-pressed={saved} aria-label={`${saved ? 'إزالة' : 'حفظ'} ${name} ${saved ? 'من' : 'في'} المفضّلة`} onClick={() => toggle(id)}>
    <IconHeart size={22} weight={saved ? 'fill' : 'regular'} />{label && <span>{saved ? 'محفوظ في المفضّلة' : 'حفظ في المفضّلة'}</span>}
  </button>;
}
