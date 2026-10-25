// Shared ordering for the admin preview and automatic storefront collage.
// One representative per category first, then fill with distinct photos in product order.
export function selectCollectionImages(
  products: { categoryId?: string; image: string }[],
): string[] {
  const seenCategories = new Set<string>();
  const candidates = products
    .map((product, position) => {
      const category = product.categoryId ?? "";
      const representative = !seenCategories.has(category);
      seenCategories.add(category);
      return { ...product, category, position, representative };
    })
    .sort(
      (a, b) =>
        Number(b.representative) - Number(a.representative) ||
        (a.representative && b.representative
          ? a.category < b.category
            ? -1
            : a.category > b.category
              ? 1
              : 0
          : 0) ||
        a.position - b.position,
    );
  return [
    ...new Set(candidates.map((product) => product.image).filter(Boolean)),
  ].slice(0, 3);
}
