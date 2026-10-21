'use client';

type VariantOption = {
  label: string;
  value: string;
  colorValue?: string;
  disabled?: boolean;
};

export function VariantSelector({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: VariantOption[];
  value?: string;
  onChange: (value: string) => void;
}) {
  if (!options.length) return null;

  return (
    <div className="variantBlock">
      <div className="variantLabel">{label}</div>
      <div className="variantOptions">
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            className={`${value === option.value ? 'active' : ''} ${option.disabled ? 'disabled' : ''}`}
            onClick={() => onChange(option.value)}
            disabled={option.disabled}
            aria-pressed={value === option.value}
          >
            {option.colorValue ? <span className="variantSwatch" style={{ background: option.colorValue }} /> : null}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
