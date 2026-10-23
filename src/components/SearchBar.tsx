'use client';

import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconSearch, IconX } from './Icons';

export function SearchBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    inputRef.current?.blur();
    router.push(`/category/all?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form className={`searchBar ${compact ? 'compact' : ''}`} onSubmit={onSubmit} role="search">
      <IconSearch size={18} />
      <input
        ref={inputRef}
        type="search"
        enterKeyHint="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="البحث في جميع المنتجات" placeholder="ابحثي عن شنط، عطور، هدايا..."
      />
      {query ? (
        <button
          type="button"
          className="searchClear"
          aria-label="مسح البحث"
          onClick={() => {
            setQuery('');
            inputRef.current?.focus();
          }}
        >
          <IconX size={16} />
        </button>
      ) : null}
      <button type="submit" className="searchSubmit">بحث</button>
    </form>
  );
}
