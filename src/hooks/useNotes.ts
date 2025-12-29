'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Note } from '@/types/nostr';
import { fetchNotesStreaming } from '@/lib/ndk/notes';

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

export function useNotes(pubkey: string | null, limit = 20, enabled = true): UseNotesResult {
  const queryClient = useQueryClient();
  const seenRef = useRef<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

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

      seenRef.current = new Set();

      return new Promise<Note[]>((resolve) => {
        const collectedNotes: Note[] = [];
        let resolved = false;
        let resolveTimer: ReturnType<typeof setTimeout> | null = null;

        const doResolve = () => {
          if (!resolved) {
            resolved = true;
            if (resolveTimer) clearTimeout(resolveTimer);
            resolve([...collectedNotes]);
          }
        };

        // Schedule resolve after delay to collect more cache results
        const scheduleResolve = () => {
          if (resolved || resolveTimer) return;
          resolveTimer = setTimeout(doResolve, CACHE_COLLECTION_DELAY);
        };

        // Resolve with current data if aborted
        signal?.addEventListener('abort', doResolve);

        const { cancel } = fetchNotesStreaming(
          pubkey,
          limit,
          (note) => {
            if (signal?.aborted) return;
            if (seenRef.current.has(note.id)) return;
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

        // Store cancel for cleanup
        abortControllerRef.current = { abort: cancel } as AbortController;

        // Cancel subscription if query is aborted (e.g., by React Query gcTime)
        signal?.addEventListener('abort', cancel);
      });
    },
    enabled: !!pubkey && enabled,
  });

  // Cleanup subscription on unmount or pubkey change
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
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
