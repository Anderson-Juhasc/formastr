import { Profile } from '@/types/nostr';
import { hexToNpub } from '../nostr/keys';

const PRIMAL_CACHE_RELAY = 'wss://cache2.primal.net/v1';

interface PrimalEvent {
  kind: number;
  pubkey: string;
  content: string;
  created_at: number;
}

function parseProfileFromEvent(event: PrimalEvent): Profile {
  let profileData: Record<string, unknown> = {};
  try {
    profileData = JSON.parse(event.content);
  } catch {
    // Invalid JSON
  }

  const getString = (val: unknown): string | undefined => {
    return typeof val === 'string' ? val : undefined;
  };

  return {
    pubkey: event.pubkey,
    npub: hexToNpub(event.pubkey),
    name: getString(profileData.name),
    displayName: getString(profileData.displayName || profileData.display_name),
    picture: getString(profileData.image || profileData.picture),
    banner: getString(profileData.banner),
    about: getString(profileData.about),
    nip05: getString(profileData.nip05),
    lud16: getString(profileData.lud16),
    website: getString(profileData.website),
  };
}

export interface SearchResult {
  profile: Profile;
  matchScore?: number;
}

/**
 * Search for profiles using Primal cache relay
 * Returns profiles matching the search query
 */
export function searchProfiles(
  query: string,
  onResult: (result: SearchResult) => void,
  onComplete: () => void,
  limit = 10
): { cancel: () => void } {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) {
    onComplete();
    return { cancel: () => {} };
  }

  let cancelled = false;
  let ws: WebSocket | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const seenPubkeys = new Set<string>();
  const subId = `search_${Date.now()}`;

  try {
    ws = new WebSocket(PRIMAL_CACHE_RELAY);

    ws.onopen = () => {
      if (cancelled || !ws) return;

      // Send Primal-specific search request
      const req = JSON.stringify([
        'REQ',
        subId,
        { cache: ['user_search', { query: trimmedQuery, limit }] },
      ]);
      ws.send(req);
    };

    ws.onmessage = (event) => {
      if (cancelled) return;

      try {
        const data = JSON.parse(event.data);

        // Handle EVENT messages (kind 0 = profile)
        if (data[0] === 'EVENT' && data[1] === subId && data[2]) {
          const nostrEvent = data[2] as PrimalEvent;

          if (nostrEvent.kind === 0) {
            // Deduplicate by pubkey
            if (seenPubkeys.has(nostrEvent.pubkey)) return;
            seenPubkeys.add(nostrEvent.pubkey);

            const profile = parseProfileFromEvent(nostrEvent);
            onResult({ profile });
          }
        }

        // Handle EOSE (end of stored events)
        if (data[0] === 'EOSE' && data[1] === subId) {
          if (!cancelled) {
            cleanup();
            onComplete();
          }
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onerror = () => {
      if (!cancelled) {
        cleanup();
        onComplete();
      }
    };

    ws.onclose = () => {
      if (!cancelled) {
        onComplete();
      }
    };

    // Timeout after 5 seconds
    timeoutId = setTimeout(() => {
      if (!cancelled) {
        cleanup();
        onComplete();
      }
    }, 5000);
  } catch {
    onComplete();
    return { cancel: () => {} };
  }

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(['CLOSE', subId]));
        }
        ws.close();
      } catch {
        // Ignore close errors
      }
      ws = null;
    }
  };

  return {
    cancel: () => {
      cancelled = true;
      cleanup();
    },
  };
}
