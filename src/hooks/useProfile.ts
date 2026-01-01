'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
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
        let streamCancel: (() => void) | null = null;

        const cleanup = () => {
          // Remove abort listener to prevent memory leak
          signal?.removeEventListener('abort', abortHandler);
        };

        const doResolve = () => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve(latestProfile);
          }
        };

        // Handler for abort signal - must be named for removal
        const abortHandler = () => {
          streamCancel?.();
          doResolve();
        };

        signal?.addEventListener('abort', abortHandler);

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

        streamCancel = cancel;
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
