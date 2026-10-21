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
    if (trimmed) router.push(`/category/new-in?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form className={`searchBar ${compact ? 'compact' : ''}`} onSubmit={onSubmit} role="search">
      <IconSearch size={18} />
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="ابحثي عن شنط، عطور، هدايا..."
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
