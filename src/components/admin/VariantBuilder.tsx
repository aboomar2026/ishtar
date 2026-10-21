'use client';

import { useEffect, useMemo, useState } from 'react';
import { ColorSelector, COLOR_PRESETS, type ColorValue } from './ColorSelector';

// ── Types ────────────────────────────────────────────────────────────────────

export type BuilderColor = { colorName: string; colorValue: string };

export type VariantState = {
  id?: string;
  sku: string;
  colorName: string;
  colorValue: string;
  size: string;
  price: string;
  compareAtPrice: string;
  quantity: string;
  lowStockThreshold: string;
  isActive: boolean;
};

const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '37', '38', '39', '40', '41', '42', 'One Size'];

// ── SKU generation ───────────────────────────────────────────────────────────

const ARABIC_TO_EN: Record<string, string> = {
  'أحمر': 'red', 'احمر': 'red', 'أسود': 'black', 'اسود': 'black',
  'أبيض': 'white', 'ابيض': 'white', 'بيج': 'beige', 'بني': 'brown',
  'جملي': 'camel', 'وردي': 'pink', 'أزرق': 'blue', 'ازرق': 'blue',
  'أخضر': 'green', 'اخضر': 'green', 'ذهبي': 'gold', 'فضي': 'silver',
  'رمادي': 'gray', 'كحلي': 'navy', 'زيتي': 'olive', 'برتقالي': 'orange',
  'مقاس موحد': 'one-size', 'موحد': 'one-size', 'صغير': 'small',
  'وسط': 'medium', 'كبير': 'large', 'xlarge': 'xl', 'one size': 'one-size',
};

