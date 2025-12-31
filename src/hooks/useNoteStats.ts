'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NoteStats, fetchNoteStatsStreaming } from '@/lib/ndk/stats';
import { startStatsFetch, endStatsFetch, canStartStatsFetch } from '@/lib/ndk/concurrency';
import { isPageVisible } from '@/lib/ndk/visibility';

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
  const mountedRef = useRef(true);

  const queryKey = ['noteStats', noteId];

  const { data: stats = EMPTY_STATS, isLoading } = useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      if (!noteId) return EMPTY_STATS;

      // Don't start new fetches if page is not visible
      if (!isPageVisible()) {
        return EMPTY_STATS;
      }

      // Check concurrency limit - if at limit, return empty stats and don't block
      if (!canStartStatsFetch()) {
        return EMPTY_STATS;
      }

      startStatsFetch();
      startedRef.current = true;

      return new Promise<NoteStats>((resolve) => {
        let latestStats = { ...EMPTY_STATS };
        let resolved = false;

        const cleanup = () => {
          if (startedRef.current) {
            endStatsFetch();
            startedRef.current = false;
          }
          // Remove abort listeners to prevent memory leak
          signal?.removeEventListener('abort', abortHandler);
        };

        const doResolve = () => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve(latestStats);
          }
        };

        // Handler for abort signal - must be named for removal
        const abortHandler = () => {
          cancelRef.current?.();
          doResolve();
        };

        signal?.addEventListener('abort', abortHandler);

        const { cancel } = fetchNoteStatsStreaming(
          noteId,
          (newStats) => {
            if (signal?.aborted || !mountedRef.current) return;
            latestStats = newStats;
            // Update cache for streaming updates - stats tick up
            queryClient.setQueryData(queryKey, newStats);

            // Resolve quickly to not block UI
            if (!resolved) {
              resolved = true;
              cleanup();
              resolve(newStats);
            }
          },
          () => {
            // EOSE: resolve if not already resolved
            doResolve();
          }
        );

        cancelRef.current = cancel;
      });
    },
    enabled: !!noteId && enabled,
    // Stats are frequently updated, shorter stale time
    staleTime: 10 * 1000,
  });

  // Track mounted state and cleanup on unmount or noteId change
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelRef.current?.();
      cancelRef.current = null;
      if (startedRef.current) {
        endStatsFetch();
        startedRef.current = false;
      }
    };
  }, [noteId]);

  return { stats, loading: isLoading };
}
