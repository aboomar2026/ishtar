"use client";
import { CatalogImage } from '@/components/CatalogImage';
import { PRODUCT_THUMB_IMAGE } from '@/lib/cloudinary-image';
import { useEffect, useId, useState } from "react";
import { ArrowUp, ArrowDown, X, MagnifyingGlass } from "@phosphor-icons/react";
import { searchCollectionProducts } from "@/features/collections/collections.actions";
import type { ProductOption } from "@/features/collections/collections.types";
export function CollectionProductPicker({
  ids,
  onChange,
  initialProducts,
  onProducts,
  excludeId,
  max = 200,
  disabled = false,
}: {
  ids: string[];
  onChange: (ids: string[]) => void;
  initialProducts: ProductOption[];
  onProducts?: React.Dispatch<React.SetStateAction<ProductOption[]>>;
  excludeId?: string;
  max?: number;
  disabled?: boolean;
}) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{
    query: string;
    products: ProductOption[];
    error?: boolean;
  }>();
  const [known, setKnown] = useState<Record<string, ProductOption>>(() =>
    Object.fromEntries(initialProducts.map((product) => [product.id, product])),
  );
  const [dragged, setDragged] = useState<string>();
  useEffect(() => {
    let disposed = false;
    let requestTimeout: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(async () => {
      try {
        const products = await Promise.race([
          searchCollectionProducts(query),
          new Promise<never>((_, reject) => {
            requestTimeout = setTimeout(
              () => reject(new Error("timeout")),
              8000,
            );
          }),
        ]);
        if (!disposed) {
          setResult({ query, products });
          onProducts?.((previous) => [
            ...new Map(
              [...previous, ...products].map((p) => [p.id, p]),
            ).values(),
          ]);
          setKnown((previous) => ({
            ...previous,
            ...Object.fromEntries(
              products.map((product) => [product.id, product]),
            ),
          }));
        }
      } catch {
        if (!disposed) setResult({ query, products: [], error: true });
      } finally {
        clearTimeout(requestTimeout);
      }
    }, 300);
    return () => {
      disposed = true;
      clearTimeout(timer);
      clearTimeout(requestTimeout);
    };
  }, [query, onProducts]);
  function move(id: string, to: number) {
    if (disabled || to < 0 || to >= ids.length) return;
    const next = ids.filter((value) => value !== id);
    next.splice(to, 0, id);
    onChange(next);
  }
  return (
    <div className="collectionPicker">
      <label htmlFor={inputId}>
        <MagnifyingGlass size={20} aria-hidden="true" /> البحث عن منتج وإضافته
      </label>
      <input
        id={inputId}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="اسم المنتج…"
        disabled={disabled}
      />
      <p className="adminMuted">
        {ids.length} / {max} منتجات. اسحبي لترتيبها أو استخدمي الأسهم.
      </p>
      <ol
        className="collectionSelected"
        aria-label="المنتجات المختارة بالترتيب"
      >
        {ids.map((id, index) => (
          <li
            key={id}
            draggable={!disabled}
            onDragStart={() => setDragged(id)}
            onDragOver={(event) => {
              if (!disabled) event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (dragged) move(dragged, index);
              setDragged(undefined);
            }}
          >
            <CatalogImage
              src={known[id]?.image ?? "/mock-products/gift-box.svg"}
              alt=""
              width={48}
              height={48}
             transform={{ ...PRODUCT_THUMB_IMAGE, crop: 'fit' }} sizes="100px" loading="lazy" />
            <span>
              {known[id]?.name ?? "منتج غير متوفر"}
              <small>
                {known[id]?.status === "ACTIVE"
                  ? `₪${known[id]?.price}`
                  : "غير منشور — لن يظهر للزبونة"}
              </small>
            </span>
            <button
              type="button"
              className="adminBtn adminBtnSm"
              aria-label={`رفع ${known[id]?.name ?? "المنتج"}`}
              disabled={disabled || index === 0}
              onClick={() => move(id, index - 1)}
            >
              <ArrowUp size={18} />
            </button>
            <button
              type="button"
              className="adminBtn adminBtnSm"
              aria-label={`خفض ${known[id]?.name ?? "المنتج"}`}
              disabled={disabled || index === ids.length - 1}
              onClick={() => move(id, index + 1)}
            >
              <ArrowDown size={18} />
            </button>
            <button
              type="button"
              className="adminBtn adminBtnSm"
              aria-label={`إزالة ${known[id]?.name ?? "المنتج"}`}
              disabled={disabled}
              onClick={() => onChange(ids.filter((value) => value !== id))}
            >
              <X size={18} />
            </button>
          </li>
        ))}
      </ol>
      <div
        className="collectionPickerResults"
        aria-label="منتجات للإضافة"
        aria-busy={result?.query !== query}
      >
        <p role="status">
          {result?.query !== query
            ? "جارٍ البحث…"
            : result.error
              ? "تعذّر البحث. غيّري الكلمة للمحاولة مجدداً."
              : !result.products.length
                ? "لا توجد نتائج."
                : "أضيفي من النتائج التالية:"}
        </p>
        {result?.query === query &&
          result.products
            .filter(
              (product) =>
                product.id !== excludeId && !ids.includes(product.id),
            )
            .map((product) => (
              <button
                key={product.id}
                type="button"
                disabled={disabled || ids.length >= max}
                onClick={() => onChange([...ids, product.id])}
              >
                <CatalogImage src={product.image} width={44} height={44} alt=""  transform={{ ...PRODUCT_THUMB_IMAGE, crop: 'fit' }} sizes="100px" loading="lazy" />
                <span>
                  {product.name}
                  <small>
                    ₪{product.price}{" "}
                    {product.status !== "ACTIVE" ? "· غير منشور" : ""}
                  </small>
                </span>
                <b aria-hidden="true">+</b>
              </button>
            ))}
      </div>
    </div>
  );
}
