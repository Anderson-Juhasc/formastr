import Dexie from 'dexie';

// Max age for NDK cache entries (30 days)
const NDK_CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

/**
 * Prune old entries from NDK's Dexie cache database
 */
export async function pruneNDKCache(): Promise<void> {
  const now = Date.now();

  try {
    // Check if database exists
    const exists = await Dexie.exists('ndk-cache');
    if (!exists) return;

    // Open NDK's cache database
    const ndkDb = new Dexie('ndk-cache');
    await ndkDb.open();

    // Get table names
    const tables = ndkDb.tables;

    // Prune events table if it exists
    const eventsTable = tables.find((t) => t.name === 'events');
    if (eventsTable) {
      const cutoffTime = Math.floor((now - NDK_CACHE_MAX_AGE) / 1000); // Convert to seconds

      // Since created_at is not indexed, we need to iterate and filter
      const oldEventIds: string[] = [];

      await eventsTable.each((event: { id?: string; created_at?: number }) => {
        if (event.created_at && event.created_at < cutoffTime && event.id) {
          oldEventIds.push(event.id);
        }
      });

      if (oldEventIds.length > 0) {
        await eventsTable.bulkDelete(oldEventIds);

        if (process.env.NODE_ENV === 'development') {
          console.log(`[Cleanup] Pruned ${oldEventIds.length} old events from NDK cache`);
        }
      }
    }

    ndkDb.close();
  } catch (error) {
    // Silently ignore - NDK cache may have different schema
    if (process.env.NODE_ENV === 'development') {
      console.warn('NDK cache cleanup failed:', error);
    }
  }
}

// Run cleanup periodically (browser only)
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

export function startCleanupScheduler(): void {
  if (typeof window === 'undefined' || cleanupInterval) return;

  // Run cleanup every hour
  cleanupInterval = setInterval(pruneNDKCache, 60 * 60 * 1000);

  // Also run once on start (after a delay to not block)
  setTimeout(pruneNDKCache, 10000);
}

export function stopCleanupScheduler(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
