'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

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
    const cleanup = () => {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();

      if (queries.length > MAX_CACHE_QUERIES) {
        // Sort by last updated time (oldest first)
        const sortedQueries = [...queries].sort((a, b) => {
          const aTime = a.state.dataUpdatedAt || 0;
          const bTime = b.state.dataUpdatedAt || 0;
          return aTime - bTime;
        });

        // Remove oldest queries to get back under limit
        const toRemove = sortedQueries.slice(0, queries.length - MAX_CACHE_QUERIES);
        for (const query of toRemove) {
          cache.remove(query);
        }
      }
    };

    // Run cleanup periodically
    const interval = setInterval(cleanup, CACHE_CLEANUP_INTERVAL);

    // Also run on visibility change (when returning to page)
    const handleVisibility = () => {
      if (!document.hidden) {
        cleanup();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
