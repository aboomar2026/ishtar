'use client';

import { useRef, useState } from 'react';
import { IconX } from './Icons';

type ClearableSearchInputProps = {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  ariaLabel?: string;
  /** When true, clearing re-submits the parent form (so an applied filter is removed). */
  submitOnClear?: boolean;
};

/** Text input with a trailing X that clears it — replaces a separate "clear" button. */
export function ClearableSearchInput({ name, defaultValue = '', placeholder, ariaLabel, submitOnClear }: ClearableSearchInputProps) {
  const [value, setValue] = useState(defaultValue);
  const ref = useRef<HTMLInputElement>(null);

  return (
    <span className="searchFieldWrap">
      <input
        ref={ref}
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      {value ? (
        <button
          type="button"
          className="searchClear"
          aria-label="مسح"
          onClick={() => {
            setValue('');
            if (submitOnClear) ref.current?.form?.requestSubmit();
            else ref.current?.focus();
          }}
        >
          <IconX size={16} />
        </button>
      ) : null}
    </span>
  );
}
