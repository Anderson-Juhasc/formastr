'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import NDK from '@nostr-dev-kit/ndk';
import { ndk, connectNDK } from '@/lib/ndk';

interface NDKContextValue {
  ndk: NDK;
  connected: boolean;
}

const NDKContext = createContext<NDKContextValue | null>(null);

interface NDKProviderProps {
  children: ReactNode;
}

export function NDKProvider({ children }: NDKProviderProps) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    connectNDK()
      .then(() => setConnected(true))
      .catch((error) => {
        console.error('[NDKProvider] Failed to connect:', error);
      });
  }, []);

  return (
    <NDKContext.Provider value={{ ndk, connected }}>
      {children}
    </NDKContext.Provider>
  );
}

/**
 * Hook to access NDK instance
 */
export function useNDK(): NDKContextValue {
  const context = useContext(NDKContext);
  if (!context) {
    throw new Error('useNDK must be used within NDKProvider');
  }
  return context;
}
