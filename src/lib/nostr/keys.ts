/**
 * Key utilities for Nostr
 *
 * This module provides high-level utilities for working with Nostr identifiers.
 * It uses the NIP implementations from ./nips/ for the underlying functionality.
 */

import * as nip05 from './nips/nip05';
import * as nip19 from './nips/nip19';

// Re-export NIP-19 utilities for backwards compatibility
export const npubToHex = nip19.npubToHex;
export const hexToNpub = nip19.hexToNpub;
export const isValidHex = nip19.isValidHex;
export const isNpub = nip19.isNpub;
export const isNprofile = nip19.isNprofile;

/**
 * Resolve any identifier format to a pubkey
 *
 * Supported formats:
 * - npub1... (NIP-19)
 * - nprofile1... (NIP-19)
 * - 64-character hex pubkey
 * - user@domain.com (NIP-05)
 * - domain.com (NIP-05, implies _@domain.com)
 */
export async function resolveIdentifier(input: string): Promise<{ pubkey: string; relays?: string[] }> {
  const trimmed = input.trim();

  // npub (NIP-19)
  if (trimmed.startsWith('npub1')) {
    try {
      const decoded = nip19.decode(trimmed);
      if (decoded.type === 'npub') {
        return { pubkey: decoded.data };
      }
    } catch {
      throw new Error('Invalid npub');
    }
  }

  // nprofile (NIP-19)
  if (trimmed.startsWith('nprofile1')) {
    try {
      const decoded = nip19.decode(trimmed);
      if (decoded.type === 'nprofile') {
        return { pubkey: decoded.data.pubkey, relays: decoded.data.relays };
      }
    } catch {
      throw new Error('Invalid nprofile');
    }
  }

  // Hex pubkey
  if (nip19.isValidHex(trimmed)) {
    return { pubkey: trimmed.toLowerCase() };
  }

  // NIP-05 identifier
  if (nip05.isNIP05Identifier(trimmed)) {
    const profile = await nip05.queryProfile(trimmed);
    if (profile?.pubkey) {
      return { pubkey: profile.pubkey, relays: profile.relays };
    }
    throw new Error('NIP-05 lookup failed');
  }

  throw new Error('Invalid identifier format');
}
