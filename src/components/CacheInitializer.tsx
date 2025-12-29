'use client';

import { useEffect } from 'react';
import { connectNDK } from '@/lib/ndk';
import { startCleanupScheduler, stopCleanupScheduler } from '@/lib/ndk/cleanup';

export function CacheInitializer() {
  useEffect(() => {
    connectNDK().catch((error) => {
      console.error('[CacheInitializer] Failed to connect NDK:', error);
    });
    startCleanupScheduler();

    return () => {
      stopCleanupScheduler();
    };
  }, []);

  return null;
}
