"use client";
import { selectCollectionImages } from "@/features/collections/collection-images";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CollectionCard, CollectionSymbol } from "@/components/CollectionCard";
import { CollectionProductPicker } from "./CollectionProductPicker";
import { ImageUploadButton } from "./ImageUploadButton";
import { saveCollectionAction } from "@/features/collections/collections.actions";
import { slugify } from "@/features/admin/shared/admin-format";
import {
  symbols,
  tones,
  type CollectionInput,
  type CollectionEditorData,
  type ProductOption,
} from "@/features/collections/collections.types";
const symbolLabels = {
  sparkle: "أناقة",
  gift: "هدية",
  heart: "محبة",
  flower: "عناية",
  bag: "إطلالة",
};
const toneLabels = { rose: "وردي عشتار", sand: "رملي دافئ", sage: "أخضر هادئ" };
const empty = (): CollectionInput => ({
  name: "",
  slug: "",
  description: "",
  imageUrl: "",
  symbol: "sparkle",
  tone: "rose",
  keywords: [],
  isActive: false,
  showOnHome: false,
  sortOrder: 0,
  productIds: [],
});
export function CollectionManager({
  collections,
  products,
  initialEdit,
}: {
  collections: CollectionEditorData[];
  products: ProductOption[];
  initialEdit?: string;
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<CollectionInput | null>(
    () => collections.find((c) => c.id === initialEdit) ?? null,
  );
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [listQuery, setListQuery] = useState("");
  const [previewProducts, setPreviewProducts] = useState(products);
  const [keywords, setKeywords] = useState(
    () =>
      collections.find((c) => c.id === initialEdit)?.keywords.join("، ") ?? "",
  );
  const [slugEdited, setSlugEdited] = useState(!!initialEdit);
  const heading = useRef<HTMLHeadingElement>(null);
  function open(value: CollectionInput) {
    if (
      editor &&
      !window.confirm("فتح مجموعة أخرى سيلغي التعديلات غير المحفوظة. متابعة؟")
    )
      return;
    setEditor(value);
    setKeywords(value.keywords.join("، "));
    setSlugEdited(!!value.id);
    setMessage("");
    requestAnimationFrame(() => {
      heading.current?.focus();
      heading.current?.scrollIntoView({ block: "start", behavior: "auto" });
    });
  }
  function change<K extends keyof CollectionInput>(
    key: K,
    value: CollectionInput[K],
  ) {
    setEditor((previous) => (previous ? { ...previous, [key]: value } : null));
  }
  return (
    <div>
      <div className="adminCardHeader">
        <p className="adminMuted">
          مجموعات حسب المناسبة والاهتمام. المنتج يبقى بسعره ومخزونه نفسه.
        </p>
        <button
          type="button"
          className="adminBtn adminBtnPrimary"
          disabled={pending}
          onClick={() => open(empty())}
        >
          + إضافة مجموعة
        </button>
      </div>
      {message && (
        <div className="adminAlert" role="status">
          {message}
        </div>
      )}
      {editor && (
        <form
          className="adminCard adminForm"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              try {
                const result = await saveCollectionAction({
                  ...editor,
                  keywords: keywords
                    .split(/[,،]/u)
                    .map((value) => value.trim())
                    .filter(Boolean),
                });
                if (!result.ok) setMessage(result.message);
                else {
                  setEditor(null);
                  setMessage("تم حفظ المجموعة.");
                  router.refresh();
                }
              } catch {
                setMessage(
                  "تعذّر الاتصال. تعديلاتك ما زالت هنا؛ حاولي مجدداً.",
                );
              }
            });
          }}
        >
          <h2 tabIndex={-1} ref={heading}>
            {editor.id ? "تعديل المجموعة" : "مجموعة جديدة"}
          </h2>
          <fieldset
            disabled={pending || uploading}
            className="collectionFieldset"
          >
            <div className="collectionEditorColumns">
              <div>
                <div className="adminField">
                  <label htmlFor="collection-name">اسم المجموعة</label>
                  <input
                    id="collection-name"
                    value={editor.name}
                    maxLength={80}
                    required
                    onChange={(event) => {
                      change("name", event.target.value);
                      if (!slugEdited)
                        change("slug", slugify(event.target.value));
                    }}
                  />
                </div>
                <div className="adminField">
                  <label htmlFor="collection-slug">رابط المجموعة</label>
                  <input
                    id="collection-slug"
                    value={editor.slug}
                    maxLength={100}
                    required
                    onChange={(event) => {
                      setSlugEdited(true);
                      change("slug", event.target.value);
                    }}
                  />
                  <small>
                    ثبّتي الرابط بعد النشر حتى تظل الروابط المشتركة تعمل.
                  </small>
                </div>
                <div className="adminField">
                  <label htmlFor="collection-description">وصف قصير</label>
                  <textarea
                    id="collection-description"
                    value={editor.description}
                    maxLength={500}
                    onChange={(event) =>
                      change("description", event.target.value)
                    }
                  />
                </div>
                <div className="adminField">
                  <label htmlFor="collection-image">
                    صورة الغلاف (اختيارية)
                  </label>
                  <input
                    id="collection-image"
                    value={editor.imageUrl}
                    onChange={(event) => change("imageUrl", event.target.value)}
                    placeholder="https://…"
                  />
                  <small>
                    بدون غلاف نختار صوراً متنوعة من المنتجات الظاهرة في
                    المجموعة.
                  </small>
                </div>
              </div>
              <div>
                <h3>معاينة البطاقة</h3>
                <CollectionCard
                  preview
                  collection={{
                    id: editor.id ?? "preview",
                    ...editor,
                    name: editor.name || "اسم المجموعة",
                    imageUrl: editor.imageUrl || null,
                    images: selectCollectionImages(
                      editor.productIds.flatMap((id) => {
                        const product = previewProducts.find(
                          (product) => product.id === id,
                        );
                        return product && product.status === "ACTIVE"
                          ? [product]
                          : [];
                      }),
                    ),
                    productCount: editor.productIds.length,
                  }}
                />
                <div className="adminField">
                  <label htmlFor="collection-symbol">الرمز</label>
                  <select
                    id="collection-symbol"
                    value={editor.symbol}
                    onChange={(event) =>
                      change(
                        "symbol",
                        event.target.value as CollectionInput["symbol"],
                      )
                    }
                  >
                    {symbols.map((symbol) => (
                      <option key={symbol} value={symbol}>
                        {symbolLabels[symbol]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="adminField">
                  <label htmlFor="collection-tone">اللون</label>
                  <select
                    id="collection-tone"
                    value={editor.tone}
                    onChange={(event) =>
                      change(
                        "tone",
                        event.target.value as CollectionInput["tone"],
                      )
                    }
                  >
                    {tones.map((tone) => (
                      <option key={tone} value={tone}>
                        {toneLabels[tone]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </fieldset>
          <ImageUploadButton
            kind="banner"
            label="رفع غلاف المجموعة"
            onUploadingChange={setUploading}
            onUploaded={(image) => change("imageUrl", image.secureUrl)}
          />
          <fieldset
            disabled={pending || uploading}
            className="collectionFieldset"
          >
            <div className="adminField">
              <label htmlFor="collection-keywords">
                كلمات البحث، مفصولة بفاصلة
              </label>
              <input
                id="collection-keywords"
                value={keywords}
                onChange={(event) => setKeywords(event.target.value)}
                placeholder="هدية، مناسبة، عروسة"
              />
            </div>
            <CollectionProductPicker
              onProducts={setPreviewProducts}
              ids={editor.productIds}
              onChange={(ids) => change("productIds", ids)}
              initialProducts={products}
              disabled={pending || uploading}
            />
            <div className="adminField">
              <label htmlFor="collection-order">ترتيب المجموعة</label>
              <input
                id="collection-order"
                type="number"
                min={0}
                max={9999}
                value={editor.sortOrder}
                onChange={(event) =>
                  change("sortOrder", Number(event.target.value))
                }
              />
            </div>
            <label className="adminCheck">
              <input
                type="checkbox"
                checked={editor.isActive}
                onChange={(event) => change("isActive", event.target.checked)}
              />{" "}
              منشورة للزبونة
            </label>
            <label className="adminCheck">
              <input
                type="checkbox"
                checked={editor.showOnHome}
                onChange={(event) => change("showOnHome", event.target.checked)}
              />{" "}
              عرض في الرئيسية عند النشر
            </label>
          </fieldset>
          <div className="adminBtnRow">
            <button
              className="adminBtn adminBtnPrimary"
              type="submit"
              disabled={pending || uploading}
            >
              {pending ? "جارٍ الحفظ…" : "حفظ المجموعة"}
            </button>
            <button
              type="button"
              className="adminBtn adminBtnGhost"
              disabled={pending || uploading}
              onClick={() => {
                if (window.confirm("إلغاء التعديلات غير المحفوظة؟"))
                  setEditor(null);
              }}
            >
              إلغاء
            </button>
          </div>
        </form>
      )}
      <label className="adminField">
        البحث في المجموعات
        <input
          value={listQuery}
          onChange={(event) => setListQuery(event.target.value)}
        />
      </label>
      <div className="collectionAdminGrid">
        {collections
          .filter((c) => c.name.includes(listQuery))
          .map((collection) => (
            <article className="adminCard" key={collection.id}>
              <div className="adminCardHeader">
                <CollectionSymbol symbol={collection.symbol} />
                <h2>{collection.name}</h2>
                <span className="adminBadge">
                  {collection.isActive ? "منشورة" : "مخفية"}
                </span>
              </div>
              <p>
                {collection.productIds.length} منتجات · ترتيب{" "}
                {collection.sortOrder}
                {collection.showOnHome ? " · الرئيسية" : ""}
              </p>
              <div className="adminBtnRow">
                <button
                  type="button"
                  className="adminBtn"
                  disabled={pending}
                  onClick={() => open(collection)}
                >
                  تعديل وإدارة المنتجات
                </button>
                {collection.isActive && (
                  <Link
                    className="adminBtn adminBtnGhost"
                    target="_blank"
                    href={`/collections/${encodeURIComponent(collection.slug)}`}
                  >
                    عرض المجموعة
                  </Link>
                )}
              </div>
            </article>
          ))}
      </div>
      {!collections.length && (
        <p className="adminEmptyState">ابدئي بإضافة مجموعتك الأولى.</p>
      )}
    </div>
  );
}
