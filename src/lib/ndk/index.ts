import NDK from '@nostr-dev-kit/ndk';
import NDKCacheAdapterDexie from '@nostr-dev-kit/ndk-cache-dexie';
import { DEFAULT_RELAYS, BOOTSTRAP_RELAYS } from '../nostr/relays';

// Create cache adapter with Dexie (IndexedDB)
const cacheAdapter = new NDKCacheAdapterDexie({ dbName: 'ndk-cache' });

// Create NDK singleton
export const ndk = new NDK({
  explicitRelayUrls: DEFAULT_RELAYS,
  outboxRelayUrls: BOOTSTRAP_RELAYS,
  enableOutboxModel: true,
  cacheAdapter,
});

// Connection promise for awaiting
let connectionPromise: Promise<void> | null = null;

// Shutdown flag to prevent new connections during cleanup
let isShuttingDown = false;

/**
 * Connect to relays (idempotent - safe to call multiple times)
 * Returns a promise that resolves when connected
 */
export async function connectNDK(): Promise<void> {
  if (connectionPromise) return connectionPromise;

  connectionPromise = ndk.connect().catch((error) => {
    console.error('[NDK] Connection error:', error);
    connectionPromise = null; // Allow retry on error
    throw error;
  });

  return connectionPromise;
}

/**
 * Ensure NDK is connected before proceeding
 * Call this before any subscription
 */
export async function ensureConnected(): Promise<void> {
  if (isShuttingDown) {
    throw new Error('NDK is shutting down');
  }
  if (!connectionPromise) {
    await connectNDK();
  } else {
    await connectionPromise;
  }
}

/**
 * Disconnect NDK and cleanup all resources
 * Call this on app unmount or before page unload
 */
export async function disconnectNDK(): Promise<void> {
  isShuttingDown = true;

  // Close all relay connections
  try {
    for (const relay of ndk.pool.relays.values()) {
      relay.disconnect();
    }
  } catch {
    // Ignore errors during cleanup
  }

  // Clear connection promise
  connectionPromise = null;

  // Reset shutdown flag after cleanup
  isShuttingDown = false;
}

/**
 * Get connection status
 */
export function isNDKConnected(): boolean {
  return connectionPromise !== null;
}

/**
 * Validate NDK filter to prevent "No filters to merge" error
 * Returns true if filter is valid, false otherwise
 */
export function isValidFilter(filter: Record<string, unknown>): boolean {
  if (!filter || typeof filter !== 'object') return false;

  // Check if filter has at least one valid field
  const validFields = ['ids', 'authors', 'kinds', '#e', '#p', '#t', 'since', 'until', 'limit'];

  for (const field of validFields) {
    const value = filter[field];
    if (value !== undefined && value !== null) {
      // Arrays must not be empty
      if (Array.isArray(value)) {
        if (value.length > 0 && value.every((v) => v && typeof v === 'string' && v.length > 0)) {
          return true;
        }
      } else if (typeof value === 'number' && value > 0) {
        // Numbers like 'since', 'until', 'limit' are valid
        return true;
      }
    }
  }

  return false;
}

/**
 * Safe subscribe wrapper that validates filters before subscribing
 * Prevents "No filters to merge" error
 */
export function safeSubscribe(
  filter: Parameters<typeof ndk.subscribe>[0],
  opts?: Parameters<typeof ndk.subscribe>[1]
): ReturnType<typeof ndk.subscribe> | null {
  // Validate the filter
  if (!isValidFilter(filter as Record<string, unknown>)) {
    console.warn('[NDK] Invalid filter, skipping subscription:', filter);
    return null;
  }

  return ndk.subscribe(filter, opts);
}

// Auto-connect on module load (browser only)
if (typeof window !== 'undefined') {
  connectNDK().catch(() => {
    // Ignore initial connection errors, will retry on first subscribe
  });
}

// Re-export NDK types for convenience
export type { NDKEvent, NDKFilter, NDKSubscription } from '@nostr-dev-kit/ndk';
export { NDKKind } from '@nostr-dev-kit/ndk';
