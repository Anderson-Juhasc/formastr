'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchRelayListStreaming } from '@/lib/ndk/relays';
import { RelayList, DEFAULT_RELAYS } from '@/lib/nostr/nips/nip65';

interface UseRelaysResult {
  relays: RelayList | null;
  loading: boolean;
  error: string | null;
  isDefault: boolean;
}

export function useRelays(pubkey: string | null): UseRelaysResult {
  const [relays, setRelays] = useState<RelayList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const lastPubkeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pubkey) {
      setRelays(null);
      setLoading(false);
      setIsDefault(false);
      return;
    }

    // Reset if pubkey changed
    if (lastPubkeyRef.current !== pubkey) {
      lastPubkeyRef.current = pubkey;
      setRelays(null);
      setLoading(true);
      setError(null);
      setIsDefault(false);
    }

    let found = false;

    const { cancel } = fetchRelayListStreaming(
      pubkey,
      (relayList) => {
        found = true;
        setRelays(relayList);
        setIsDefault(false);
      },
      () => {
        // If no relay list found, use defaults
        if (!found) {
          setRelays({
            read: DEFAULT_RELAYS,
            write: DEFAULT_RELAYS,
            all: DEFAULT_RELAYS,
          });
          setIsDefault(true);
        }
        setLoading(false);
      }
    );

    return () => {
      cancel();
    };
  }, [pubkey]);

  return {
    relays,
    loading,
    error,
    isDefault,
  };
}
