'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000,    // 2 minutes - reduce refetches
            gcTime: 10 * 60 * 1000,      // 10 minutes - keep data longer
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,   // Don't refetch on network reconnect
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
