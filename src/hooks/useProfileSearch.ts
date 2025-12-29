'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Profile } from '@/types/nostr';
import { searchProfiles, SearchResult } from '@/lib/ndk/search';

interface UseProfileSearchResult {
  results: Profile[];
  loading: boolean;
  search: (query: string) => void;
  clear: () => void;
}

const DEBOUNCE_MS = 300;

export function useProfileSearch(): UseProfileSearchResult {
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const cancelRef = useRef<(() => void) | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    // Cancel any pending operations
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
    }
    setResults([]);
    setLoading(false);
  }, []);

  const search = useCallback((query: string) => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Cancel previous search
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
    }

    const trimmed = query.trim();

    // Clear results if query is too short
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Debounce the search
    debounceRef.current = setTimeout(() => {
      const searchResults: Profile[] = [];
      const seenPubkeys = new Set<string>();

      const { cancel } = searchProfiles(
        trimmed,
        (result: SearchResult) => {
          // Deduplicate
          if (seenPubkeys.has(result.profile.pubkey)) return;
          seenPubkeys.add(result.profile.pubkey);

          searchResults.push(result.profile);
          // Update results incrementally
          setResults([...searchResults]);
        },
        () => {
          setLoading(false);
          cancelRef.current = null;
        }
      );

      cancelRef.current = cancel;
    }, DEBOUNCE_MS);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (cancelRef.current) {
        cancelRef.current();
      }
    };
  }, []);

  return {
    results,
    loading,
    search,
    clear,
  };
}
