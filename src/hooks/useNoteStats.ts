'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NoteStats, fetchNoteStatsStreaming } from '@/lib/ndk/stats';
import { startStatsFetch, endStatsFetch, canStartStatsFetch } from '@/lib/ndk/concurrency';

interface UseNoteStatsResult {
  stats: NoteStats;
  loading: boolean;
}

// Initial stats - show zeros immediately
const EMPTY_STATS: NoteStats = {
  replies: 0,
  reposts: 0,
  likes: 0,
  zaps: 0,
  zapsAmount: 0,
};

export function useNoteStats(noteId: string, enabled = true): UseNoteStatsResult {
  const queryClient = useQueryClient();
  const cancelRef = useRef<(() => void) | null>(null);
  const startedRef = useRef(false);

  const queryKey = ['noteStats', noteId];

  const { data: stats = EMPTY_STATS, isLoading } = useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      if (!noteId) return EMPTY_STATS;

      // Check concurrency limit - if at limit, return empty stats and don't block
      if (!canStartStatsFetch()) {
        return EMPTY_STATS;
      }

      startStatsFetch();
      startedRef.current = true;

      return new Promise<NoteStats>((resolve) => {
        let latestStats = { ...EMPTY_STATS };
        let resolved = false;

        const doResolve = () => {
          if (!resolved) {
            resolved = true;
            if (startedRef.current) {
              endStatsFetch();
              startedRef.current = false;
            }
            resolve(latestStats);
          }
        };

        // Resolve with current data if aborted
        signal?.addEventListener('abort', doResolve);

        const { cancel } = fetchNoteStatsStreaming(
          noteId,
          (newStats) => {
            if (signal?.aborted) return;
            latestStats = newStats;
            // Update cache for streaming updates - stats tick up
            queryClient.setQueryData(queryKey, newStats);

            // Resolve quickly to not block UI
            if (!resolved) {
              resolved = true;
              if (startedRef.current) {
                endStatsFetch();
                startedRef.current = false;
              }
              resolve(newStats);
            }
          },
          () => {
            // EOSE: resolve if not already resolved
            doResolve();
          }
        );

        cancelRef.current = cancel;

        // Cancel subscription if query is aborted (e.g., by React Query gcTime)
        signal?.addEventListener('abort', cancel);
      });
    },
    enabled: !!noteId && enabled,
    // Stats are frequently updated, shorter stale time
    staleTime: 10 * 1000,
  });

  // Cleanup on unmount or noteId change
  useEffect(() => {
    return () => {
      cancelRef.current?.();
      cancelRef.current = null;
    };
  }, [noteId]);

  return { stats, loading: isLoading };
}
