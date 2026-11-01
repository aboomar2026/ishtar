'use client';
import { ProductImagePreview } from '@/components/ProductImageViewer';
import { IconPackage } from '@/components/Icons';

import { useUnsavedChanges } from './useUnsavedChanges';
import { useDialog } from '@/components/useDialog';

import { useMemo, useState, useTransition, type FormEvent } from 'react';
import { useNavigationRouter as useRouter } from '@/components/NavigationProvider';
import { createProductAction, updateProductAction, type ActionIssue } from '@/features/admin/products/product-admin.actions';
import type { ProductInput } from '@/features/admin/products/product-admin.validation';
import { slugify } from '@/features/admin/shared/admin-format';
import { ImageUploadButton } from './ImageUploadButton';
import { VariantBuilder, type VariantState } from './VariantBuilder';
import { ColorSelector, type ColorValue } from './ColorSelector';

type CategoryOption = { id: string; name: string; isActive: boolean };
type ImageState = { id?: string; url: string; alt: string; isPrimary: boolean; cloudinaryPublicId?: string };

type VariantRef = { variant: VariantState; index: number };
type ColorGroup = { key: string; colorName: string; colorValue: string; refs: VariantRef[] };
type SizeColumn = { key: string; label: string };

export type { VariantState };

export type ProductFormInitial = {
  id?: string;
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  details: string[];
  careInstructions: string;
  brand: string;
  categoryId: string;
  basePrice: number | '';
  compareAtPrice?: number;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  tags: string[];
  images: ImageState[];
  variants: VariantState[];
};

export function buildEmptyProduct(): ProductFormInitial {
  return {
    name: '', slug: '', subtitle: '', description: '', details: [],
    careInstructions: '', brand: '', categoryId: '', basePrice: '',
    status: 'DRAFT', isFeatured: false, isNewArrival: false, isBestSeller: false,
    tags: [], images: [], variants: []
  };
}

function simpleSku(value: string): string {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
  const hash = Array.from(value).reduce((h, c) => (Math.imul(h, 31) + (c.codePointAt(0) || 0)) >>> 0, 7);
  return `SIMPLE-${cleaned || 'PRODUCT'}-${hash.toString(36).toUpperCase()}`;
}

