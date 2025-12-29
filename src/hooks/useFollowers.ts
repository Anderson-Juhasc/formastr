'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Profile } from '@/types/nostr';
import { fetchFollowersStreaming } from '@/lib/ndk/follows';
import { fetchProfilesBatchStreaming } from '@/lib/ndk/profiles';
import { FollowWithProfile } from './useFollowing';

interface UseFollowersResult {
  followers: FollowWithProfile[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  total: number;
}

const FOLLOWER_LIMIT = 5000; // Increased to fetch more followers
const PAGE_SIZE = 10;

export function useFollowers(pubkey: string | null, enabled = true): UseFollowersResult {
  const queryClient = useQueryClient();
  const [followers, setFollowers] = useState<FollowWithProfile[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(0);
  const displayedRef = useRef<Set<string>>(new Set());
  const cancelBatchRef = useRef<(() => void) | null>(null);
  const lastPubkeyRef = useRef<string | null>(null);

  // Fetch followers list
  const {
    data: followersList = [],
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['followersList', pubkey],
    queryFn: () => {
      if (!pubkey) return [];

      return new Promise<string[]>((resolve) => {
        const collected: string[] = [];
        const seen = new Set<string>();

        fetchFollowersStreaming(
          pubkey,
          FOLLOWER_LIMIT,
          (followerPubkey) => {
            if (!seen.has(followerPubkey)) {
              seen.add(followerPubkey);
              collected.push(followerPubkey);
            }
          },
          () => {
            resolve([...collected]);
          }
        );
      });
    },
    enabled: !!pubkey && enabled,
  });

  // Load a batch of profiles with streaming updates
  const loadBatch = useCallback(
    (pubkeys: string[], onDone?: () => void) => {
      if (pubkeys.length === 0) {
        onDone?.();
        return;
      }

      // Filter out already displayed
      const newPubkeys = pubkeys.filter((pk) => !displayedRef.current.has(pk));
      if (newPubkeys.length === 0) {
        onDone?.();
        return;
      }

      // Mark as displayed
      for (const pk of newPubkeys) {
        displayedRef.current.add(pk);
      }

      // Add entries with null profiles initially (deduplicate in state update)
      const initialFollowers: FollowWithProfile[] = newPubkeys.map((pk) => ({
        entry: { pubkey: pk },
        profile: null,
      }));
      setFollowers((prev) => {
        const existingPubkeys = new Set(prev.map((f) => f.entry.pubkey));
        const uniqueNew = initialFollowers.filter((f) => !existingPubkeys.has(f.entry.pubkey));
        return [...prev, ...uniqueNew];
      });

      // Fetch profiles with streaming - each profile updates as it arrives
      const { cancel } = fetchProfilesBatchStreaming(
        newPubkeys,
        (pk, profile) => {
          setFollowers((prev) =>
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
      setFollowers([]);
      setCursor(0);
      displayedRef.current.clear();
      cancelBatchRef.current?.();
      cancelBatchRef.current = null;
    }

    // Load first batch when followers list arrives
    if (followersList.length > 0 && displayedRef.current.size === 0) {
      const firstBatch = followersList.slice(0, PAGE_SIZE);
      loadBatch(firstBatch);
      setCursor(PAGE_SIZE);
    }

    return () => {
      cancelBatchRef.current?.();
      cancelBatchRef.current = null;
      displayedRef.current.clear();
    };
  }, [pubkey, followersList, loadBatch]);

  const loadMore = useCallback(() => {
    if (loadingMore || cursor >= followersList.length) return;

    setLoadingMore(true);
    const nextBatch = followersList.slice(cursor, cursor + PAGE_SIZE);
    loadBatch(nextBatch, () => {
      setCursor((prev) => prev + PAGE_SIZE);
      setLoadingMore(false);
    });
  }, [cursor, followersList, loadingMore, loadBatch]);

  return {
    followers,
    loading: isLoading || (isFetching && followers.length === 0),
    loadingMore,
    error: error instanceof Error ? error.message : null,
    hasMore: cursor < followersList.length,
    loadMore,
    total: followersList.length,
  };
}
