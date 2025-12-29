import { NDKEvent, NDKSubscription, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/ndk';
import { ensureConnected, safeSubscribe } from './index';
import { EOSE_DELAY } from './constants';

export interface NoteStats {
  replies: number;
  reposts: number;
  likes: number;
  zaps: number;
  zapsAmount: number; // in sats
}

/**
 * Fetch note stats with streaming - updates callback as events arrive
 * Returns immediately with zeros, then updates incrementally
 * Uses PARALLEL for cache + network
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

  const stats: NoteStats = {
    replies: 0,
    reposts: 0,
    likes: 0,
    zaps: 0,
    zapsAmount: 0,
  };

  // Track seen event IDs to avoid duplicates
  const seenReplies = new Set<string>();
  const seenReposts = new Set<string>();
  const seenLikes = new Set<string>();
  const seenZaps = new Set<string>();

  let eoseCount = 0;
  let completed = false;
  const subs: NDKSubscription[] = [];
  let cancelled = false;
  let completeTimeout: ReturnType<typeof setTimeout> | null = null;

  const cleanup = () => {
    for (const sub of subs) {
      sub.stop();
    }
    subs.length = 0;
    seenReplies.clear();
    seenReposts.clear();
    seenLikes.clear();
    seenZaps.clear();
  };

  const checkComplete = () => {
    eoseCount++;
    if (eoseCount >= 4 && !completed) {
      completed = true;
      completeTimeout = setTimeout(() => {
        if (cancelled) return;
        cleanup();
        onComplete();
      }, EOSE_DELAY);
    }
  };

  ensureConnected().then(() => {
    if (cancelled) return;

    // Replies (kind 1)
    const repliesSub = safeSubscribe(
      { kinds: [1], '#e': [noteId] },
      {
        closeOnEose: true,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL,
      }
    );
    if (repliesSub) {
      repliesSub.on('event', (event: NDKEvent) => {
        if (cancelled) return;
        if (!seenReplies.has(event.id)) {
          seenReplies.add(event.id);
          stats.replies++;
          onStats({ ...stats });
        }
      });
      repliesSub.on('eose', checkComplete);
      subs.push(repliesSub);
    } else {
      checkComplete();
    }

    // Reposts (kind 6)
    const repostsSub = safeSubscribe(
      { kinds: [6], '#e': [noteId] },
      {
        closeOnEose: true,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL,
      }
    );
    if (repostsSub) {
      repostsSub.on('event', (event: NDKEvent) => {
        if (cancelled) return;
        if (!seenReposts.has(event.id)) {
          seenReposts.add(event.id);
          stats.reposts++;
          onStats({ ...stats });
        }
      });
      repostsSub.on('eose', checkComplete);
      subs.push(repostsSub);
    } else {
      checkComplete();
    }

    // Reactions/Likes (kind 7)
    const likesSub = safeSubscribe(
      { kinds: [7], '#e': [noteId] },
      {
        closeOnEose: true,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL,
      }
    );
    if (likesSub) {
      likesSub.on('event', (event: NDKEvent) => {
        if (cancelled) return;
        if (!seenLikes.has(event.id)) {
          seenLikes.add(event.id);
          stats.likes++;
          onStats({ ...stats });
        }
      });
      likesSub.on('eose', checkComplete);
      subs.push(likesSub);
    } else {
      checkComplete();
    }

    // Zap receipts (kind 9735)
    const zapsSub = safeSubscribe(
      { kinds: [9735], '#e': [noteId] },
      {
        closeOnEose: true,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL,
      }
    );
    if (zapsSub) {
      zapsSub.on('event', (event: NDKEvent) => {
        if (cancelled) return;
        if (!seenZaps.has(event.id)) {
          seenZaps.add(event.id);
          stats.zaps++;

          // Parse zap amount
          const bolt11Tag = event.tags.find((t) => t[0] === 'bolt11');
          if (bolt11Tag?.[1]) {
            const amount = parseZapAmount(bolt11Tag[1]);
            if (amount) {
              stats.zapsAmount += amount;
            }
          }

          onStats({ ...stats });
        }
      });
      zapsSub.on('eose', checkComplete);
      subs.push(zapsSub);
    } else {
      checkComplete();
    }
  }).catch(() => {
    if (!cancelled) {
      onComplete();
    }
  });

  return {
    cancel: () => {
      cancelled = true;
      if (completeTimeout) {
        clearTimeout(completeTimeout);
        completeTimeout = null;
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
