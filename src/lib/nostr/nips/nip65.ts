/**
 * NIP-65: Relay List Metadata
 * https://github.com/nostr-protocol/nips/blob/master/65.md
 *
 * Defines kind 10002 events for advertising preferred relays:
 * - 'r' tags list relay URLs with optional read/write markers
 * - Used for outbox model to discover where to find user's events
 */

/**
 * Detect mobile for relay optimization
 */
const isMobile = typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/**
 * Default relays to use when user's relay list is unknown
 * Mobile uses only 2 relays to save memory and battery
 */
export const DEFAULT_RELAYS = isMobile
  ? [
      'wss://relay.damus.io',
      'wss://nos.lol',
    ]
  : [
      'wss://relay.damus.io',
      'wss://nos.lol',
      'wss://relay.snort.social',
      'wss://relay.primal.net',
    ];

/**
 * Bootstrap relays for discovering user relay preferences
 * Mobile uses only 1 bootstrap relay
 */
export const BOOTSTRAP_RELAYS = isMobile
  ? ['wss://purplepag.es']
  : ['wss://purplepag.es', 'wss://relay.damus.io'];

/**
 * Kind number for relay list metadata events
 */
export const RELAY_LIST_KIND = 10002;

export interface RelayMetadata {
  url: string;
  read: boolean;
  write: boolean;
}

export interface RelayList {
  /** Relays where the user reads from */
  read: string[];
  /** Relays where the user writes to */
  write: string[];
  /** All relays (union of read and write) */
  all: string[];
}

/**
 * Parse relay list from kind 10002 event tags
 */
export function parseRelayList(tags: string[][]): RelayList {
  const read: string[] = [];
  const write: string[] = [];
  const all = new Set<string>();

  for (const tag of tags) {
    if (tag[0] !== 'r' || !tag[1]) continue;

    const url = normalizeRelayUrl(tag[1]);
    if (!url) continue;

    const marker = tag[2]?.toLowerCase();

    if (marker === 'read') {
      read.push(url);
      all.add(url);
    } else if (marker === 'write') {
      write.push(url);
      all.add(url);
    } else {
      // No marker means both read and write
      read.push(url);
      write.push(url);
      all.add(url);
    }
  }

  return {
    read,
    write,
    all: Array.from(all),
  };
}

/**
 * Build tags for a kind 10002 event
 */
export function buildRelayListTags(relays: RelayMetadata[]): string[][] {
  return relays.map((relay) => {
    const tag = ['r', relay.url];

    if (relay.read && !relay.write) {
      tag.push('read');
    } else if (relay.write && !relay.read) {
      tag.push('write');
    }
    // If both read and write, no marker needed

    return tag;
  });
}

/**
 * Normalize a relay URL
 * - Ensures wss:// or ws:// protocol
 * - Removes trailing slashes
 * - Lowercases the host
 */
export function normalizeRelayUrl(url: string): string | null {
  try {
    // Add protocol if missing
    let normalized = url.trim();
    if (!normalized.startsWith('wss://') && !normalized.startsWith('ws://')) {
      normalized = 'wss://' + normalized;
    }

    const parsed = new URL(normalized);

    // Must be websocket protocol
    if (parsed.protocol !== 'wss:' && parsed.protocol !== 'ws:') {
      return null;
    }

    // Reconstruct with normalized format
    return `${parsed.protocol}//${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname}`;
  } catch {
    return null;
  }
}

/**
 * Check if a URL is a valid relay URL
 */
export function isValidRelayUrl(url: string): boolean {
  return normalizeRelayUrl(url) !== null;
}

/**
 * Merge multiple relay lists, deduplicating URLs
 */
export function mergeRelayLists(...lists: RelayList[]): RelayList {
  const readSet = new Set<string>();
  const writeSet = new Set<string>();

  for (const list of lists) {
    for (const url of list.read) {
      readSet.add(url);
    }
    for (const url of list.write) {
      writeSet.add(url);
    }
  }

  const read = Array.from(readSet);
  const write = Array.from(writeSet);
  const all = Array.from(new Set([...read, ...write]));

  return { read, write, all };
}

/**
 * Get relays for reading a user's events (their write relays)
 * In the outbox model, we read from where they write
 */
export function getReadRelaysFor(relayList: RelayList): string[] {
  return relayList.write.length > 0 ? relayList.write : relayList.all;
}

/**
 * Get relays for sending events to a user (their read relays)
 * In the outbox model, we write to where they read
 */
export function getWriteRelaysFor(relayList: RelayList): string[] {
  return relayList.read.length > 0 ? relayList.read : relayList.all;
}
