'use client';

import { useState, useRef, useEffect, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useProfileSearch } from '@/hooks/useProfileSearch';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatNpub } from '@/lib/utils';
import { Profile } from '@/types/nostr';

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

// Memoized search result item
const SearchResultItem = memo(function SearchResultItem({
  profile,
  onClick,
  isSelected,
}: {
  profile: Profile;
  onClick: () => void;
  isSelected: boolean;
}) {
  const displayName = profile.displayName || profile.name || formatNpub(profile.npub);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
        isSelected ? 'bg-muted' : 'hover:bg-muted'
      }`}
    >
      <Avatar src={profile.picture} alt={displayName} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{displayName}</p>
        {profile.nip05 ? (
          <p className="text-xs text-primary truncate">{profile.nip05}</p>
        ) : (
          <p className="text-xs text-muted-foreground truncate">{formatNpub(profile.npub)}</p>
        )}
      </div>
    </button>
  );
});

export function ProfileSearchInput() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { results, loading, search, clear } = useProfileSearch();

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);

    if (value.trim().length >= 2) {
      search(value);
      setIsOpen(true);
    } else {
      clear();
      setIsOpen(false);
    }
  };

  // Navigate to profile
  const navigateToProfile = (identifier: string) => {
    setQuery('');
    clear();
    setIsOpen(false);
    router.push(`/${encodeURIComponent(identifier)}`);
  };

  // Handle form submit (direct identifier input)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();

    // If there's a selected result, navigate to it
    if (selectedIndex >= 0 && results[selectedIndex]) {
      navigateToProfile(results[selectedIndex].npub);
      return;
    }

    // Otherwise check if it's a valid identifier
    if (trimmed && isValidIdentifier(trimmed)) {
      const identifier = stripNostrPrefix(trimmed);
      navigateToProfile(identifier);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showDropdown = isOpen && (results.length > 0 || loading);

  return (
    <form onSubmit={handleSubmit} className="relative flex-1 max-w-xs">
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
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Search users..."
          className="w-full pl-9 pr-3 py-1.5 text-sm border-2 border-input rounded-lg bg-card text-card-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary transition-colors shadow-sm"
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-card border-2 border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          {results.length > 0 ? (
            results.map((profile, index) => (
              <SearchResultItem
                key={profile.pubkey}
                profile={profile}
                onClick={() => navigateToProfile(profile.npub)}
                isSelected={index === selectedIndex}
              />
            ))
          ) : loading ? (
            <div className="p-3 space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </form>
  );
}
