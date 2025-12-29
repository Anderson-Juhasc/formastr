'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Note, Profile } from '@/types/nostr';
import { fetchRepliesStreaming } from '@/lib/ndk/notes';
import { fetchProfilesBatchStreaming } from '@/lib/ndk/profiles';

// Debounce time for batching profile fetches
const PROFILE_BATCH_DELAY = 100;

// Time to wait after first reply to collect more cache results before resolving
const CACHE_COLLECTION_DELAY = 300;

export interface ReplyWithAuthor {
  note: Note;
  author: Profile | null;
}

interface UseRepliesResult {
  replies: ReplyWithAuthor[];
  loading: boolean;
  error: string | null;
}

// Insert reply in sorted order (oldest first for comments)
function insertSortedReply(replies: ReplyWithAuthor[], reply: ReplyWithAuthor): ReplyWithAuthor[] {
  // Deduplicate
  if (replies.some((r) => r.note.id === reply.note.id)) return replies;

  const newReplies = [...replies];
  const index = newReplies.findIndex((r) => r.note.createdAt > reply.note.createdAt);
  if (index === -1) {
    newReplies.push(reply);
  } else {
    newReplies.splice(index, 0, reply);
  }
  return newReplies;
}

export function useReplies(noteId: string | null, enabled = true): UseRepliesResult {
  const queryClient = useQueryClient();
  const [replies, setReplies] = useState<ReplyWithAuthor[]>([]);
  const cancelBatchRef = useRef<(() => void) | null>(null);
  const pendingPubkeysRef = useRef<Set<string>>(new Set());
  const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchedPubkeysRef = useRef<Set<string>>(new Set());

  const queryKey = ['replies', noteId];

  // Debounced batch profile fetch
  const scheduleBatchFetch = () => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    batchTimeoutRef.current = setTimeout(() => {
      const pubkeys = Array.from(pendingPubkeysRef.current);
      pendingPubkeysRef.current = new Set();

      if (pubkeys.length === 0) return;

      // Mark as being fetched
      for (const pk of pubkeys) {
        fetchedPubkeysRef.current.add(pk);
      }

      // Fetch profiles in batch
      const { cancel } = fetchProfilesBatchStreaming(
        pubkeys,
        (pk, profile) => {
          setReplies((prev) =>
            prev.map((r) => (r.note.pubkey === pk ? { ...r, author: profile } : r))
          );
          // Also cache individual profile
          queryClient.setQueryData(['profile', pk], profile);
        },
        () => {}
      );

      cancelBatchRef.current = cancel;
    }, PROFILE_BATCH_DELAY);
  };

  // Fetch replies
  const { isLoading, isFetching, error } = useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      if (!noteId) return [];

      pendingPubkeysRef.current = new Set();
      fetchedPubkeysRef.current = new Set();

      return new Promise<ReplyWithAuthor[]>((resolve) => {
        const collectedReplies: ReplyWithAuthor[] = [];
        const seen = new Set<string>();
        let resolved = false;
        let resolveTimer: ReturnType<typeof setTimeout> | null = null;

        const doResolve = () => {
          if (!resolved) {
            resolved = true;
            if (resolveTimer) clearTimeout(resolveTimer);
            resolve([...collectedReplies]);
          }
        };

        // Schedule resolve after delay to collect more cache results
        const scheduleResolve = () => {
          if (resolved || resolveTimer) return;
          resolveTimer = setTimeout(doResolve, CACHE_COLLECTION_DELAY);
        };

        // Resolve with current data if aborted
        signal?.addEventListener('abort', doResolve);

        const { cancel } = fetchRepliesStreaming(
          noteId,
          50,
          (note) => {
            if (signal?.aborted) return;
            if (seen.has(note.id)) return;
            seen.add(note.id);

            const reply: ReplyWithAuthor = { note, author: null };

            // Add to collected replies
            const updated = insertSortedReply(collectedReplies, reply);
            collectedReplies.length = 0;
            collectedReplies.push(...updated);

            // Update local state for streaming
            setReplies([...collectedReplies]);

            // Queue pubkey for batched profile fetch
            if (!fetchedPubkeysRef.current.has(note.pubkey)) {
              pendingPubkeysRef.current.add(note.pubkey);
              scheduleBatchFetch();
            }

            // Schedule resolve after short delay to collect cache results
            scheduleResolve();
          },
          () => {
            // EOSE: resolve immediately
            doResolve();
          }
        );

        // Cancel subscription if query is aborted
        signal?.addEventListener('abort', cancel);
      });
    },
    enabled: !!noteId && enabled,
  });

  // Reset state when noteId changes and cleanup on unmount
  useEffect(() => {
    // Reset state for new noteId
    setReplies([]);
    pendingPubkeysRef.current.clear();
    fetchedPubkeysRef.current.clear();

    return () => {
      // Cleanup on unmount or noteId change
      cancelBatchRef.current?.();
      cancelBatchRef.current = null;
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }
      pendingPubkeysRef.current.clear();
      fetchedPubkeysRef.current.clear();
    };
  }, [noteId]);

  return {
    replies,
    loading: isLoading || (isFetching && replies.length === 0),
    error: error instanceof Error ? error.message : null,
  };
}
