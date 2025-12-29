'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Strip nostr: prefix if present
function stripNostrPrefix(input: string): string {
  return input.startsWith('nostr:') ? input.slice(6) : input;
}

function isValidIdentifier(input: string): boolean {
  const cleaned = stripNostrPrefix(input);
  if (cleaned.startsWith('npub1') || cleaned.startsWith('nprofile1')) {
    return cleaned.length > 10;
  }
  if (cleaned.includes('@') || cleaned.includes('.')) {
    return true;
  }
  if (/^[0-9a-f]{64}$/i.test(cleaned)) {
    return true;
  }
  return false;
}

export function HeaderSearch() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();

    if (!trimmed || !isValidIdentifier(trimmed)) {
      return;
    }

    setQuery('');
    const identifier = stripNostrPrefix(trimmed);
    router.push(`/${encodeURIComponent(identifier)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 max-w-xs">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search npub, NIP-05..."
          className="w-full pl-9 pr-3 py-1.5 text-sm border-2 border-input rounded-lg bg-card text-card-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary transition-colors shadow-sm"
        />
      </div>
    </form>
  );
}
