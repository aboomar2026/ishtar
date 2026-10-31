type HeroProduct = { image: string; name: string; href: string };

/** Shuffle once on the server per page request; hydration keeps the same selection. */
export function shuffleHeroProducts<T>(products: T[], random = Math.random): T[] {
  const result = [...products];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Reserve every valid pin before filling random positions, so random picks cannot displace it. */
export function resolveHeroProducts(products: HeroProduct[], slots: (string | null)[]) {
  const pool = products.filter((p, i) => p.image && products.findIndex(other => other.href === p.href) === i);
  const used = new Set<string>();
  const selected = [0, 1, 2].map(index => {
    const product = pool.find(p => p.href === slots[index]);
    if (!product || used.has(product.href)) return undefined;
    used.add(product.href);
    return product;
  });
  return selected.map(product => {
    if (product) return product;
    const next = pool.find(p => !used.has(p.href));
    if (next) used.add(next.href);
    return next;
  });
}
