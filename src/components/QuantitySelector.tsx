'use client';

import { ChangeEvent, useEffect, useState } from 'react';

function clampQuantity(value: number, min: number, max?: number) {
  const upperBounded = max === undefined ? value : Math.min(max, value);
  return Math.max(min, upperBounded);
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const [draftValue, setDraftValue] = useState(String(value));
  const canDecrease = value > min;
  const canIncrease = max === undefined || value < max;

  useEffect(() => {
    setDraftValue(String(value));
  }, [value]);

  function updateQuantity(nextValue: number) {
    const clamped = clampQuantity(nextValue, min, max);
    setDraftValue(String(clamped));
    onChange(clamped);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const digitsOnly = event.target.value.replace(/[^0-9]/g, '');
    setDraftValue(digitsOnly);

    if (!digitsOnly) return;
    updateQuantity(Number(digitsOnly));
  }

  function handleInputBlur() {
    if (!draftValue) {
      updateQuantity(min);
      return;
    }

    updateQuantity(Number(draftValue));
  }

  return (
    <div className="quantitySelector" aria-label="اختيار الكمية">
      <button
        type="button"
        onClick={() => updateQuantity(value - 1)}
        aria-label="تقليل الكمية"
        disabled={!canDecrease}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        min={min}
        max={max}
        value={draftValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        aria-label="الكمية"
      />
      <button
        type="button"
        onClick={() => updateQuantity(value + 1)}
        aria-label="زيادة الكمية"
        disabled={!canIncrease}
      >
        +
      </button>
    </div>
  );
}
