import { NDKEvent, NDKSubscription, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/ndk';
import { ensureConnected, safeSubscribe } from './index';
import { EOSE_DELAY } from './constants';
import { subscriptionManager } from './subscription-manager';
import { isPageVisible } from './visibility';

export interface NoteStats {
  replies: number;
  reposts: number;
  likes: number;
  zaps: number;
  zapsAmount: number; // in sats
}

// Maximum seen items to prevent unbounded growth (single set for all types)
const MAX_SEEN_EVENTS = 1000;

/**
 * Fetch note stats with streaming - updates callback as events arrive
 * Returns immediately with zeros, then updates incrementally
 * Uses a SINGLE subscription for all stat types (replies, reposts, likes, zaps)
 * This reduces WebSocket overhead from 4 subs to 1 sub per note
 */
export function fetchNoteStatsStreaming(
  noteId: string,
  onStats: (stats: NoteStats) => void,
  onComplete: () => void
): { cancel: () => void } {
  // Validate input - empty noteId would cause "No filters to merge" error
  if (!noteId || typeof noteId !== 'string' || noteId.length === 0) {
    onComplete();
    return { cancel: () => {} };
  }

  // Don't start new fetches if page is not visible
  if (!isPageVisible()) {
    onComplete();
    return { cancel: () => {} };
  }

  const stats: NoteStats = {
    replies: 0,
    reposts: 0,
    likes: 0,
    zaps: 0,
    zapsAmount: 0,
  };

  // Single seen set for all event types (more memory efficient)
  const seen = new Set<string>();

  let cancelled = false;
  let sub: NDKSubscription | null = null;
  let eoseTimeout: ReturnType<typeof setTimeout> | null = null;
  const subId = subscriptionManager.generateId(`stats-${noteId.slice(0, 8)}`);

  const cleanup = () => {
    try {
      sub?.stop();
    } catch {
      // Ignore errors during cleanup
    }
    sub = null;
    seen.clear();
    subscriptionManager.unregister(subId);
  };

  ensureConnected().then(() => {
    if (cancelled) return;

    // Combined subscription for all stat types: replies (1), reposts (6), likes (7), zaps (9735)
    sub = safeSubscribe(
      { kinds: [1, 6, 7, 9735], '#e': [noteId] },
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
      if (seen.has(event.id)) return;

      // Bound the seen set
      if (seen.size >= MAX_SEEN_EVENTS) {
        const firstKey = seen.values().next().value;
        if (firstKey) seen.delete(firstKey);
      }
      seen.add(event.id);

      // Categorize by event kind
      switch (event.kind) {
        case 1: // Reply
          stats.replies++;
          break;
        case 6: // Repost
          stats.reposts++;
          break;
        case 7: // Reaction/Like
          stats.likes++;
          break;
        case 9735: // Zap receipt
          stats.zaps++;
          // Parse zap amount from bolt11 invoice
          const bolt11Tag = event.tags.find((t) => t[0] === 'bolt11');
          if (bolt11Tag?.[1]) {
            const amount = parseZapAmount(bolt11Tag[1]);
            if (amount) {
              stats.zapsAmount += amount;
            }
          }
          break;
      }

      onStats({ ...stats });
    });

    sub.on('eose', () => {
      if (cancelled) return;
      eoseTimeout = setTimeout(() => {
        if (cancelled) return;
        cleanup();
        onComplete();
      }, EOSE_DELAY);
    });

    // Register subscription with the manager
    subscriptionManager.register(subId, sub, cleanup);
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
      cleanup();
    },
  };
}

/**
 * Fetch note stats (Promise-based, for backwards compatibility)
 */
export async function fetchNoteStats(noteId: string): Promise<NoteStats> {
  // Validate input
  if (!noteId || typeof noteId !== 'string' || noteId.length === 0) {
    return {
      replies: 0,
      reposts: 0,
      likes: 0,
      zaps: 0,
      zapsAmount: 0,
    };
  }

  return new Promise((resolve) => {
    let latestStats: NoteStats = {
      replies: 0,
      reposts: 0,
      likes: 0,
      zaps: 0,
      zapsAmount: 0,
    };

    const { cancel } = fetchNoteStatsStreaming(
      noteId,
      (stats) => {
        latestStats = stats;
      },
      () => {
        cancel();
        resolve(latestStats);
      }
    );
  });
}

// Parse amount from bolt11 invoice (simplified)
function parseZapAmount(bolt11: string): number {
  const lower = bolt11.toLowerCase();

  // Find amount in invoice: ln{bc|tb}{amount}{multiplier}
  // lnbc = mainnet, lntb = testnet
  const match = lower.match(/^ln(?:bc|tb)(\d+)([munp])?/);
  if (!match) return 0;

  const value = parseInt(match[1], 10);
  const multiplier = match[2];

  // Convert to millisats then to sats
  let msats = 0;
  switch (multiplier) {
    case 'm': // milli-bitcoin (0.001 BTC)
      msats = value * 100000000;
      break;
    case 'u': // micro-bitcoin (0.000001 BTC)
      msats = value * 100000;
      break;
    case 'n': // nano-bitcoin (0.000000001 BTC)
      msats = value * 100;
      break;
    case 'p': // pico-bitcoin (0.000000000001 BTC)
      msats = value / 10;
      break;
    default: // no multiplier means BTC
      msats = value * 100000000000;
  }

  return Math.floor(msats / 1000); // Convert to sats
}

export function formatZapAmount(sats: number): string {
  if (sats >= 1000000) {
    return (sats / 1000000).toFixed(1) + 'M';
  }
  if (sats >= 1000) {
    return (sats / 1000).toFixed(1) + 'K';
  }
  return sats.toString();
}
