'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  isStreaming: boolean;
}

const FOLLOWER_LIMIT = 5000;
const PAGE_SIZE = 10;
const INITIAL_BATCH_THRESHOLD = PAGE_SIZE; // Load first batch when we have this many

export function useFollowers(pubkey: string | null, enabled = true): UseFollowersResult {
  const queryClient = useQueryClient();

  // Streaming state - followers discovered so far
  const [followerPubkeys, setFollowerPubkeys] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamComplete, setStreamComplete] = useState(false);

  // Display state - followers with profiles loaded
  const [followers, setFollowers] = useState<FollowWithProfile[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(0);

  // Refs for tracking and cleanup
  const displayedRef = useRef<Set<string>>(new Set());
  const seenPubkeysRef = useRef<Set<string>>(new Set());
  const cancelStreamRef = useRef<(() => void) | null>(null);
  const cancelBatchRef = useRef<(() => void) | null>(null);
  const lastPubkeyRef = useRef<string | null>(null);
  const initialBatchLoadedRef = useRef(false);

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

      // Add entries with null profiles initially
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

  // Stream followers and load profiles incrementally
  useEffect(() => {
    if (!pubkey || !enabled) return;

    // Reset if pubkey changed
    if (lastPubkeyRef.current !== pubkey) {
      lastPubkeyRef.current = pubkey;
      setFollowers([]);
      setFollowerPubkeys([]);
      setCursor(0);
      setStreamComplete(false);
      initialBatchLoadedRef.current = false;
      displayedRef.current.clear();
      seenPubkeysRef.current.clear();
      cancelStreamRef.current?.();
      cancelBatchRef.current?.();
    }

    setIsStreaming(true);
    const collectedPubkeys: string[] = [];

    const { cancel } = fetchFollowersStreaming(
      pubkey,
      FOLLOWER_LIMIT,
      (followerPubkey) => {
        // Deduplicate
        if (seenPubkeysRef.current.has(followerPubkey)) return;
        seenPubkeysRef.current.add(followerPubkey);

        collectedPubkeys.push(followerPubkey);

        // Update the count incrementally (batch updates for performance)
        if (collectedPubkeys.length % 10 === 0 || collectedPubkeys.length <= INITIAL_BATCH_THRESHOLD) {
          setFollowerPubkeys([...collectedPubkeys]);
        }

        // Load first batch as soon as we have enough followers
        if (!initialBatchLoadedRef.current && collectedPubkeys.length >= INITIAL_BATCH_THRESHOLD) {
          initialBatchLoadedRef.current = true;
          const firstBatch = collectedPubkeys.slice(0, PAGE_SIZE);
          loadBatch(firstBatch);
          setCursor(PAGE_SIZE);
        }
      },
      () => {
        // Stream complete
        setFollowerPubkeys([...collectedPubkeys]);
        setIsStreaming(false);
        setStreamComplete(true);

        // If we never hit the threshold, load whatever we have
        if (!initialBatchLoadedRef.current && collectedPubkeys.length > 0) {
          initialBatchLoadedRef.current = true;
          const firstBatch = collectedPubkeys.slice(0, PAGE_SIZE);
          loadBatch(firstBatch);
          setCursor(Math.min(PAGE_SIZE, collectedPubkeys.length));
        }
      }
    );

    cancelStreamRef.current = cancel;

    return () => {
      cancelStreamRef.current?.();
      cancelBatchRef.current?.();
      cancelStreamRef.current = null;
      cancelBatchRef.current = null;
    };
  }, [pubkey, enabled, loadBatch]);

  const loadMore = useCallback(() => {
    if (loadingMore || cursor >= followerPubkeys.length) return;

    setLoadingMore(true);
    const nextBatch = followerPubkeys.slice(cursor, cursor + PAGE_SIZE);
    loadBatch(nextBatch, () => {
      setCursor((prev) => prev + PAGE_SIZE);
      setLoadingMore(false);
    });
  }, [cursor, followerPubkeys, loadingMore, loadBatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelStreamRef.current?.();
      cancelBatchRef.current?.();
      displayedRef.current.clear();
      seenPubkeysRef.current.clear();
    };
  }, []);

  return {
    followers,
    loading: isStreaming && followers.length === 0,
    loadingMore,
    error: null,
    hasMore: cursor < followerPubkeys.length,
    loadMore,
    total: followerPubkeys.length,
    isStreaming,
  };
}
