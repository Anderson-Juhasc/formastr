import NDKCacheAdapterDexie from '@nostr-dev-kit/ndk-cache-dexie';

/**
 * Cache limit configuration
 */
export interface DexieCacheLimits {
  maxEvents: number;        // Maximum number of events to keep
  maxAgeMs: number;         // Max event age in milliseconds
  pruneIntervalMs?: number; // Optional periodic prune interval
}

/**
 * Attaches cache limiting logic to an existing Dexie adapter
 */
export function attachDexieCacheLimiter(
  adapter: NDKCacheAdapterDexie,
  limits: DexieCacheLimits
) {
  const { maxEvents, maxAgeMs, pruneIntervalMs } = limits;

  // @ts-expect-error - db is not typed but exists
  const db = adapter.db;

  if (!db) {
    console.warn('[NDK Cache Limiter] DB not initialized yet, skipping limiter setup');
    return { pruneNow: async () => {} };
  }

  /**
   * Remove events older than maxAgeMs
   */
  async function pruneByAge() {
    const cutoff = Math.floor((Date.now() - maxAgeMs) / 1000);

    try {
      await db.transaction('rw', db.events, async () => {
        await db.events
          .where('created_at')
          .below(cutoff)
          .delete();
      });
    } catch {
      // Index might not exist, fall back to iteration
      const oldEventIds: string[] = [];
      await db.events.each((event: { id?: string; created_at?: number }) => {
        if (event.created_at && event.created_at < cutoff && event.id) {
          oldEventIds.push(event.id);
        }
      });
      if (oldEventIds.length > 0) {
        await db.events.bulkDelete(oldEventIds);
      }
    }
  }

  /**
   * Keep only the newest maxEvents
   */
  async function pruneByCount() {
    const total = await db.events.count();
    if (total <= maxEvents) return;

    const excess = total - maxEvents;

    try {
      await db.transaction('rw', db.events, async () => {
        const oldEvents = await db.events
          .orderBy('created_at')
          .limit(excess)
          .primaryKeys();

        await db.events.bulkDelete(oldEvents);
      });
    } catch {
      // Index might not exist, fall back to getting all and sorting
      const allEvents = await db.events.toArray();
      allEvents.sort((a: { created_at?: number }, b: { created_at?: number }) =>
        (a.created_at || 0) - (b.created_at || 0)
      );
      const toDelete = allEvents.slice(0, excess).map((e: { id: string }) => e.id);
      if (toDelete.length > 0) {
        await db.events.bulkDelete(toDelete);
      }
    }
  }

  /**
   * Combined prune function
   */
  async function pruneNow() {
    try {
      await pruneByAge();
      await pruneByCount();
    } catch (err) {
      console.error('[NDK Cache Limiter] Prune failed', err);
    }
  }

  /**
   * Optional periodic pruning
   */
  let intervalId: ReturnType<typeof setInterval> | null = null;
  if (pruneIntervalMs && pruneIntervalMs > 0) {
    intervalId = setInterval(pruneNow, pruneIntervalMs);
  }

  /**
   * Monkey-patch setEvent to prune after writes (non-blocking)
   */
  const originalSetEvent = adapter.setEvent?.bind(adapter);

  if (originalSetEvent) {
    adapter.setEvent = async (event, relay) => {
      await originalSetEvent(event, relay);
      // Fire-and-forget pruning
      pruneNow();
    };
  }

  return {
    pruneNow,
    stop: () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  };
}
