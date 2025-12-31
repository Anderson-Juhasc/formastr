'use client';

import { useState, useRef, useEffect, memo } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { useProfileSearch } from '@/hooks/useProfileSearch';
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
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all ${
        isSelected ? 'bg-accent' : 'hover:bg-muted/50'
      }`}
    >
      <Avatar src={profile.picture} alt={displayName} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{displayName}</p>
        {profile.nip05 ? (
          <p className="text-xs text-primary/80 truncate">{profile.nip05}</p>
        ) : (
          <p className="text-xs text-muted-foreground truncate">{formatNpub(profile.npub)}</p>
        )}
      </div>
    </button>
  );
});

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { results, loading, search, clear } = useProfileSearch();

  // Navigate to profile
  const navigateToProfile = (identifier: string) => {
    setQuery('');
    setError(null);
    clear();
    setIsOpen(false);
    router.push(`/${encodeURIComponent(identifier)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();

    if (!trimmed) {
      return;
    }

    // If there's a selected result, navigate to it
    if (selectedIndex >= 0 && results[selectedIndex]) {
      navigateToProfile(results[selectedIndex].npub);
      return;
    }

    if (!isValidIdentifier(trimmed)) {
      setError('Select a user from results or enter a valid npub, nprofile, or NIP-05');
      return;
    }

    setError(null);
    const identifier = stripNostrPrefix(trimmed);
    navigateToProfile(identifier);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    if (error) setError(null);

    if (value.trim().length >= 2) {
      search(value);
      setIsOpen(true);
    } else {
      clear();
      setIsOpen(false);
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
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (results.length > 0) setIsOpen(true);
              }}
              placeholder="Search by name, npub, nprofile, or NIP-05"
              className={error ? 'border-destructive' : ''}
              autoComplete="off"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <Button type="submit">Search</Button>
        </div>

        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 mt-2 bg-card border border-border/60 rounded-xl shadow-[var(--shadow-lg)] z-50 max-h-80 overflow-y-auto overflow-x-hidden"
            style={{ right: '80px' }}
          >
            {results.length > 0 ? (
              <div className="py-1">
                {results.map((profile, index) => (
                  <SearchResultItem
                    key={profile.pubkey}
                    profile={profile}
                    onClick={() => navigateToProfile(profile.npub)}
                    isSelected={index === selectedIndex}
                  />
                ))}
              </div>
            ) : loading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-destructive font-medium">{error}</p>
      )}
    </form>
  );
}
