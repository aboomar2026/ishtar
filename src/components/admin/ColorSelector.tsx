'use client';
import { IconEyedropper } from '@/components/Icons';

import { useEffect, useRef, useState } from 'react';

// ── Preset palette suitable for a fashion/accessories boutique ──
export const COLOR_PRESETS = [
  { name: 'أسود',    value: '#111827' },
  { name: 'أبيض',   value: '#FFFFFF' },
  { name: 'بيج',    value: '#E8D8C3' },
  { name: 'بني',    value: '#8B5E3C' },
  { name: 'جملي',   value: '#C19A6B' },
  { name: 'أحمر',   value: '#B91C1C' },
  { name: 'وردي',   value: '#F4A6B8' },
  { name: 'توتي',   value: '#8E244D' },
  { name: 'أزرق',   value: '#2563EB' },
  { name: 'أخضر',   value: '#166534' },
  { name: 'ذهبي',   value: '#D4AF37' },
  { name: 'فضي',    value: '#C0C0C0' },
  { name: 'رمادي',  value: '#6B7280' },
  { name: 'كحلي',   value: '#1E3A8A' },
  { name: 'زيتي',   value: '#556B2F' },
] as const;

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export type ColorValue = { colorName: string; colorValue: string };

type Props = {
  colorName: string;
  colorValue: string;
  onChange: (value: ColorValue) => void;
};

export function ColorSelector({ colorName, colorValue, onChange }: Props) {
  const [hexInput, setHexInput] = useState(colorValue);
  const [hexError, setHexError] = useState('');
  const [eyedropperSupported, setEyedropperSupported] = useState(false);
  const nativeRef = useRef<HTMLInputElement>(null);

  // EyeDropper is browser-only; detect after mount
  useEffect(() => {
    setEyedropperSupported(typeof window !== 'undefined' && 'EyeDropper' in window);
  }, []);

  // Keep hex input in sync when value changes externally (preset click)
  useEffect(() => { setHexInput(colorValue); }, [colorValue]);

  function selectPreset(preset: { name: string; value: string }) {
    onChange({ colorName: preset.name, colorValue: preset.value });
    setHexInput(preset.value);
    setHexError('');
  }

  function handleHexChange(raw: string) {
    setHexInput(raw);
    const v = raw.trim();
    if (!v) { setHexError(''); onChange({ colorName, colorValue: '' }); return; }
    if (HEX_RE.test(v)) {
      setHexError('');
      onChange({ colorName, colorValue: v });
    } else {
      setHexError('أدخل كود لون صحيح مثل #111827');
    }
  }

  function handleNativeColor(v: string) {
    onChange({ colorName, colorValue: v });
    setHexInput(v);
    setHexError('');
  }

  async function openEyeDropper() {
    if (!eyedropperSupported) return;
    try {
      type EyeDropper = { open: () => Promise<{ sRGBHex: string }> };
      const dropper: EyeDropper = new (window as unknown as Record<string, new () => EyeDropper>)['EyeDropper']();
      const result = await dropper.open();
      onChange({ colorName, colorValue: result.sRGBHex });
      setHexInput(result.sRGBHex);
      setHexError('');
    } catch { /* user cancelled */ }
  }

  const selectedValue = colorValue.toLowerCase();

  return (
    <div className="colorSelector">
      {/* ── Preset swatches ── */}
      <div className="colorPresetsGrid" role="listbox" aria-label="الألوان المتاحة">
        {COLOR_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            role="option"
            aria-selected={preset.value.toLowerCase() === selectedValue}
            aria-label={preset.name}
            title={preset.name}
            className={`colorSwatchBtn${preset.value.toLowerCase() === selectedValue ? ' isSelected' : ''}`}
            onClick={() => selectPreset(preset)}
          >
            <span className="colorSwatchDot" style={{ background: preset.value, border: preset.value.toLowerCase() === '#ffffff' ? '1px solid var(--line-strong)' : undefined }} />
            <span className="colorSwatchName">{preset.name}</span>
          </button>
        ))}
      </div>

      {/* ── Color name + native picker row ── */}
      <div className="colorSelectorRow">
        {colorValue && HEX_RE.test(colorValue) && (
          <span
            className="colorPreviewCircle"
            style={{ background: colorValue, border: colorValue.toLowerCase() === '#ffffff' ? '1px solid var(--line-strong)' : undefined }}
            aria-hidden="true"
          />
        )}
        <div className="adminField" style={{ flex: 1 }}>
          <label className="adminFieldLabel">اسم اللون *</label>
          <input
            value={colorName}
            onChange={(e) => onChange({ colorName: e.target.value, colorValue })}
            placeholder="مثال: أحمر طوبي"
          />
        </div>
        <div className="colorNativeWrap">
          <label className="adminFieldLabel" style={{ display: 'block', marginBottom: 4 }}>اختيار</label>
          <input
            ref={nativeRef}
            type="color"
            value={HEX_RE.test(colorValue) ? colorValue : '#000000'}
            onChange={(e) => handleNativeColor(e.target.value)}
            className="colorNativeInput"
            aria-label="اختيار لون مخصص"
          />
        </div>
      </div>

      {/* ── Hex + EyeDropper row ── */}
      <div className="colorSelectorRow" style={{ alignItems: 'flex-start' }}>
        <div className="adminField" style={{ flex: 1 }}>
          <label className="adminFieldLabel">كود اللون HEX</label>
          <input
            value={hexInput}
            onChange={(e) => handleHexChange(e.target.value)}
            placeholder="#B91C1C"
            className={hexError ? 'hasError' : ''}
          />
          {hexError
            ? <span className="adminFieldError">{hexError}</span>
            : <span className="adminFieldHint">اختياري — للمصممين أو عند وجود كود محدد.</span>}
        </div>
        {eyedropperSupported && (
          <div style={{ paddingTop: 22 }}>
            <button
              type="button"
              className="adminBtn adminBtnGhost adminBtnSm"
              onClick={openEyeDropper}
              title="التقاط لون من الشاشة"
            >
              <IconEyedropper size={18} /> التقاط
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