function slugForSku(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  const mapped = ARABIC_TO_EN[trimmed];
  if (mapped) return mapped;
  return trimmed
    .toLowerCase()
    .replace(/[؀-ۿ]+/g, (m) => ARABIC_TO_EN[m] || '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateSku(productSlug: string, colorName: string, size: string, usedSkus: Set<string>): string {
  const colorPart = slugForSku(colorName) || 'color';
  const sizePart  = slugForSku(size) || 'one-size';
  const productPart = slugForSku(productSlug) || productSlug.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'product';
  const base = [productPart, colorPart, sizePart]
    .filter(Boolean)
    .join('-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'variant';

  let candidate = base;
  let n = 2;
  while (usedSkus.has(candidate.toLowerCase())) candidate = `${base}-${n++}`;
  return candidate;
}

// ── Component ────────────────────────────────────────────────────────────────

type Props = {
  productSlug: string;
  basePrice: string;
  baseCompareAtPrice: string;
  existingVariants: VariantState[];
  onGenerate: (newVariants: VariantState[]) => void;
};

function colorKey(color: BuilderColor): string {
  return `${color.colorValue || color.colorName}`.trim().toLowerCase();
}

export function VariantBuilder({ productSlug, basePrice, baseCompareAtPrice, existingVariants, onGenerate }: Props) {
  const [colors, setColors] = useState<BuilderColor[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [sizeInput, setSizeInput] = useState('');
  const [defaultPrice, setDefaultPrice] = useState(basePrice);
  const [defaultCompareAtPrice, setDefaultCompareAtPrice] = useState(baseCompareAtPrice);
  const [defaultQuantity, setDefaultQuantity] = useState('1');
  const [defaultThreshold, setDefaultThreshold] = useState('5');
  const [customColor, setCustomColor] = useState<ColorValue>({ colorName: '', colorValue: '#C19A6B' });
  const [showCustomColor, setShowCustomColor] = useState(false);
  const [generateError, setGenerateError] = useState('');

  useEffect(() => { setDefaultPrice(basePrice); }, [basePrice]);
  useEffect(() => { setDefaultCompareAtPrice(baseCompareAtPrice); }, [baseCompareAtPrice]);

  const existingComboKeys = useMemo(() => new Set(
    existingVariants.map((v) => `${(v.colorValue || v.colorName).trim().toLowerCase()}||${v.size.trim().toLowerCase()}`)
  ), [existingVariants]);

  function hasColor(color: BuilderColor): boolean {
    const key = colorKey(color);
    return colors.some((item) => colorKey(item) === key);
  }

  function togglePresetColor(preset: { name: string; value: string }) {
    const color = { colorName: preset.name, colorValue: preset.value };
    setGenerateError('');
    setColors((prev) => {
      const key = colorKey(color);
      if (prev.some((item) => colorKey(item) === key)) return prev.filter((item) => colorKey(item) !== key);
      return [...prev, color];
    });
  }

  function addCustomColor() {
    const name = customColor.colorName.trim();
    const value = customColor.colorValue.trim();
    if (!name) { setGenerateError('أدخل اسم اللون المخصص أولاً'); return; }
    if (!/^#[0-9A-Fa-f]{6}$/.test(value)) { setGenerateError('أدخل كود لون صحيح مثل #111827'); return; }
    const next = { colorName: name, colorValue: value };
    if (hasColor(next)) { setGenerateError('هذا اللون موجود بالفعل'); return; }
    setColors((prev) => [...prev, next]);
    setCustomColor({ colorName: '', colorValue: '#C19A6B' });
    setShowCustomColor(false);
    setGenerateError('');
  }

  function removeColor(index: number) {
    setColors((prev) => prev.filter((_, i) => i !== index));
  }

  function updateColor(index: number, patch: Partial<BuilderColor>) {
    setGenerateError('');
    setColors((prev) => prev.map((color, i) => i === index ? { ...color, ...patch } : color));
  }

  function toggleSize(size: string) {
    const trimmed = size.trim();
    if (!trimmed) return;
    setGenerateError('');
    setSizes((prev) => {
      if (prev.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
        return prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      }
      return [...prev, trimmed];
    });
  }

  function addCustomSize() {
    const trimmed = sizeInput.trim();
    if (!trimmed) return;
    if (!sizes.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      setSizes((prev) => [...prev, trimmed]);
    }
    setSizeInput('');
    setGenerateError('');
  }

  function removeSize(index: number) {
    setSizes((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSize(index: number, value: string) {
    setGenerateError('');
    setSizes((prev) => prev.map((size, i) => i === index ? value : size));
  }

  function generate() {
    setGenerateError('');
    if (colors.length === 0 && sizes.length === 0) {
      setGenerateError('أضف ألواناً أو مقاسات أولاً قبل التوليد');
      return;
    }

    const colorKeys = new Set<string>();
    for (const color of colors) {
      const name = color.colorName.trim();
      const value = color.colorValue.trim();
      if (!name) {
        setGenerateError('كل لون مختار يحتاج اسماً واضحاً قبل التوليد');
        return;
      }
      if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
        setGenerateError('كل لون مختار يحتاج كود HEX صحيح مثل #111827');
        return;
      }
      const key = `${value.toLowerCase()}||${name.toLowerCase()}`;
      if (colorKeys.has(key)) {
        setGenerateError('يوجد لون مكرر في قائمة الألوان المختارة');
        return;
      }
      colorKeys.add(key);
    }

    const sizeKeys = new Set<string>();
    for (const size of sizes) {
      const trimmed = size.trim();
      if (!trimmed) {
        setGenerateError('احذف المقاس الفارغ أو اكتب اسماً واضحاً قبل التوليد');
        return;
      }
      const key = trimmed.toLowerCase();
      if (sizeKeys.has(key)) {
        setGenerateError('يوجد مقاس مكرر في قائمة المقاسات المختارة');
        return;
      }
      sizeKeys.add(key);
    }

    const defaultPriceNumber = Number(defaultPrice);
    if (defaultPrice.trim() === '' || !Number.isFinite(defaultPriceNumber) || defaultPriceNumber < 0) {
      setGenerateError('أدخل السعر الافتراضي كرقم صحيح لا يقل عن صفر قبل توليد الخيارات');
      return;
    }

    const compareNumber = defaultCompareAtPrice.trim() === '' ? undefined : Number(defaultCompareAtPrice);
    if (compareNumber !== undefined && (!Number.isFinite(compareNumber) || compareNumber < 0)) {
      setGenerateError('أدخل السعر قبل الخصم كرقم صحيح لا يقل عن صفر أو اتركه فارغاً');
      return;
    }

    const quantityNumber = Number(defaultQuantity);
    if (defaultQuantity.trim() === '' || !Number.isInteger(quantityNumber) || quantityNumber < 0) {
      setGenerateError('أدخل الكمية الافتراضية كرقم صحيح لا يقل عن صفر قبل توليد الخيارات');
      return;
    }

    const thresholdNumber = Number(defaultThreshold);
    if (defaultThreshold.trim() === '' || !Number.isInteger(thresholdNumber) || thresholdNumber < 0) {
      setGenerateError('أدخل حد المخزون المنخفض كرقم صحيح لا يقل عن صفر');
      return;
    }

    const usedSkus = new Set(existingVariants.map((v) => v.sku.trim().toLowerCase()).filter(Boolean));
    const effectiveColors = colors.length > 0 ? colors.map((color) => ({ colorName: color.colorName.trim(), colorValue: color.colorValue.trim() })) : [{ colorName: '', colorValue: '' }];
    const effectiveSizes = sizes.length > 0 ? sizes.map((size) => size.trim()) : [''];
    const newVariants: VariantState[] = [];

    for (const color of effectiveColors) {
      for (const size of effectiveSizes) {
        const key = `${(color.colorValue || color.colorName).trim().toLowerCase()}||${size.trim().toLowerCase()}`;
        if (existingComboKeys.has(key)) continue;

        const sku = generateSku(productSlug || 'product', color.colorName, size, usedSkus);
        usedSkus.add(sku.toLowerCase());
        newVariants.push({
          sku,
          colorName: color.colorName,
          colorValue: color.colorValue,
          size,
          price: defaultPrice,
          compareAtPrice: defaultCompareAtPrice,
          quantity: defaultQuantity,
          lowStockThreshold: defaultThreshold,
          isActive: true,
        });
      }
    }

    if (newVariants.length === 0) {
      setGenerateError('جميع هذه التركيبات موجودة بالفعل. سيتم توليد الخيارات الناقصة فقط بدون تكرار الخيارات الموجودة.');
      return;
    }

    onGenerate(newVariants);
  }

  const wouldGenerate = Math.max(colors.length, 1) * Math.max(sizes.length, 1);

  return (
    <div className="variantBuilder">
      <div className="variantBuilderNoteBox">
        <strong>منشئ سريع ومختصر</strong>
        <p className="adminMuted">
          كل لون + مقاس يتم حفظه كخيار مستقل حتى يتم تتبع المخزون والطلبات بدقة. عدّل القيم الافتراضية هنا، وبعد التوليد يمكن تعديل أي خيار منفصل من الجدول.
        </p>
      </div>

      {generateError && <div className="adminAlert isError" style={{ marginBottom: 12 }}>{generateError}</div>}

      <div className="vbSection">
        <div className="vbSectionHead">
          <strong>اختر الألوان</strong>
          <span className="adminMuted">يمكن تحديد أكثر من لون مباشرة</span>
        </div>

        <div className="vbPresetSwatches" role="listbox" aria-label="ألوان المنتج" aria-multiselectable="true">
          {COLOR_PRESETS.map((preset) => {
            const selected = colors.some((item) => item.colorValue.toLowerCase() === preset.value.toLowerCase());
            return (
              <button
                key={preset.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={`vbSwatchChoice${selected ? ' isSelected' : ''}`}
                onClick={() => togglePresetColor(preset)}
              >
                <span
                  className="colorSwatchDot"
                  style={{ background: preset.value, border: preset.value.toLowerCase() === '#ffffff' ? '1px solid var(--line-strong)' : undefined }}
                  aria-hidden="true"
                />
                <span>{preset.name}</span>
              </button>
            );
          })}
        </div>

        <button type="button" className="adminBtn adminBtnGhost adminBtnSm" onClick={() => setShowCustomColor((value) => !value)}>
          {showCustomColor ? 'إغلاق اللون المخصص' : '+ لون مخصص'}
        </button>

        {showCustomColor && (
          <div className="vbColorPickerWrap">
            <ColorSelector colorName={customColor.colorName} colorValue={customColor.colorValue} onChange={setCustomColor} />
            <button type="button" className="adminBtn adminBtnPrimary adminBtnSm" onClick={addCustomColor}>إضافة اللون</button>
          </div>
        )}

        {colors.length > 0 ? (
          <div className="vbEditableList" aria-label="الألوان المختارة">
            {colors.map((color, idx) => (
              <div key={`${color.colorName}-${color.colorValue}-${idx}`} className="vbEditableRow">
                {color.colorValue && <span className="colorPreviewCircle sm" style={{ background: color.colorValue }} aria-hidden="true" />}
                <label className="adminField">
                  <span className="adminFieldLabel">اسم اللون</span>
                  <input value={color.colorName} onChange={(e) => updateColor(idx, { colorName: e.target.value })} placeholder="أحمر" />
                </label>
                <label className="adminField">
                  <span className="adminFieldLabel">HEX</span>
                  <input dir="ltr" value={color.colorValue} onChange={(e) => updateColor(idx, { colorValue: e.target.value })} placeholder="#B91C1C" />
                </label>
                <button type="button" className="adminBtn adminBtnDanger adminBtnSm" aria-label={`إزالة لون ${color.colorName}`} onClick={() => removeColor(idx)}>إزالة</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="adminMuted" style={{ fontSize: 13, margin: '6px 0 0' }}>لم تُحدد ألوان — سيتم التوليد بدون فلتر لون.</p>
        )}
      </div>

      <div className="vbSection">
        <div className="vbSectionHead">
          <strong>المقاسات</strong>
          <span className="adminMuted">اختر المقاسات بسرعة أو أضف مقاساً مخصصاً</span>
        </div>

        <div className="vbSizePresets" role="listbox" aria-label="مقاسات المنتج" aria-multiselectable="true">
          {SIZE_PRESETS.map((size) => {
            const selected = sizes.some((item) => item.toLowerCase() === size.toLowerCase());
            return (
              <button key={size} type="button" className={`vbSizePreset${selected ? ' isAdded' : ''}`} onClick={() => toggleSize(size)}>
                {size}
              </button>
            );
          })}
        </div>

        <div className="vbInlineInputRow">
          <input
            value={sizeInput}
            onChange={(e) => setSizeInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSize(); } }}
            placeholder="مقاس مخصص"
            className="adminInput"
          />
          <button type="button" className="adminBtn adminBtnGhost adminBtnSm" onClick={addCustomSize}>إضافة مقاس</button>
        </div>

        {sizes.length > 0 ? (
          <div className="vbSizeList" aria-label="المقاسات المختارة">
            {sizes.map((size, idx) => (
              <div key={`${size}-${idx}`} className="vbSizeRow">
                <label className="adminField">
                  <span className="adminFieldLabel">اسم المقاس</span>
                  <input value={size} onChange={(e) => updateSize(idx, e.target.value)} placeholder="S" />
                </label>
                <button type="button" className="adminBtn adminBtnDanger adminBtnSm" aria-label={`إزالة مقاس ${size}`} onClick={() => removeSize(idx)}>إزالة</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="adminMuted" style={{ fontSize: 13, margin: '8px 0 0' }}>لم تُحدد مقاسات — سيتم التوليد بدون فلتر مقاس.</p>
        )}
      </div>

      <div className="vbSection">
        <div className="vbSectionHead">
          <strong>القيم الافتراضية للتوليد</strong>
          <span className="adminMuted">تُنسخ لكل خيار جديد ويمكن تعديلها لاحقاً لكل صف</span>
        </div>
        <div className="adminRepeatGrid compact">
          <div className="adminField">
            <label>السعر الافتراضي (₪)</label>
            <input type="number" min="0" step="0.01" value={defaultPrice} onChange={(e) => setDefaultPrice(e.target.value)} />
          </div>
          <div className="adminField">
            <label>السعر قبل الخصم الافتراضي (₪)</label>
            <input type="number" min="0" step="0.01" value={defaultCompareAtPrice} onChange={(e) => setDefaultCompareAtPrice(e.target.value)} />
          </div>
          <div className="adminField">
            <label>الكمية الافتراضية</label>
            <input type="number" min="0" step="1" value={defaultQuantity} onChange={(e) => setDefaultQuantity(e.target.value)} />
            <span className="adminFieldHint">ضع 0 فقط إذا كنت تريد إنشاء الخيارات كغير متوفرة.</span>
          </div>
          <div className="adminField">
            <label>حد المخزون المنخفض الافتراضي</label>
            <input type="number" min="0" step="1" value={defaultThreshold} onChange={(e) => setDefaultThreshold(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="vbGenerateRow">
        <button type="button" className="adminBtn adminBtnPrimary" onClick={generate}>⚡ توليد الخيارات</button>
        {(colors.length > 0 || sizes.length > 0) && (
          <span className="adminMuted" style={{ fontSize: 13 }}>
            سيحاول النظام توليد <strong>{wouldGenerate}</strong> خيار، وسيضيف الناقص فقط.
          </span>
        )}
      </div>
    </div>
  );
}
