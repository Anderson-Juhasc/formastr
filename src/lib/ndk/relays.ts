import { NDKSubscriptionCacheUsage } from '@nostr-dev-kit/ndk';
import { ensureConnected, safeSubscribe } from './index';
import { parseRelayList, RelayList, RELAY_LIST_KIND } from '../nostr/nips/nip65';
import { RELAY_FETCH_TIMEOUT } from './constants';

export function fetchRelayListStreaming(
  pubkey: string,
  onRelayList: (relayList: RelayList) => void,
  onComplete: () => void
): { cancel: () => void } {
  if (!pubkey || pubkey.length === 0) {
    onComplete();
    return { cancel: () => {} };
  }

  let found = false;
  let sub: ReturnType<typeof safeSubscribe> = null;
  let cancelled = false;
  let completed = false;

  const complete = () => {
    if (completed) return;
    completed = true;
    sub?.stop();
    onComplete();
  };

  // Timeout to prevent infinite loading
  const timeoutId = setTimeout(() => {
    if (!completed) {
      console.warn('[NDK] Relay list fetch timed out for', pubkey);
      complete();
    }
  }, RELAY_FETCH_TIMEOUT);

  ensureConnected().then(() => {
    if (cancelled) {
      clearTimeout(timeoutId);
      return;
    }

    sub = safeSubscribe(
      { kinds: [RELAY_LIST_KIND], authors: [pubkey], limit: 1 },
      {
        closeOnEose: true,
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL,
      }
    );

    if (!sub) {
      clearTimeout(timeoutId);
      complete();
      return;
    }

    sub.on('event', (event) => {
      if (cancelled) return;
      if (!found && event.pubkey === pubkey) {
        found = true;
        const relayList = parseRelayList(event.tags);
        onRelayList(relayList);
      }
    });

    sub.on('eose', () => {
      if (cancelled) return;
      clearTimeout(timeoutId);
      complete();
    });
  }).catch(() => {
    if (!cancelled) {
      clearTimeout(timeoutId);
      complete();
    }
  });

  return {
    cancel: () => {
      cancelled = true;
      clearTimeout(timeoutId);
      sub?.stop();
      sub = null;
    },
  };
}

export async function fetchRelayList(pubkey: string): Promise<RelayList | null> {
  if (!pubkey || pubkey.length === 0) {
    return null;
  }

  return new Promise((resolve) => {
    let relayList: RelayList | null = null;

    const { cancel } = fetchRelayListStreaming(
      pubkey,
      (list) => {
        relayList = list;
      },
      () => {
        cancel();
        resolve(relayList);
      }
    );
  });
}
