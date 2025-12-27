'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Profile } from '@/types/nostr';
import { fetchFollowingStreaming, FollowEntry } from '@/lib/ndk/follows';
import { fetchProfilesBatchStreaming } from '@/lib/ndk/profiles';

export interface FollowWithProfile {
  entry: FollowEntry;
  profile: Profile | null;
}

interface UseFollowingResult {
  following: FollowWithProfile[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  total: number;
}

const PAGE_SIZE = 20;

export function useFollowing(pubkey: string | null, enabled = true): UseFollowingResult {
  const queryClient = useQueryClient();
  const [following, setFollowing] = useState<FollowWithProfile[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(0);
  const displayedRef = useRef<Set<string>>(new Set());
  const cancelBatchRef = useRef<(() => void) | null>(null);
  const lastPubkeyRef = useRef<string | null>(null);

  // Fetch the full follow list
  const {
    data: followList = [],
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['followList', pubkey],
    queryFn: () => {
      if (!pubkey) return [];

      return new Promise<FollowEntry[]>((resolve) => {
        let latestList: FollowEntry[] = [];

        fetchFollowingStreaming(
          pubkey,
          (list) => {
            latestList = list;
          },
          () => {
            resolve(latestList);
          }
        );
      });
    },
    enabled: !!pubkey && enabled,
  });

  // Load a batch of profiles with streaming updates
  const loadBatch = useCallback(
    (entries: FollowEntry[], onDone?: () => void) => {
      if (entries.length === 0) {
        onDone?.();
        return;
      }

      // Filter out already displayed
      const newEntries = entries.filter((e) => !displayedRef.current.has(e.pubkey));
      if (newEntries.length === 0) {
        onDone?.();
        return;
      }

      // Mark as displayed
      for (const entry of newEntries) {
        displayedRef.current.add(entry.pubkey);
      }

      const pubkeys = newEntries.map((e) => e.pubkey);

      // Add entries with null profiles initially (deduplicate in state update)
      const initialFollowing: FollowWithProfile[] = newEntries.map((entry) => ({
        entry,
        profile: null,
      }));
      setFollowing((prev) => {
        const existingPubkeys = new Set(prev.map((f) => f.entry.pubkey));
        const uniqueNew = initialFollowing.filter((f) => !existingPubkeys.has(f.entry.pubkey));
        return [...prev, ...uniqueNew];
      });

      // Fetch profiles with streaming - each profile updates as it arrives
      const { cancel } = fetchProfilesBatchStreaming(
        pubkeys,
        (pk, profile) => {
          setFollowing((prev) =>
            prev.map((f) => (f.entry.pubkey === pk ? { ...f, profile } : f))
          );
          queryClient.setQueryData(['profile', pk], profile);
        },
        () => {
          onDone?.();
        }
      );

      cancelBatchRef.current = cancel;
    },
    [queryClient]
  );

  // Handle pubkey change and initial load in one effect to avoid race conditions
  useEffect(() => {
    // Reset if pubkey changed
    if (lastPubkeyRef.current !== pubkey) {
      lastPubkeyRef.current = pubkey;
      setFollowing([]);
      setCursor(0);
      displayedRef.current = new Set();
      cancelBatchRef.current?.();
    }

    // Load first batch when follow list arrives
    if (followList.length > 0 && displayedRef.current.size === 0) {
      const firstBatch = followList.slice(0, PAGE_SIZE);
      loadBatch(firstBatch);
      setCursor(PAGE_SIZE);
    }
  }, [pubkey, followList, loadBatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelBatchRef.current?.();
      displayedRef.current.clear();
    };
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMore || cursor >= followList.length) return;

    setLoadingMore(true);
    const nextBatch = followList.slice(cursor, cursor + PAGE_SIZE);
    loadBatch(nextBatch, () => {
      setCursor((prev) => prev + PAGE_SIZE);
      setLoadingMore(false);
    });
  }, [cursor, followList, loadingMore, loadBatch]);

  return {
    following,
    loading: isLoading || (isFetching && following.length === 0),
    loadingMore,
    error: error instanceof Error ? error.message : null,
    hasMore: cursor < followList.length,
    loadMore,
    total: followList.length,
  };
}
