import { NDKEvent, NDKSubscription, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/ndk';
import { nip05 } from 'nostr-tools';
import { Profile } from '@/types/nostr';
import { hexToNpub } from '../nostr/keys';
import { ensureConnected, safeSubscribe } from './index';
import { EOSE_DELAY } from './constants';

function parseProfileEvent(event: NDKEvent, pubkey: string): Profile {
  let profileData: Record<string, unknown> = {};
  try {
    profileData = JSON.parse(event.content);
  } catch {
    // Invalid JSON
  }

  const getString = (val: unknown): string | undefined => {
    return typeof val === 'string' ? val : undefined;
  };

  // Extract NIP-30 emoji tags from the event
  const emojiTags = event.tags?.filter(
    (tag) => tag[0] === 'emoji' && tag[1] && tag[2]
  );

  return {
    pubkey,
    npub: hexToNpub(pubkey),
    name: getString(profileData.name),
    displayName: getString(profileData.displayName || profileData.display_name),
    picture: getString(profileData.image || profileData.picture),
    banner: getString(profileData.banner),
    about: getString(profileData.about),
    nip05: getString(profileData.nip05),
    lud16: getString(profileData.lud16),
    website: getString(profileData.website),
    emojiTags: emojiTags?.length ? emojiTags : undefined,
  };
}

function createEmptyProfile(pubkey: string): Profile {
  return {
    pubkey: pubkey || '',
    npub: pubkey ? hexToNpub(pubkey) : '',
  };
}

// Validate hex pubkey (must be 64 character hex string)
const isValidHexPubkey = (pubkey: string) =>
  typeof pubkey === 'string' && /^[0-9a-f]{64}$/i.test(pubkey);

/**
 * Fetch profile with streaming callback - NON-BLOCKING
 * Uses PARALLEL to get both cache and network results
 */
export function fetchProfileStreaming(
  pubkey: string,
  onProfile: (profile: Profile) => void,
  onComplete: () => void
): { cancel: () => void } {
  // Validate input - must be valid 64-char hex to prevent relay errors
  if (!isValidHexPubkey(pubkey)) {
    onComplete();
    return { cancel: () => {} };
  }

  let latestCreatedAt = 0;
  let foundProfile = false;
  let eoseReceived = false;
  let sub: NDKSubscription | null = null;
  let cancelled = false;
  let eoseTimeout: ReturnType<typeof setTimeout> | null = null;

  ensureConnected().then(() => {
    if (cancelled) return;

    sub = safeSubscribe(
      { kinds: [0], authors: [pubkey], limit: 1 },
      {
        closeOnEose: true,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL,
      }
    );

    if (!sub) {
      onProfile(createEmptyProfile(pubkey));
      onComplete();
      return;
    }

    sub.on('event', (event: NDKEvent) => {
      if (cancelled) return;
      const createdAt = event.created_at || 0;
      if (createdAt > latestCreatedAt) {
        latestCreatedAt = createdAt;
        foundProfile = true;
        const profile = parseProfileEvent(event, pubkey);
        onProfile(profile);
      }
    });

    sub.on('eose', () => {
      if (cancelled || eoseReceived) return;
      eoseReceived = true;
      eoseTimeout = setTimeout(() => {
        if (cancelled) return;
        if (!foundProfile) {
          onProfile(createEmptyProfile(pubkey));
        }
        sub?.stop();
        sub = null;
        onComplete();
      }, EOSE_DELAY);
    });
  }).catch(() => {
    if (!cancelled) {
      onProfile(createEmptyProfile(pubkey));
      onComplete();
    }
  });

  return {
    cancel: () => {
      cancelled = true;
      if (eoseTimeout) {
        clearTimeout(eoseTimeout);
        eoseTimeout = null;
      }
      sub?.stop();
      sub = null;
    },
  };
}

/**
 * Fetch profile (Promise-based)
 */
export async function fetchProfile(pubkey: string, verifyNip05 = false): Promise<Profile> {
  // Validate input
  if (!pubkey || typeof pubkey !== 'string' || pubkey.length === 0) {
    return createEmptyProfile(pubkey || '');
  }

  return new Promise((resolve) => {
    let profile: Profile = createEmptyProfile(pubkey);

    const { cancel } = fetchProfileStreaming(
      pubkey,
      (p) => {
        profile = p;
      },
      () => {
        cancel();

        if (verifyNip05 && profile.nip05) {
          nip05.queryProfile(profile.nip05).then((verified) => {
            profile.nip05valid = verified?.pubkey === pubkey;
          }).catch(() => {
            profile.nip05valid = false;
          });
        }

        resolve(profile);
      }
    );
  });
}

/**
 * Fetch multiple profiles in batch with streaming
 * Uses PARALLEL for cache + network
 */
export function fetchProfilesBatchStreaming(
  pubkeys: string[],
  onProfile: (pubkey: string, profile: Profile) => void,
  onComplete: () => void
): { cancel: () => void } {
  // Filter out invalid pubkeys - must be valid 64-char hex to prevent relay errors
  const validPubkeys = pubkeys.filter(isValidHexPubkey);

  if (validPubkeys.length === 0) {
    onComplete();
    return { cancel: () => {} };
  }

  const uniquePubkeys = [...new Set(validPubkeys)];
  const latestCreatedAt = new Map<string, number>();
  let eoseReceived = false;
  let sub: NDKSubscription | null = null;
  let cancelled = false;
  let eoseTimeout: ReturnType<typeof setTimeout> | null = null;

  ensureConnected().then(() => {
    if (cancelled) return;

    sub = safeSubscribe(
      { kinds: [0], authors: uniquePubkeys },
      {
        closeOnEose: true,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL,
      }
    );

    if (!sub) {
      onComplete();
      return;
    }

    sub.on('event', (event: NDKEvent) => {
      if (cancelled) return;
      const pubkey = event.pubkey;
      const createdAt = event.created_at || 0;
      const existingCreatedAt = latestCreatedAt.get(pubkey) || 0;

      if (createdAt > existingCreatedAt) {
        latestCreatedAt.set(pubkey, createdAt);
        const profile = parseProfileEvent(event, pubkey);
        onProfile(pubkey, profile);
      }
    });

    sub.on('eose', () => {
      if (cancelled || eoseReceived) return;
      eoseReceived = true;
      eoseTimeout = setTimeout(() => {
        if (cancelled) return;
        sub?.stop();
        sub = null;
        latestCreatedAt.clear();
        onComplete();
      }, EOSE_DELAY);
    });
  }).catch(() => {
    if (!cancelled) {
      onComplete();
    }
  });

  return {
    cancel: () => {
      cancelled = true;
      if (eoseTimeout) {
        clearTimeout(eoseTimeout);
        eoseTimeout = null;
      }
      sub?.stop();
      sub = null;
      latestCreatedAt.clear();
    },
  };
}

/**
 * Fetch multiple profiles in batch - Promise-based
 */
export async function fetchProfiles(pubkeys: string[]): Promise<Map<string, Profile>> {
  const profiles = new Map<string, Profile>();

  if (pubkeys.length === 0) {
    return profiles;
  }

  return new Promise((resolve) => {
    const { cancel } = fetchProfilesBatchStreaming(
      pubkeys,
      (pubkey, profile) => {
        profiles.set(pubkey, profile);
      },
      () => {
        cancel();
        for (const pubkey of pubkeys) {
          if (!profiles.has(pubkey)) {
            profiles.set(pubkey, createEmptyProfile(pubkey));
          }
        }
        resolve(profiles);
      }
    );
  });
}
