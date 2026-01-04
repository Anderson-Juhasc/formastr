/**
 * Server-side metadata utilities for SEO
 *
 * These functions are designed to run during generateMetadata on the server.
 * They use simple fetch-based approaches with short timeouts to avoid
 * blocking page rendering while still providing SEO benefits.
 */

import { nip19 } from 'nostr-tools';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://formastr.app';
const SITE_NAME = 'Formastr';

// Default relays for metadata fetching (fast, reliable relays)
const METADATA_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
];

// Short timeout for metadata fetching (don't block page load)
const METADATA_TIMEOUT = 2000;

export interface ProfileMetadata {
  pubkey: string;
  npub: string;
  name?: string;
  displayName?: string;
  picture?: string;
  about?: string;
  nip05?: string;
}

export interface NoteMetadata {
  id: string;
  pubkey: string;
  content: string;
  createdAt: number;
}

/**
 * Resolve identifier to pubkey (server-side safe)
 */
export async function resolveIdentifierForMetadata(
  identifier: string
): Promise<{ pubkey: string; relays?: string[] } | null> {
  const trimmed = identifier.trim();

  // npub
  if (trimmed.startsWith('npub1')) {
    try {
      const decoded = nip19.decode(trimmed);
      if (decoded.type === 'npub') {
        return { pubkey: decoded.data };
      }
    } catch {
      return null;
    }
  }

  // nprofile
  if (trimmed.startsWith('nprofile1')) {
    try {
      const decoded = nip19.decode(trimmed);
      if (decoded.type === 'nprofile') {
        return { pubkey: decoded.data.pubkey, relays: decoded.data.relays };
      }
    } catch {
      return null;
    }
  }

  // Hex pubkey
  if (/^[0-9a-f]{64}$/i.test(trimmed)) {
    return { pubkey: trimmed.toLowerCase() };
  }

  // NIP-05 identifier
  if (trimmed.includes('@') || trimmed.includes('.')) {
    try {
      let name: string;
      let domain: string;

      if (trimmed.includes('@')) {
        [name, domain] = trimmed.split('@');
      } else {
        name = '_';
        domain = trimmed;
      }

      const url = `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(name)}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(2000),
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        const pubkey = data.names?.[name];
        if (pubkey) {
          const relays = data.relays?.[pubkey];
          return { pubkey, relays };
        }
      }
    } catch {
      // NIP-05 lookup failed
    }
  }

  return null;
}

/**
 * Fetch profile metadata from relays (server-side safe)
 */
export async function fetchProfileMetadata(
  pubkey: string,
  relayHints?: string[]
): Promise<ProfileMetadata | null> {
  const relays = relayHints?.length ? relayHints : METADATA_RELAYS;

  // Create filter for kind 0 (profile metadata)
  const filter = JSON.stringify(['REQ', 'meta', { kinds: [0], authors: [pubkey], limit: 1 }]);

  // Race all relays for fastest response
  const fetchFromRelay = async (relay: string): Promise<ProfileMetadata | null> => {
    return new Promise((resolve) => {
      let ws: WebSocket | null = null;
      let resolved = false;

      const cleanup = () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(null);
        }
      }, METADATA_TIMEOUT);

      try {
        ws = new WebSocket(relay);

        ws.onopen = () => {
          ws?.send(filter);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg[0] === 'EVENT' && msg[1] === 'meta' && msg[2]) {
              const eventData = msg[2];
              if (eventData.kind === 0 && eventData.pubkey === pubkey) {
                const content = JSON.parse(eventData.content);
                if (!resolved) {
                  resolved = true;
                  clearTimeout(timeout);
                  cleanup();
                  resolve({
                    pubkey,
                    npub: nip19.npubEncode(pubkey),
                    name: content.name,
                    displayName: content.displayName || content.display_name,
                    picture: content.image || content.picture,
                    about: content.about,
                    nip05: content.nip05,
                  });
                }
              }
            } else if (msg[0] === 'EOSE') {
              // End of stored events - no profile found on this relay
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                cleanup();
                resolve(null);
              }
            }
          } catch {
            // Parse error, ignore
          }
        };

        ws.onerror = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            cleanup();
            resolve(null);
          }
        };
      } catch {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(null);
        }
      }
    });
  };

  // Race all relays
  const results = await Promise.all(relays.map(fetchFromRelay));
  return results.find((r) => r !== null) || null;
}

/**
 * Fetch note metadata from relays (server-side safe)
 */
export async function fetchNoteMetadata(
  noteId: string,
  relayHints?: string[]
): Promise<NoteMetadata | null> {
  const relays = relayHints?.length ? relayHints : METADATA_RELAYS;

  // Create filter for the note by ID
  const filter = JSON.stringify(['REQ', 'note', { ids: [noteId], limit: 1 }]);

  const fetchFromRelay = async (relay: string): Promise<NoteMetadata | null> => {
    return new Promise((resolve) => {
      let ws: WebSocket | null = null;
      let resolved = false;

      const cleanup = () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(null);
        }
      }, METADATA_TIMEOUT);

      try {
        ws = new WebSocket(relay);

        ws.onopen = () => {
          ws?.send(filter);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg[0] === 'EVENT' && msg[1] === 'note' && msg[2]) {
              const eventData = msg[2];
              if (eventData.id === noteId) {
                if (!resolved) {
                  resolved = true;
                  clearTimeout(timeout);
                  cleanup();
                  resolve({
                    id: eventData.id,
                    pubkey: eventData.pubkey,
                    content: eventData.content,
                    createdAt: eventData.created_at,
                  });
                }
              }
            } else if (msg[0] === 'EOSE') {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                cleanup();
                resolve(null);
              }
            }
          } catch {
            // Parse error
          }
        };

        ws.onerror = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            cleanup();
            resolve(null);
          }
        };
      } catch {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(null);
        }
      }
    });
  };

  const results = await Promise.all(relays.map(fetchFromRelay));
  return results.find((r) => r !== null) || null;
}

/**
 * Decode note identifier to hex ID
 */
export function decodeNoteId(identifier: string): { id: string; relays?: string[] } | null {
  let id = identifier;

  // Strip nostr: prefix if present
  if (id.startsWith('nostr:')) {
    id = id.slice(6);
  }

  // note1...
  if (id.startsWith('note1')) {
    try {
      const decoded = nip19.decode(id);
      if (decoded.type === 'note') {
        return { id: decoded.data };
      }
    } catch {
      return null;
    }
  }

  // nevent1...
  if (id.startsWith('nevent1')) {
    try {
      const decoded = nip19.decode(id);
      if (decoded.type === 'nevent') {
        return { id: decoded.data.id, relays: decoded.data.relays };
      }
    } catch {
      return null;
    }
  }

  // Hex ID
  if (/^[a-f0-9]{64}$/i.test(id)) {
    return { id: id.toLowerCase() };
  }

  return null;
}

/**
 * Helper to format display name for metadata
 */
export function formatDisplayName(profile: ProfileMetadata | null, npub: string): string {
  if (profile?.displayName) return profile.displayName;
  if (profile?.name) return profile.name;
  return `${npub.slice(0, 8)}...${npub.slice(-4)}`;
}

/**
 * Helper to truncate text for descriptions
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trim() + '...';
}

export { SITE_URL, SITE_NAME };
