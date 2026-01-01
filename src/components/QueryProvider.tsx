'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { onMemoryPressure, isLowMemory } from '@/lib/ndk/memory-pressure';

// Detect mobile for more aggressive cache limits
const isMobile = typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// Cache limits
const MAX_CACHE_QUERIES = isMobile ? 100 : 500;
const CACHE_CLEANUP_INTERVAL = isMobile ? 60_000 : 300_000; // 1 min mobile, 5 min desktop

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // More aggressive on mobile
            staleTime: isMobile ? 60_000 : 2 * 60_000,      // 1 min mobile, 2 min desktop
            gcTime: isMobile ? 3 * 60_000 : 10 * 60_000,    // 3 min mobile, 10 min desktop
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: isMobile ? 0 : 1,  // No retries on mobile to save bandwidth
          },
        },
      })
  );

  // Periodic cache cleanup to enforce max entries
  useEffect(() => {
    const cleanup = (aggressive = false) => {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();

      // Use lower limit on low memory devices or during memory pressure
      const limit = aggressive || isLowMemory()
        ? Math.floor(MAX_CACHE_QUERIES / 2)
        : MAX_CACHE_QUERIES;

      if (queries.length > limit) {
        // Sort by last updated time (oldest first)
        const sortedQueries = [...queries].sort((a, b) => {
          const aTime = a.state.dataUpdatedAt || 0;
          const bTime = b.state.dataUpdatedAt || 0;
          return aTime - bTime;
        });

        // Remove oldest queries to get back under limit
        const toRemove = sortedQueries.slice(0, queries.length - limit);
        for (const query of toRemove) {
          cache.remove(query);
        }
      }
    };

    // Run cleanup periodically
    const interval = setInterval(() => cleanup(false), CACHE_CLEANUP_INTERVAL);

    // Also run on visibility change (when returning to page)
    const handleVisibility = () => {
      if (!document.hidden) {
        cleanup(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Subscribe to memory pressure events for aggressive cleanup
    const unsubscribeMemory = onMemoryPressure(() => {
      cleanup(true);
    });

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      unsubscribeMemory();
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
