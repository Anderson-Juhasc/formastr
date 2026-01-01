'use client';

import { useEffect } from 'react';
import { connectNDK, disconnectNDK } from '@/lib/ndk';
import { startCleanupScheduler, stopCleanupScheduler } from '@/lib/ndk/cleanup';
import { initVisibilityHandler, cleanupVisibilityHandler } from '@/lib/ndk/visibility';
import { initMemoryPressure, cleanupMemoryPressure } from '@/lib/ndk/memory-pressure';
import { subscriptionManager } from '@/lib/ndk/subscription-manager';
import { resetStatsQueue } from '@/lib/ndk/concurrency';
import { clearStatsCache } from '@/lib/ndk/stats-cache';

export function CacheInitializer() {
  useEffect(() => {
    // Initialize visibility handler first (handles pause/resume on tab switch)
    initVisibilityHandler();

    // Initialize memory pressure detection (triggers cleanup on low memory)
    initMemoryPressure();

    // Connect to NDK relays
    connectNDK().catch((error) => {
      console.error('[CacheInitializer] Failed to connect NDK:', error);
    });

    // Start periodic cache cleanup
    startCleanupScheduler();

    return () => {
      // Stop cleanup scheduler
      stopCleanupScheduler();

      // Stop all active subscriptions
      subscriptionManager.stopAll();

      // Reset concurrency queue
      resetStatsQueue();

      // Clear in-memory caches
      clearStatsCache();

      // Cleanup memory pressure detection
      cleanupMemoryPressure();

      // Cleanup visibility handler
      cleanupVisibilityHandler();

      // Disconnect NDK (closes WebSocket connections)
      disconnectNDK().catch(() => {
        // Ignore errors during cleanup
      });
    };
  }, []);

  return null;
}
