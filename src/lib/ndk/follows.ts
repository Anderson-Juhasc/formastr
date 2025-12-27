import { NDKEvent, NDKSubscription, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/ndk';
import { ensureConnected, safeSubscribe } from './index';

export interface FollowEntry {
  pubkey: string;
  relay?: string;
  petname?: string;
}

function parseFollowList(event: NDKEvent): FollowEntry[] {
  const seen = new Set<string>();
  const following: FollowEntry[] = [];

  for (const tag of event.tags) {
    if (tag[0] === 'p' && tag[1] && !seen.has(tag[1])) {
      seen.add(tag[1]);
      following.push({
        pubkey: tag[1],
        relay: tag[2],
        petname: tag[3],
      });
    }
  }

  return following;
}

/**
 * Fetch following list with streaming - NON-BLOCKING
 * Uses PARALLEL for cache + network
 */
export function fetchFollowingStreaming(
  pubkey: string,
  onFollowing: (entries: FollowEntry[]) => void,
  onComplete: () => void
): { cancel: () => void } {
  // Validate input - empty pubkey would cause "No filters to merge" error
  if (!pubkey || typeof pubkey !== 'string' || pubkey.length === 0) {
    onFollowing([]);
    onComplete();
    return { cancel: () => {} };
  }

  let latestEvent: NDKEvent | null = null;
  let eoseReceived = false;
  let sub: NDKSubscription | null = null;
  let cancelled = false;

  ensureConnected().then(() => {
    if (cancelled) return;

    sub = safeSubscribe(
      { kinds: [3], authors: [pubkey], limit: 1 },
      {
        closeOnEose: false,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL,
      }
    );

    if (!sub) {
      onFollowing([]);
      onComplete();
      return;
    }

    sub.on('event', (event: NDKEvent) => {
      // Keep the event with most tags (most complete contact list)
      // or newer if same tag count
      if (!latestEvent ||
          event.tags.length > latestEvent.tags.length ||
          (event.tags.length === latestEvent.tags.length &&
           (event.created_at || 0) > (latestEvent.created_at || 0))) {
        latestEvent = event;
        const followList = parseFollowList(event);
        onFollowing(followList);
      }
    });

    sub.on('eose', () => {
      if (!eoseReceived) {
        eoseReceived = true;
        setTimeout(() => {
          if (!latestEvent) {
            onFollowing([]);
          }
          sub?.stop();
          onComplete();
        }, 1000);
      }
    });
  }).catch(() => {
    onFollowing([]);
    onComplete();
  });

  return {
    cancel: () => {
      cancelled = true;
      sub?.stop();
    },
  };
}

/**
 * Fetch following (Promise-based)
 */
export async function fetchFollowing(pubkey: string): Promise<FollowEntry[]> {
  // Validate input
  if (!pubkey || typeof pubkey !== 'string' || pubkey.length === 0) {
    return [];
  }

  return new Promise((resolve) => {
    let following: FollowEntry[] = [];

    const { cancel } = fetchFollowingStreaming(
      pubkey,
      (entries) => {
        following = entries;
      },
      () => {
        cancel();
        resolve(following);
      }
    );
  });
}

/**
 * Fetch followers with streaming - NON-BLOCKING
 * Followers are kind:3 events that tag this pubkey
 * Uses PARALLEL for cache + network
 */
export function fetchFollowersStreaming(
  pubkey: string,
  limit: number,
  onFollower: (followerPubkey: string) => void,
  onComplete: () => void
): { cancel: () => void } {
  // Validate input - empty pubkey would cause "No filters to merge" error
  if (!pubkey || typeof pubkey !== 'string' || pubkey.length === 0) {
    onComplete();
    return { cancel: () => {} };
  }

  const seen = new Set<string>();
  let eoseReceived = false;
  let sub: NDKSubscription | null = null;
  let cancelled = false;
  let lastEventTime = Date.now();

  ensureConnected().then(() => {
    if (cancelled) return;

    // Don't set a limit in the filter - let relays return as many as they can
    // The limit param is now just a soft cap we track client-side
    sub = safeSubscribe(
      { kinds: [3], '#p': [pubkey] },
      {
        closeOnEose: false,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL,
      }
    );

    if (!sub) {
      onComplete();
      return;
    }

    sub.on('event', (event: NDKEvent) => {
      lastEventTime = Date.now();
      if (!seen.has(event.pubkey) && seen.size < limit) {
        seen.add(event.pubkey);
        onFollower(event.pubkey);
      }
    });

    sub.on('eose', () => {
      if (!eoseReceived) {
        eoseReceived = true;
        // Wait longer for slow relays to respond
        // If we're still receiving events, keep waiting
        const checkComplete = () => {
          const timeSinceLastEvent = Date.now() - lastEventTime;
          if (timeSinceLastEvent < 1000 && seen.size < limit) {
            // Still receiving events, wait more
            setTimeout(checkComplete, 500);
          } else {
            sub?.stop();
            onComplete();
          }
        };
        setTimeout(checkComplete, 2000);
      }
    });
  }).catch(() => {
    onComplete();
  });

  return {
    cancel: () => {
      cancelled = true;
      sub?.stop();
    },
  };
}

/**
 * Fetch followers (Promise-based)
 */
export async function fetchFollowers(pubkey: string, limit = 5000): Promise<string[]> {
  // Validate input
  if (!pubkey || typeof pubkey !== 'string' || pubkey.length === 0) {
    return [];
  }

  return new Promise((resolve) => {
    const followers: string[] = [];

    const { cancel } = fetchFollowersStreaming(
      pubkey,
      limit,
      (followerPubkey) => {
        followers.push(followerPubkey);
      },
      () => {
        cancel();
        resolve(followers);
      }
    );
  });
}