function numberOrUndefined(value: string): number | undefined {
  const t = value.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function colorKeyForVariant(variant: VariantState): string {
  return `${variant.colorValue || variant.colorName || 'no-color'}`.trim().toLowerCase();
}

function sizeKeyForVariant(variant: VariantState): string {
  return `${variant.size || 'one-size'}`.trim().toLowerCase();
}

function variantComboKey(variant: VariantState): string {
  return `${colorKeyForVariant(variant)}||${sizeKeyForVariant(variant)}`;
}

function fieldError(errorFor: (path: string) => string | undefined, index: number, field: keyof VariantState) {
  return errorFor(`variants.${index}.${String(field)}`);
}

// ── Advanced details drawer ─────────────────────────────────────────────────

type VariantAdvancedDrawerProps = {
  variant: VariantState;
  index: number;
  errorFor: (path: string) => string | undefined;
  onChange: (index: number, patch: Partial<VariantState>) => void;
  onRemove: (index: number) => void;
  onClose: () => void;
};

function VariantAdvancedDrawer({ variant, index, errorFor, onChange, onRemove, onClose }: VariantAdvancedDrawerProps) {
  const drawerRef = useDialog(true, onClose);
  return (
    <div className="variantDrawerOverlay" role="presentation">
      <div className="variantDrawer" ref={drawerRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="تفاصيل الخيار المتقدمة">
        <div className="variantDrawerHead">
          <div>
            <strong>تفاصيل الخيار</strong>
            <p className="adminMuted">{variant.colorName || 'بدون لون'} · {variant.size || 'مقاس موحد'}</p>
          </div>
          <button type="button" className="adminBtn adminBtnGhost adminBtnSm" onClick={onClose}>إغلاق</button>
        </div>

        <div className="adminRepeatGrid">
          <div className="adminField">
            <label htmlFor="product-extra-field-1">الـ SKU *</label>
            <input id="product-extra-field-1"
              className={fieldError(errorFor, index, 'sku') ? 'hasError' : ''}
              value={variant.sku}
              onChange={(event) => onChange(index, { sku: event.target.value })}
            />
            {fieldError(errorFor, index, 'sku') && <span className="adminFieldError">{fieldError(errorFor, index, 'sku')}</span>}
          </div>
          <div className="adminField">
            <label htmlFor="product-extra-field-2">المقاس</label>
            <input id="product-extra-field-2" value={variant.size} onChange={(event) => onChange(index, { size: event.target.value })} />
          </div>
          <div className="adminField">
            <label htmlFor="product-extra-field-3">السعر (₪) *</label>
            <input id="product-extra-field-3"
              className={fieldError(errorFor, index, 'price') ? 'hasError' : ''}
              type="number"
              min="0"
              step="0.01"
              value={variant.price}
              onChange={(event) => onChange(index, { price: event.target.value })}
            />
            {fieldError(errorFor, index, 'price') && <span className="adminFieldError">{fieldError(errorFor, index, 'price')}</span>}
          </div>
          <div className="adminField">
            <label htmlFor="product-extra-field-4">قبل الخصم (₪)</label>
            <input id="product-extra-field-4" type="number" min="0" step="0.01" value={variant.compareAtPrice} onChange={(event) => onChange(index, { compareAtPrice: event.target.value })} />
          </div>
          <div className="adminField">
            <label htmlFor="product-extra-field-5">الكمية *</label>
            <input id="product-extra-field-5"
              className={fieldError(errorFor, index, 'quantity') ? 'hasError' : ''}
              type="number"
              min="0"
              step="1"
              value={variant.quantity}
              onChange={(event) => onChange(index, { quantity: event.target.value })}
            />
            {fieldError(errorFor, index, 'quantity') && <span className="adminFieldError">{fieldError(errorFor, index, 'quantity')}</span>}
          </div>
          <div className="adminField">
            <label htmlFor="product-extra-field-6">حد المخزون المنخفض</label>
            <input id="product-extra-field-6" type="number" min="0" step="1" value={variant.lowStockThreshold} onChange={(event) => onChange(index, { lowStockThreshold: event.target.value })} />
          </div>
        </div>

        <div className="adminField" style={{ marginTop: 12 }}>
          <label>اللون</label>
          <ColorSelector
            colorName={variant.colorName}
            colorValue={variant.colorValue}
            onChange={(value: ColorValue) => onChange(index, { colorName: value.colorName, colorValue: value.colorValue })}
          />
        </div>

        <div className="variantDrawerActions">
          <label className={`adminCheck${variant.isActive ? ' isOn' : ''}`}>
            <input type="checkbox" checked={variant.isActive} onChange={(event) => onChange(index, { isActive: event.target.checked })} />
            {variant.isActive ? 'الخيار نشط' : 'الخيار معطّل'}
          </label>
          <button type="button" className="adminBtn adminBtnDanger adminBtnSm" onClick={() => { onRemove(index); onClose(); }}>
            {variant.id ? 'تعطيل الخيار وحفظ تاريخه' : 'إزالة الخيار'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Compact matrix ──────────────────────────────────────────────────────────

type VariantMatrixProps = {
  groups: ColorGroup[];
  sizes: SizeColumn[];
  errorFor: (path: string) => string | undefined;
  onChange: (index: number, patch: Partial<VariantState>) => void;
  onEdit: (index: number) => void;
  onApplyQuantityToColor: (colorKey: string) => void;
  onApplyQuantityToSize: (sizeKey: string) => void;
};

function VariantCell({ refItem, errorFor, onChange, onEdit }: {
  refItem?: VariantRef;
  errorFor: (path: string) => string | undefined;
  onChange: (index: number, patch: Partial<VariantState>) => void;
  onEdit: (index: number) => void;
}) {
  if (!refItem) return <span className="vmMissingCell">—</span>;

  const { variant, index } = refItem;
  const quantity = numberOrUndefined(variant.quantity) ?? 0;
  const quantityError = fieldError(errorFor, index, 'quantity');

  return (
    <div className={`vmCell${variant.isActive ? '' : ' isInactive'}`}>
      <input
        aria-label={`كمية ${variant.colorName || 'بدون لون'} ${variant.size || 'مقاس موحد'}`}
        className={quantityError ? 'hasError' : ''}
        type="number"
        min="0"
        step="1"
        value={variant.quantity}
        onChange={(event) => onChange(index, { quantity: event.target.value })}
      />
      <div className="vmCellMeta">
        <label className={`vmTinyToggle${variant.isActive ? ' isOn' : ''}`}>
          <input type="checkbox" checked={variant.isActive} onChange={(event) => onChange(index, { isActive: event.target.checked })} />
          {variant.isActive ? 'نشط' : 'معطّل'}
        </label>
        {quantity === 0 && variant.isActive && <span className="vmStockWarn">0</span>}
      </div>
      <button type="button" className="vmEditBtn" onClick={() => onEdit(index)}>تعديل</button>
      {quantityError && <span className="adminFieldError">{quantityError}</span>}
    </div>
  );
}

function VariantMatrix({ groups, sizes, errorFor, onChange, onEdit, onApplyQuantityToColor, onApplyQuantityToSize }: VariantMatrixProps) {
  return (
    <>
      <div className="vmDesktopMatrix" role="region" aria-label="جدول خيارات المنتج">
        <table className="vmTable">
          <thead>
            <tr>
              <th>اللون</th>
              {sizes.map((size) => (
                <th key={size.key}>
                  <span>{size.label}</span>
                  <button type="button" className="vmHeaderAction" onClick={() => onApplyQuantityToSize(size.key)}>تطبيق على هذا المقاس</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.key}>
                <th scope="row">
                  <div className="vmColorHead">
                    {group.colorValue && <span className="colorPreviewCircle sm" style={{ background: group.colorValue }} aria-hidden="true" />}
                    <span>{group.colorName || 'بدون لون'}</span>
                    <button type="button" className="vmHeaderAction" onClick={() => onApplyQuantityToColor(group.key)}>تطبيق على هذا اللون</button>
                  </div>
                </th>
                {sizes.map((size) => {
                  const refItem = group.refs.find((item) => sizeKeyForVariant(item.variant) === size.key);
                  return (
                    <td key={`${group.key}-${size.key}`}>
                      <VariantCell refItem={refItem} errorFor={errorFor} onChange={onChange} onEdit={onEdit} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="vmMobileMatrix" aria-label="خيارات المنتج للموبايل">
        {groups.map((group) => (
          <section key={group.key} className="vmMobileGroup">
            <div className="vmMobileGroupHead">
              <div>
                {group.colorValue && <span className="colorPreviewCircle sm" style={{ background: group.colorValue }} aria-hidden="true" />}
                <strong>{group.colorName || 'بدون لون'}</strong>
                <span className="adminMuted">{group.refs.length} خيارات</span>
              </div>
              <button type="button" className="adminBtn adminBtnGhost adminBtnSm" onClick={() => onApplyQuantityToColor(group.key)}>تطبيق على هذا اللون</button>
            </div>
            <div className="vmMobileCards">
              {group.refs.map((refItem) => (
                <article key={refItem.variant.id ?? `${group.key}-${refItem.index}`} className={`vmMobileCard${refItem.variant.isActive ? '' : ' isInactive'}`}>
                  <div className="vmMobileCardTitle">
                    <strong>{refItem.variant.size || 'مقاس موحد'}</strong>
                    {refItem.variant.quantity === '0' && refItem.variant.isActive && <span className="adminBadge stockOut">صفر</span>}
                  </div>
                  <VariantCell refItem={refItem} errorFor={errorFor} onChange={onChange} onEdit={onEdit} />
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

// ── ProductForm ─────────────────────────────────────────────────────────────

export function ProductForm({ mode, productId, categories, initial }: {
  mode: 'create' | 'edit';
  productId?: string;
  categories: CategoryOption[];
  initial: ProductFormInitial;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [slugEdited, setSlugEdited] = useState(mode === 'edit');
  const [subtitle, setSubtitle] = useState(initial.subtitle);
  const [description, setDescription] = useState(initial.description);
  const [details, setDetails] = useState(initial.details.join('\n'));
  const [careInstructions, setCareInstructions] = useState(initial.careInstructions);
  const [brand, setBrand] = useState(initial.brand);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [basePrice, setBasePrice] = useState(initial.basePrice === '' ? '' : String(initial.basePrice));
  const [keepVariantPrices, setKeepVariantPrices] = useState(false);
  const [compareAtPrice, setCompareAtPrice] = useState(initial.compareAtPrice != null ? String(initial.compareAtPrice) : '');
  const [status, setStatus] = useState(initial.status);
  const [isFeatured, setIsFeatured] = useState(initial.isFeatured);
  const [isNewArrival, setIsNewArrival] = useState(initial.isNewArrival);
  const [isBestSeller, setIsBestSeller] = useState(initial.isBestSeller);
  const [tags, setTags] = useState(initial.tags.join(', '));
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<ImageState[]>(initial.images);
  const [variants, setVariants] = useState<VariantState[]>(initial.variants);
  const initialSimple = initial.variants.filter(v => v.isActive).length <= 1 &&
    initial.variants.every(v => !v.colorName && !v.colorValue && !v.size);
  const [productType, setProductType] = useState<'simple' | 'variable'>(initialSimple ? 'simple' : 'variable');
  const stockVariant = initial.variants.find(v => v.isActive);
  const [simpleSkuValue, setSimpleSkuValue] = useState(stockVariant?.sku ?? '');
  const [simpleQuantity, setSimpleQuantity] = useState(stockVariant?.quantity ?? '0');
  const [simpleThreshold, setSimpleThreshold] = useState(stockVariant?.lowStockThreshold ?? '5');

  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [showBuilder, setShowBuilder] = useState(true);
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
  const [bulkQuantity, setBulkQuantity] = useState('');

  const errorFor = (path: string) => issues[path];

  const activeVariants = useMemo(() => variants.filter((variant) => variant.isActive), [variants]);
  const activeCount = activeVariants.length;
  const totalCount = variants.length;
  const outOfStockCount = useMemo(
    () => activeVariants.filter((variant) => (numberOrUndefined(variant.quantity) ?? 0) === 0).length,
    [activeVariants]
  );
  const allActiveVariantsOutOfStock = activeVariants.length > 0 && outOfStockCount === activeVariants.length;

  const variantGroups = useMemo<ColorGroup[]>(() => {
    const map = new Map<string, ColorGroup>();
    variants.forEach((variant, index) => {
      const key = colorKeyForVariant(variant);
      const existing = map.get(key);
      if (existing) {
        existing.refs.push({ variant, index });
      } else {
        map.set(key, {
          key,
          colorName: variant.colorName || 'بدون لون',
          colorValue: variant.colorValue,
          refs: [{ variant, index }]
        });
      }
    });
    return Array.from(map.values());
  }, [variants]);

  const sizeColumns = useMemo<SizeColumn[]>(() => {
    const map = new Map<string, SizeColumn>();
    variants.forEach((variant) => {
      const key = sizeKeyForVariant(variant);
      if (!map.has(key)) map.set(key, { key, label: variant.size || 'مقاس موحد' });
    });
    return Array.from(map.values());
  }, [variants]);

  const duplicateActiveComboCount = useMemo(() => {
    const seen = new Set<string>();
    let duplicates = 0;
    activeVariants.forEach((variant) => {
      const key = variantComboKey(variant);
      if (seen.has(key)) duplicates += 1;
      else seen.add(key);
    });
    return duplicates;
  }, [activeVariants]);

  function onNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  function updateVariant(index: number, patch: Partial<VariantState>) {
    setVariants((prev) => prev.map((variant, i) => i === index ? { ...variant, ...patch } : variant));
  }

  function removeVariant(index: number) {
    const variant = variants[index];
    if (variant.id) updateVariant(index, { isActive: false });
    else setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function addManualVariant() {
    setVariants((prev) => [
      ...prev,
      { sku: '', colorName: '', colorValue: '', size: '', price: basePrice, compareAtPrice, quantity: '1', lowStockThreshold: '5', isActive: true }
    ]);
  }

  function handleGenerate(newVariants: VariantState[]) {
    setVariants((prev) => {
      const existingKeys = new Set(prev.map(variantComboKey));
      const uniqueNew = newVariants.filter((variant) => {
        const key = variantComboKey(variant);
        if (existingKeys.has(key)) return false;
        existingKeys.add(key);
        return true;
      });
      return [...prev, ...uniqueNew];
    });
  }

  const activePrices = variants.filter(variant => variant.isActive);
  const priceMismatch = productType === 'variable' && activePrices.some(variant =>
    Number(variant.price) !== Number(basePrice) ||
    (variant.compareAtPrice === '' ? (compareAtPrice === '' ? undefined : Number(compareAtPrice)) : Number(variant.compareAtPrice)) !==
      (compareAtPrice === '' ? undefined : Number(compareAtPrice))
  );
  const purchasablePrices = activePrices.filter(variant => Number(variant.quantity) > 0);
  const storefrontPrice = Math.min(...(purchasablePrices.length ? purchasablePrices : activePrices).map(variant => Number(variant.price)));

  function applyProductPriceToAllVariants() {
    setKeepVariantPrices(false);
    setFormMessage(null);
    setVariants((prev) => prev.map((variant) => ({ ...variant, price: basePrice, compareAtPrice })));
  }

  function getValidBulkQuantity(): string | null {
    const trimmed = bulkQuantity.trim();
    const quantity = Number(trimmed);
    if (trimmed === '' || !Number.isInteger(quantity) || quantity < 0) {
      setFormMessage('أدخل كمية صحيحة لا تقل عن صفر قبل استخدام أدوات تطبيق الكمية.');
      return null;
    }
    setFormMessage(null);
    return trimmed;
  }

  function applyQuantityToAllVariants() {
    const quantity = getValidBulkQuantity();
    if (quantity == null) return;
    setVariants((prev) => prev.map((variant) => ({ ...variant, quantity })));
  }

  function applyQuantityToColor(colorKey: string) {
    const quantity = getValidBulkQuantity();
    if (quantity == null) return;
    setVariants((prev) => prev.map((variant) => colorKeyForVariant(variant) === colorKey ? { ...variant, quantity } : variant));
  }

  function applyQuantityToSize(sizeKey: string) {
    const quantity = getValidBulkQuantity();
    if (quantity == null) return;
    setVariants((prev) => prev.map((variant) => sizeKeyForVariant(variant) === sizeKey ? { ...variant, quantity } : variant));
  }

  function setPrimaryImage(index: number) {
    setImages((prev) => prev.map((img, i) => ({ ...img, isPrimary: i === index })));
  }

  function updateImage(index: number, patch: Partial<ImageState>) {
    setImages((prev) => prev.map((img, i) => i === index ? { ...img, ...patch } : img));
  }

  function addUploadedImage(image: { secureUrl: string; publicId: string }) {
    setImages((prev) => [
      ...prev,
      { url: image.secureUrl, alt: '', isPrimary: prev.length === 0, cloudinaryPublicId: image.publicId }
    ]);
  }

  function buildPayload(): ProductInput {
    const existing = variants.find(v => v.isActive);
    const simple: VariantState = {
      id: existing?.id, sku: simpleSkuValue.trim() || simpleSku(slug || name),
      colorName: '', colorValue: '', size: '', price: basePrice, compareAtPrice,
      quantity: simpleQuantity, lowStockThreshold: simpleThreshold, isActive: true
    };
    const payloadVariants = productType === 'simple' ? [simple] : variants;
    return {
      name: name.trim(),
      slug: slug.trim(),
      subtitle: subtitle.trim() || undefined,
      description: description.trim(),
      details: details.split('\n').map((line) => line.trim()).filter(Boolean),
      careInstructions: careInstructions.trim() || undefined,
      brand: brand.trim() || undefined,
      categoryId,
      basePrice: numberOrUndefined(basePrice) ?? Number.NaN,
      compareAtPrice: numberOrUndefined(compareAtPrice),
      status,
      isFeatured,
      isNewArrival,
      isBestSeller,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      images: images.map((img, i) => ({
        id: img.id,
        url: img.url.trim(),
        alt: img.alt.trim() || undefined,
        sortOrder: i,
        isPrimary: img.isPrimary,
        cloudinaryPublicId: img.cloudinaryPublicId?.trim() || undefined
      })),
      variants: payloadVariants.map((variant) => ({
        id: variant.id,
        sku: variant.sku.trim(),
        colorName: variant.colorName.trim() || undefined,
        colorValue: variant.colorValue.trim() || undefined,
        size: variant.size.trim() || undefined,
        price: numberOrUndefined(variant.price) ?? Number.NaN,
        compareAtPrice: numberOrUndefined(variant.compareAtPrice),
        quantity: numberOrUndefined(variant.quantity) ?? 0,
        lowStockThreshold: numberOrUndefined(variant.lowStockThreshold) ?? 0,
        isActive: variant.isActive
      }))
    };
  }

  function changeProductType(next: 'simple' | 'variable') {
    if (next === productType) return;
    if (next === 'simple' && (variants.length > 1 || variants.some(v => v.colorName || v.colorValue || v.size))) {
      setFormMessage('لا يمكن التحويل تلقائياً ما دام هناك خيارات متعددة أو ألوان أو مقاسات. احتفظ بها لحماية سجلات الطلبات والمخزون.');
      return;
    }
    setFormMessage(null);
    setProductType(next);
    if (next === 'variable' && !variants.some(v => v.id)) setVariants([]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (priceMismatch && !keepVariantPrices) {
      setFormMessage('أسعار الخيارات تختلف عن السعر الأساسي. طبّق السعر على كل الخيارات أو أكّد الاحتفاظ بأسعار مختلفة قبل الحفظ.');
      return;
    }
    if (uploading) { setFormMessage('انتظر اكتمال رفع الصورة قبل الحفظ.'); return; }
    setFormMessage(null);
    setIssues({});
    const payload = buildPayload();

    startTransition(async () => {
      const result = mode === 'create'
        ? await createProductAction(payload)
        : await updateProductAction(productId as string, payload);

      if (result && !result.ok) {
        setFormMessage(result.message);
        const map: Record<string, string> = {};
        result.issues.forEach((issue: ActionIssue) => { map[issue.path] = issue.message; });
        setIssues(map);
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  const editingVariant = editingVariantIndex != null ? variants[editingVariantIndex] : undefined;

  const dirty = useUnsavedChanges(JSON.stringify(buildPayload()), pending);
  return (
    <form className="adminForm" onSubmit={handleSubmit}>
      {dirty && <p className="adminAlert isInfo" role="status">لديك تعديلات غير محفوظة.</p>}
      {formMessage && <div className="adminAlert isError" role="alert">{formMessage}</div>}
      {status === 'ACTIVE' && activeCount === 0 && <div className="adminAlert isInfo">يحتاج المنتج النشط إلى خيار نشط واحد على الأقل قبل أن يُحفظ.</div>}
      {status === 'ACTIVE' && allActiveVariantsOutOfStock && <div className="adminAlert isInfo">كل الخيارات النشطة كميتها صفر، سيظهر المنتج كغير متوفر.</div>}
      {duplicateActiveComboCount > 0 && <div className="adminAlert isError">لا يمكن تكرار نفس اللون والمقاس أكثر من مرة في الخيارات النشطة.</div>}

      <div className="adminCard">
        <div className="adminCardHeader"><h2>أساسيات المنتج</h2></div>
        <div className="adminFormGrid two">
          <div className="adminField">
            <label htmlFor="p-name">اسم المنتج *</label>
            <input id="p-name" className={errorFor('name') ? 'hasError' : ''} value={name} onChange={(event) => onNameChange(event.target.value)} required />
            {errorFor('name') && <span className="adminFieldError">{errorFor('name')}</span>}
          </div>
          <div className="adminField">
            <label htmlFor="p-slug">الرابط المختصر *</label>
            <input
              id="p-slug"
              dir="ltr"
              className={errorFor('slug') ? 'hasError' : ''}
              value={slug}
              onChange={(event) => { setSlugEdited(true); setSlug(slugify(event.target.value)); }}
              required
            />
            {errorFor('slug') ? <span className="adminFieldError">{errorFor('slug')}</span> : <span className="adminFieldHint">يُعبّأ تلقائياً من الاسم، ويمكن تعديله يدوياً.</span>}
          </div>
          <div className="adminField">
            <label htmlFor="p-subtitle">عنوان قصير</label>
            <input id="p-subtitle" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} />
          </div>
          <div className="adminField spanTwo">
            <label htmlFor="p-description">الوصف *</label>
            <textarea id="p-description" className={errorFor('description') ? 'hasError' : ''} value={description} onChange={(event) => setDescription(event.target.value)} required />
            {errorFor('description') && <span className="adminFieldError">{errorFor('description')}</span>}
          </div>
          <div className="adminField">
            <label htmlFor="p-details">التفاصيل (واحدة في كل سطر)</label>
            <textarea id="p-details" value={details} onChange={(event) => setDetails(event.target.value)} placeholder={'خامة ناعمة\nجاهز كهدية'} />
          </div>
          <div className="adminField">
            <label htmlFor="p-care">تعليمات العناية</label>
            <textarea id="p-care" value={careInstructions} onChange={(event) => setCareInstructions(event.target.value)} />
          </div>
          <div className="adminField">
            <label htmlFor="p-brand">العلامة التجارية</label>
            <input id="p-brand" value={brand} onChange={(event) => setBrand(event.target.value)} />
          </div>
          <div className="adminField">
            <label htmlFor="p-tags">الوسوم (مفصولة بفواصل)</label>
            <input id="p-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="هدية، صيف" />
          </div>
        </div>
      </div>

      <div className="adminCard">
        <div className="adminCardHeader"><h2>التسعير والحالة</h2></div>
        <div className="adminFormGrid two">
          <div className="adminField">
            <label htmlFor="p-category">التصنيف *</label>
            <select id="p-category" className={errorFor('categoryId') ? 'hasError' : ''} value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>
              <option value="">اختر تصنيفاً…</option>
              {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}{cat.isActive ? '' : ' (معطّل)'}</option>)}
            </select>
            {errorFor('categoryId') && <span className="adminFieldError">{errorFor('categoryId')}</span>}
          </div>
          <div className="adminField">
            <label htmlFor="p-status">الحالة *</label>
            <select id="p-status" className={errorFor('status') ? 'hasError' : ''} value={status} onChange={(event) => setStatus(event.target.value as ProductFormInitial['status'])}>
              <option value="DRAFT">مسودة</option>
              <option value="ACTIVE">نشط</option>
              <option value="ARCHIVED">مؤرشف</option>
            </select>
            {errorFor('status') && <span className="adminFieldError">{errorFor('status')}</span>}
          </div>
          <div className="adminField">
            <label htmlFor="p-baseprice">السعر الأساسي (₪) *</label>
            <input id="p-baseprice" className={errorFor('basePrice') ? 'hasError' : ''} type="number" min="0" step="0.01" value={basePrice} onChange={(event) => { setBasePrice(event.target.value); setKeepVariantPrices(false); }} required />
            {errorFor('basePrice') && <span className="adminFieldError">{errorFor('basePrice')}</span>}
          </div>
          <div className="adminField">
            <label htmlFor="p-compareprice">السعر قبل الخصم (₪)</label>
            <input id="p-compareprice" className={errorFor('compareAtPrice') ? 'hasError' : ''} type="number" min="0" step="0.01" value={compareAtPrice} onChange={(event) => { setCompareAtPrice(event.target.value); setKeepVariantPrices(false); }} />
            {errorFor('compareAtPrice') && <span className="adminFieldError">{errorFor('compareAtPrice')}</span>}
          </div>
        </div>
        {productType === 'variable' && (
          <div className="adminAlert isInfo" role="status">
            <p>سعر المتجر والطلب يؤخذ من خيارات اللون والمقاس، وليس من السعر الأساسي وحده.</p>
            {activePrices.length > 0 && <p>سعر المتجر بعد الحفظ حسب الخيارات: {storefrontPrice} ₪</p>}
            <button type="button" className="adminBtn adminBtnGhost" onClick={applyProductPriceToAllVariants}>تطبيق السعر على كل الخيارات</button>
            {priceMismatch && (
              <>
                <p>تنبيه: أسعار الخيارات تختلف عن السعر الأساسي أو السعر قبل الخصم.</p>
                <label className="adminCheck">
                  <input type="checkbox" checked={keepVariantPrices} onChange={event => setKeepVariantPrices(event.target.checked)} />
                  أريد الاحتفاظ بأسعار مختلفة للخيارات
                </label>
              </>
            )}
          </div>
        )}
        <div className="adminCheckRow" style={{ marginTop: 13 }}>
          <label className={`adminCheck${isFeatured ? ' isOn' : ''}`}><input type="checkbox" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} /> مميز</label>
          <label className={`adminCheck${isNewArrival ? ' isOn' : ''}`}><input type="checkbox" checked={isNewArrival} onChange={(event) => setIsNewArrival(event.target.checked)} /> وصل حديثاً</label>
          <label className={`adminCheck${isBestSeller ? ' isOn' : ''}`}><input type="checkbox" checked={isBestSeller} onChange={(event) => setIsBestSeller(event.target.checked)} /> الأكثر مبيعاً</label>
        </div>
      </div>

      <div className="adminCard">
        <div className="adminCardHeader">
          <div><h2>الصور</h2><p className="adminMuted">ارفعي صورة من جهازك أو أدخلي رابط الصورة يدوياً. الصورة الرئيسية تظهر أولاً.</p></div>
          <div className="adminBtnRow">
            <ImageUploadButton kind="product" onUploadingChange={setUploading} onUploaded={addUploadedImage} label="رفع صورة" />
            <button type="button" className="adminBtn adminBtnGhost adminBtnSm" onClick={() => setImages((prev) => [...prev, { url: '', alt: '', isPrimary: prev.length === 0 }])}>+ رابط صورة</button>
          </div>
        </div>
        {errorFor('images') && <div className="adminAlert isError" style={{ marginBottom: 10 }}>{errorFor('images')}</div>}
        {images.length === 0 ? (
          <div className="adminEmptyState">لا توجد صور بعد. سيستخدم المتجر صورة افتراضية.</div>
        ) : (
          images.map((image, index) => (
            <div className="adminRepeatRow" key={index}>
              <div className="adminRepeatHeader">
                <strong>صورة {index + 1}{image.cloudinaryPublicId ? ' · Cloudinary' : ''}</strong>
                <button type="button" className="adminBtn adminBtnDanger adminBtnSm" onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}>حذف الصورة</button>
              </div>
              <div className="adminImageRow">
                {image.url ? <ProductImagePreview imageClassName="adminImagePreview" title={name || 'المنتج'} initialIndex={index} images={images.map((entry, position) => ({ ...entry, id: entry.id ?? `image-${position}`, sortOrder: position }))} /> : <div className="adminImagePreview adminImagePreviewEmpty" aria-hidden="true">لا معاينة</div>}
                <div className="adminRepeatGrid" style={{ flex: 1, minWidth: 0 }}>
                  <div className="adminField">
                    <label htmlFor={`product-image-url-${index}`}>رابط الصورة *</label>
            <input id={`product-image-url-${index}`} className={errorFor(`images.${index}.url`) ? 'hasError' : ''} value={image.url} onChange={(event) => updateImage(index, { url: event.target.value })} placeholder="/mock-products/bag-camel.svg" />
                    {errorFor(`images.${index}.url`) && <span className="adminFieldError">{errorFor(`images.${index}.url`)}</span>}
                  </div>
                  <div className="adminField">
                    <label htmlFor={`product-image-alt-${index}`}>النص البديل</label>
            <input id={`product-image-alt-${index}`} value={image.alt} onChange={(event) => updateImage(index, { alt: event.target.value })} />
                  </div>
                </div>
              </div>
              <label className={`adminCheck${image.isPrimary ? ' isOn' : ''}`} style={{ width: 'fit-content' }}>
                <input type="radio" name="primaryImage" checked={image.isPrimary} onChange={() => setPrimaryImage(index)} /> الصورة الرئيسية
              </label>
            </div>
          ))
        )}
      </div>

      <div className="adminCard">
        <h2>نوع المنتج</h2>
        <p className="adminMuted">تظل جميع خصائص المنتج والصور والتصنيفات متاحة في الحالتين؛ الاختلاف فقط في إدارة المخزون والخيارات.</p>
        <div className="adminBtnRow" role="group" aria-label="نوع المنتج">
          <label className="adminCheck"><input type="radio" name="productType" checked={productType === 'simple'} onChange={() => changeProductType('simple')} /> منتج بسيط — بدون لون أو مقاس</label>
          <label className="adminCheck"><input type="radio" name="productType" checked={productType === 'variable'} onChange={() => changeProductType('variable')} /> منتج متعدد الخيارات</label>
        </div>
      </div>
      {productType === 'simple' ? (
        <div className="adminCard">
          <h2>المخزون والرقم التعريفي</h2>
          <p className="adminMuted">يُستخدم السعر الأساسي للمنتج أعلاه، وتُسجَّل الكمية ضمن خيار مخزون داخلي واحد دون لون أو مقاس.</p>
          <div className="adminRepeatGrid">
            <div className="adminField"><label htmlFor="simple-sku">SKU (اختياري — يولد تلقائياً)</label><input id="simple-sku" value={simpleSkuValue} placeholder={simpleSku(slug || name)} onChange={e => setSimpleSkuValue(e.target.value)} />
              {errorFor('variants.0.sku') && <span className="adminFieldError">{errorFor('variants.0.sku')}</span>}</div>
            <div className="adminField"><label htmlFor="simple-quantity">الكمية *</label><input id="simple-quantity" type="number" min="0" step="1" value={simpleQuantity} onChange={e => setSimpleQuantity(e.target.value)} />
              {errorFor('variants.0.quantity') && <span className="adminFieldError">{errorFor('variants.0.quantity')}</span>}</div>
            <div className="adminField"><label htmlFor="simple-threshold">حد تنبيه المخزون المنخفض</label><input id="simple-threshold" type="number" min="0" step="1" value={simpleThreshold} onChange={e => setSimpleThreshold(e.target.value)} /></div>
          </div>
        </div>
      ) : (<>
      <div className="adminCard">
        <div className="adminCardHeader">
          <div>
            <h2>منشئ الخيارات</h2>
            <p className="adminMuted">اختر ألواناً ومقاسات متعددة، ثم ولّد الخيارات الناقصة فقط.</p>
          </div>
          <button type="button" className="adminBtn adminBtnGhost adminBtnSm" onClick={() => setShowBuilder((value) => !value)}>
            {showBuilder ? 'طي المنشئ' : 'فتح المنشئ'}
          </button>
        </div>
        {showBuilder && (
          <VariantBuilder productSlug={slug || name} basePrice={basePrice} baseCompareAtPrice={compareAtPrice} existingVariants={variants} onGenerate={handleGenerate} />
        )}
      </div>

      <div className="adminCard">
        <div className="adminCardHeader vmCardHeaderCompact">
          <div>
            <h2>الخيارات الناتجة</h2>
            <p className="vmSummary">
              {variantGroups.length > 0 ? `${variantGroups.length} ألوان · ` : ''}
              {sizeColumns.length > 0 ? `${sizeColumns.length} مقاسات · ` : ''}
              {totalCount} خيار · {activeCount} نشط
              {outOfStockCount > 0 ? ` · ${outOfStockCount} كميتها صفر` : ''}
            </p>
          </div>
          <div className="adminBtnRow">
            <button type="button" className="adminBtn adminBtnGhost adminBtnSm" onClick={applyProductPriceToAllVariants}>تطبيق سعر المنتج على كل الخيارات</button>
            <button type="button" className="adminBtn adminBtnGhost adminBtnSm" onClick={addManualVariant}>+ إضافة يدوي</button>
          </div>
        </div>

        <div className="variantBuilderNoteBox vmPersistenceNote">
          <strong>ملاحظة مهمة</strong>
          <p className="adminMuted">كل لون + مقاس يتم حفظه كخيار مستقل حتى يتم تتبع المخزون والطلبات بدقة. عند إزالة خيار محفوظ سابقاً سيتم تعطيله فقط حتى تبقى الطلبات والفواتير وسجلات المخزون آمنة.</p>
        </div>

        <div className="vmBulkTools">
          <div className="adminField">
            <label htmlFor="product-extra-field-9">كمية للتطبيق السريع</label>
            <input id="product-extra-field-9" type="number" min="0" step="1" value={bulkQuantity} onChange={(event) => setBulkQuantity(event.target.value)} placeholder="مثال: 10" />
          </div>
          <button type="button" className="adminBtn adminBtnGhost adminBtnSm" onClick={applyQuantityToAllVariants}>تطبيق الكمية على كل الخيارات</button>
          <span className="adminMuted">يمكن أيضاً تطبيقها من عنوان اللون أو المقاس داخل الجدول.</span>
        </div>

        {errorFor('variants') && <div className="adminAlert isError" style={{ marginBottom: 10 }}>{errorFor('variants')}</div>}
        {outOfStockCount > 0 && <div className="adminAlert isInfo">تنبيه: {outOfStockCount} خيارات نشطة كميتها صفر.</div>}

        {variants.length === 0 ? (
          <div className="adminEmptyState">
            <span className="adminEmptyIcon"><IconPackage size={40} /></span>
            <strong className="adminEmptyTitle">لا توجد خيارات بعد</strong>
            <p className="adminEmptyDesc">استخدم منشئ الخيارات أعلاه لتوليد مجموعة ألوان ومقاسات، أو أضف خياراً يدوياً.</p>
          </div>
        ) : (
          <VariantMatrix
            groups={variantGroups}
            sizes={sizeColumns}
            errorFor={errorFor}
            onChange={updateVariant}
            onEdit={setEditingVariantIndex}
            onApplyQuantityToColor={applyQuantityToColor}
            onApplyQuantityToSize={applyQuantityToSize}
          />
        )}
      </div>

      </>)}

      <div className="adminBtnRow">
        <button type="submit" className="adminBtn adminBtnPrimary" disabled={pending || uploading}>
          {pending ? 'جارٍ الحفظ…' : mode === 'create' ? 'إنشاء المنتج' : 'حفظ التغييرات'}
        </button>
        <button type="button" className="adminBtn adminBtnGhost" disabled={pending} onClick={() => { if (!dirty || window.confirm('تجاهل التعديلات غير المحفوظة؟')) router.push('/admin/products'); }}>إلغاء</button>
      </div>

      {editingVariant && editingVariantIndex != null && (
        <VariantAdvancedDrawer
          variant={editingVariant}
          index={editingVariantIndex}
          errorFor={errorFor}
          onChange={updateVariant}
          onRemove={removeVariant}
          onClose={() => setEditingVariantIndex(null)}
        />
      )}
    </form>
  );
}
