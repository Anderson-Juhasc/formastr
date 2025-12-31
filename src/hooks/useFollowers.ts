'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Profile } from '@/types/nostr';
import { fetchFollowersStreaming } from '@/lib/ndk/follows';
import { fetchProfilesBatchStreaming } from '@/lib/ndk/profiles';
import { FollowWithProfile } from './useFollowing';
import { isPageVisible, onVisibilityChange } from '@/lib/ndk/visibility';

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

// Reduced limit on mobile to prevent memory issues
const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const FOLLOWER_LIMIT = isMobile ? 1000 : 5000;
const PAGE_SIZE = 10;
const INITIAL_BATCH_THRESHOLD = PAGE_SIZE; // Load first batch when we have this many

// Maximum profiles to keep in memory (windowing)
// Older profiles are discarded to save memory
const MAX_LOADED_PROFILES = isMobile ? 50 : 200;

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
  const currentPubkeyRef = useRef<string | null>(null);

  // Load a batch of profiles with streaming updates
  const loadBatch = useCallback(
    (pubkeys: string[], forPubkey: string, onDone?: () => void) => {
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
        const combined = [...prev, ...uniqueNew];

        // Apply windowing: keep only the most recent MAX_LOADED_PROFILES
        // This prevents memory from growing unbounded on long lists
        if (combined.length > MAX_LOADED_PROFILES) {
          // Remove oldest entries (from the beginning)
          const toRemove = combined.slice(0, combined.length - MAX_LOADED_PROFILES);
          // Clear displayedRef for removed items so they can be reloaded if scrolled back
          for (const item of toRemove) {
            displayedRef.current.delete(item.entry.pubkey);
          }
          return combined.slice(-MAX_LOADED_PROFILES);
        }
        return combined;
      });

      // Fetch profiles with streaming - each profile updates as it arrives
      const { cancel } = fetchProfilesBatchStreaming(
        newPubkeys,
        (pk, profile) => {
          // Guard: don't update if we've switched to a different user
          if (currentPubkeyRef.current !== forPubkey) return;
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

    // Don't start streaming if page is not visible
    if (!isPageVisible()) return;

    // Track current pubkey for cancellation guards
    currentPubkeyRef.current = pubkey;

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
    const streamPubkey = pubkey; // Capture for closure

    const { cancel } = fetchFollowersStreaming(
      pubkey,
      FOLLOWER_LIMIT,
      (followerPubkey) => {
        // Guard: don't update if we've switched to a different user
        if (currentPubkeyRef.current !== streamPubkey) return;

        // Deduplicate
        if (seenPubkeysRef.current.has(followerPubkey)) return;

        // Bound the seen set to prevent unbounded growth
        if (seenPubkeysRef.current.size >= FOLLOWER_LIMIT) {
          return; // Stop accepting more
        }
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
          loadBatch(firstBatch, streamPubkey);
          setCursor(PAGE_SIZE);
        }
      },
      () => {
        // Guard: don't update if we've switched to a different user
        if (currentPubkeyRef.current !== streamPubkey) return;

        // Stream complete
        setFollowerPubkeys([...collectedPubkeys]);
        setIsStreaming(false);
        setStreamComplete(true);

        // If we never hit the threshold, load whatever we have
        if (!initialBatchLoadedRef.current && collectedPubkeys.length > 0) {
          initialBatchLoadedRef.current = true;
          const firstBatch = collectedPubkeys.slice(0, PAGE_SIZE);
          loadBatch(firstBatch, streamPubkey);
          setCursor(Math.min(PAGE_SIZE, collectedPubkeys.length));
        }
      }
    );

    cancelStreamRef.current = cancel;

    // Listen for visibility changes to pause/cancel streaming
    const unsubscribeVisibility = onVisibilityChange((visible) => {
      if (!visible && cancelStreamRef.current) {
        // Page hidden - cancel streaming to save resources
        cancelStreamRef.current();
        cancelStreamRef.current = null;
        setIsStreaming(false);
      }
    });

    return () => {
      unsubscribeVisibility();
      // Capture and clear refs first, then cancel to prevent race conditions
      const cancelStream = cancelStreamRef.current;
      const cancelBatch = cancelBatchRef.current;
      cancelStreamRef.current = null;
      cancelBatchRef.current = null;
      cancelStream?.();
      cancelBatch?.();
    };
  }, [pubkey, enabled, loadBatch]);

  const loadMore = useCallback(() => {
    if (loadingMore || cursor >= followerPubkeys.length || !pubkey) return;

    setLoadingMore(true);
    const nextBatch = followerPubkeys.slice(cursor, cursor + PAGE_SIZE);
    loadBatch(nextBatch, pubkey, () => {
      setCursor((prev) => prev + PAGE_SIZE);
      setLoadingMore(false);
    });
  }, [cursor, followerPubkeys, loadingMore, loadBatch, pubkey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Capture and clear refs first, then cancel to prevent race conditions
      const cancelStream = cancelStreamRef.current;
      const cancelBatch = cancelBatchRef.current;
      cancelStreamRef.current = null;
      cancelBatchRef.current = null;
      cancelStream?.();
      cancelBatch?.();
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
