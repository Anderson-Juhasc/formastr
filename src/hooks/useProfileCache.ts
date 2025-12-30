'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Profile } from '@/types/nostr';
import { fetchProfileStreaming } from '@/lib/ndk/profiles';

interface UseProfileCacheResult {
  profile: Profile | null;
  loading: boolean;
}

/**
 * Lightweight profile hook that shares cache with useProfile
 * Use this for mentions, embedded notes, and other places that need profile data
 * without the full useProfile overhead (no identifier resolution)
 */
export function useProfileCache(pubkey: string | null): UseProfileCacheResult {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
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
            doResolve();
          }
        );

        signal?.addEventListener('abort', cancel);
      });
    },
    enabled: !!pubkey && pubkey.length === 64,
    staleTime: 5 * 60 * 1000, // 5 minutes - profiles don't change often
  });

  return {
    profile: profile ?? null,
    loading: isLoading,
  };
}
