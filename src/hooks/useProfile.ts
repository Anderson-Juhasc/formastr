'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Profile } from '@/types/nostr';
import { fetchProfileStreaming } from '@/lib/ndk/profiles';
import { resolveIdentifier } from '@/lib/nostr/keys';

interface UseProfileResult {
  profile: Profile | null;
  pubkey: string | null;
  loading: boolean;
  error: string | null;
}

// Resolve identifier to pubkey
async function resolvePubkey(identifier: string): Promise<string> {
  const { pubkey } = await resolveIdentifier(identifier);
  return pubkey;
}

// Fetch profile with streaming updates
function fetchProfile(
  pubkey: string,
  onUpdate: (profile: Profile) => void
): Promise<Profile | null> {
  return new Promise((resolve) => {
    let latestProfile: Profile | null = null;

    const { cancel } = fetchProfileStreaming(
      pubkey,
      (profile) => {
        latestProfile = profile;
        onUpdate(profile);
      },
      () => {
        // EOSE: resolve with whatever we have
        resolve(latestProfile);
      }
    );

    // Cleanup is handled by useEffect
    return cancel;
  });
}

export function useProfile(identifier: string): UseProfileResult {
  const queryClient = useQueryClient();

  // First resolve identifier to pubkey
  const {
    data: pubkey,
    isLoading: resolvingPubkey,
    error: resolveError,
  } = useQuery({
    queryKey: ['pubkey', identifier],
    queryFn: () => resolvePubkey(identifier),
    enabled: !!identifier,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - identifiers rarely change
  });

  // Then fetch profile for that pubkey
  const {
    data: profile,
    isLoading: fetchingProfile,
    error: profileError,
  } = useQuery({
    queryKey: ['profile', pubkey],
    queryFn: ({ signal }) => {
      if (!pubkey) return null;

      return new Promise<Profile | null>((resolve) => {
        let latestProfile: Profile | null = null;
        let resolved = false;

        const doResolve = () => {
          if (!resolved) {
            resolved = true;
            resolve(latestProfile);
          }
        };

        // Resolve with current data if aborted
        signal?.addEventListener('abort', doResolve);

        const { cancel } = fetchProfileStreaming(
          pubkey,
          (profileData) => {
            if (signal?.aborted) return;
            latestProfile = profileData;
            // Update cache immediately for streaming updates
            queryClient.setQueryData(['profile', pubkey], profileData);

            // Resolve on first data to show content quickly
            doResolve();
          },
          () => {
            // EOSE: resolve if not already resolved
            doResolve();
          }
        );

        // Cancel subscription if query is aborted
        signal?.addEventListener('abort', cancel);
      });
    },
    enabled: !!pubkey,
  });

  const loading = resolvingPubkey || fetchingProfile;
  const error = resolveError
    ? resolveError instanceof Error
      ? resolveError.message
      : 'Failed to resolve identifier'
    : profileError
      ? profileError instanceof Error
        ? profileError.message
        : 'Failed to load profile'
      : null;

  return { profile: profile ?? null, pubkey: pubkey ?? null, loading, error };
}
