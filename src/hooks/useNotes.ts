'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Note } from '@/types/nostr';
import { fetchNotesStreaming } from '@/lib/ndk/notes';
import { isPageVisible } from '@/lib/ndk/visibility';

interface UseNotesResult {
  notes: Note[];
  loading: boolean;
  fetching: boolean;
  error: string | null;
}

// Insert note in sorted order (newest first)
function insertSorted(notes: Note[], note: Note): Note[] {
  // Deduplicate
  if (notes.some((n) => n.id === note.id)) return notes;

  const newNotes = [...notes];
  const index = newNotes.findIndex((n) => n.createdAt < note.createdAt);
  if (index === -1) {
    newNotes.push(note);
  } else {
    newNotes.splice(index, 0, note);
  }
  return newNotes;
}

// Time to wait after first note to collect more cache results before resolving
const CACHE_COLLECTION_DELAY = 300;

// Maximum seen items to prevent unbounded growth
const MAX_SEEN_ITEMS = 1000;

export function useNotes(pubkey: string | null, limit = 20, enabled = true): UseNotesResult {
  const queryClient = useQueryClient();
  const seenRef = useRef<Set<string>>(new Set());
  const cancelRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  const queryKey = ['notes', pubkey, limit];

  const {
    data: notes = [],
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      if (!pubkey) return [];

      // Don't start new fetches if page is not visible
      if (!isPageVisible()) {
        return [];
      }

      // Reset seen set but keep it bounded
      seenRef.current = new Set();

      return new Promise<Note[]>((resolve) => {
        const collectedNotes: Note[] = [];
        let resolved = false;
        let resolveTimer: ReturnType<typeof setTimeout> | null = null;

        const cleanup = () => {
          if (resolveTimer) {
            clearTimeout(resolveTimer);
            resolveTimer = null;
          }
          signal?.removeEventListener('abort', abortHandler);
        };

        const doResolve = () => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve([...collectedNotes]);
          }
        };

        // Schedule resolve after delay to collect more cache results
        const scheduleResolve = () => {
          if (resolved || resolveTimer) return;
          resolveTimer = setTimeout(doResolve, CACHE_COLLECTION_DELAY);
        };

        // Handler for abort signal - must be named for removal
        const abortHandler = () => {
          cancelRef.current?.();
          doResolve();
        };

        signal?.addEventListener('abort', abortHandler);

        const { cancel } = fetchNotesStreaming(
          pubkey,
          limit,
          (note) => {
            if (signal?.aborted || !mountedRef.current) return;
            if (seenRef.current.has(note.id)) return;

            // Bound the seen set to prevent memory growth
            if (seenRef.current.size >= MAX_SEEN_ITEMS) {
              const firstKey = seenRef.current.values().next().value;
              if (firstKey) seenRef.current.delete(firstKey);
            }
            seenRef.current.add(note.id);

            // Add to collected notes (for initial resolve)
            const updated = insertSorted(collectedNotes, note);
            collectedNotes.length = 0;
            collectedNotes.push(...updated);

            // Update cache for streaming updates
            queryClient.setQueryData(queryKey, [...collectedNotes]);

            // Schedule resolve after short delay to collect cache results
            scheduleResolve();
          },
          () => {
            // EOSE: resolve immediately
            doResolve();
          }
        );

        cancelRef.current = cancel;
      });
    },
    enabled: !!pubkey && enabled,
  });

  // Track mounted state and cleanup on unmount or pubkey change
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelRef.current?.();
      cancelRef.current = null;
      seenRef.current.clear();
    };
  }, [pubkey, limit]);

  return {
    notes,
    // Show loading when initially loading OR when fetching with no data
    loading: isLoading || (isFetching && notes.length === 0),
    fetching: isFetching,
    error: error instanceof Error ? error.message : null,
  };
}
