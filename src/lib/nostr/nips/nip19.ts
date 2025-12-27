/**
 * NIP-19: bech32-encoded entities
 * https://github.com/nostr-protocol/nips/blob/master/19.md
 *
 * Handles encoding/decoding of:
 * - npub: public keys
 * - nsec: private keys (not used in this app)
 * - note: note ids
 * - nprofile: profile with relay hints
 * - nevent: event with relay hints
 * - naddr: addressable event coordinates
 */

import { nip19 } from 'nostr-tools';

// Re-export nip19 types for convenience
export type DecodeResult = ReturnType<typeof nip19.decode>;
export type ProfilePointer = nip19.ProfilePointer;
export type EventPointer = nip19.EventPointer;
export type AddressPointer = nip19.AddressPointer;

/**
 * Convert npub to hex pubkey
 */
export function npubToHex(npub: string): string {
  const decoded = nip19.decode(npub);
  if (decoded.type === 'npub') {
    return decoded.data;
  }
  throw new Error('Invalid npub');
}

/**
 * Convert hex pubkey to npub
 */
export function hexToNpub(hex: string): string {
  return nip19.npubEncode(hex);
}

/**
 * Convert note id to hex
 */
export function noteToHex(note: string): string {
  const decoded = nip19.decode(note);
  if (decoded.type === 'note') {
    return decoded.data;
  }
  throw new Error('Invalid note');
}

/**
 * Convert hex event id to note
 */
export function hexToNote(hex: string): string {
  return nip19.noteEncode(hex);
}

/**
 * Validate 64-character hex string
 */
export function isValidHex(str: string): boolean {
  return /^[0-9a-f]{64}$/i.test(str);
}

/**
 * Check if string is npub format
 */
export function isNpub(str: string): boolean {
  return str.startsWith('npub1');
}

/**
 * Check if string is nprofile format
 */
export function isNprofile(str: string): boolean {
  return str.startsWith('nprofile1');
}

/**
 * Check if string is note format
 */
export function isNote(str: string): boolean {
  return str.startsWith('note1');
}

/**
 * Check if string is nevent format
 */
export function isNevent(str: string): boolean {
  return str.startsWith('nevent1');
}

/**
 * Check if string is naddr format
 */
export function isNaddr(str: string): boolean {
  return str.startsWith('naddr1');
}

/**
 * Decode any bech32 nostr entity
 */
export function decode(bech32: string): DecodeResult {
  return nip19.decode(bech32);
}

/**
 * Encode a profile pointer (pubkey + optional relays)
 */
export function encodeProfile(pubkey: string, relays?: string[]): string {
  return nip19.nprofileEncode({ pubkey, relays });
}

/**
 * Encode an event pointer (id + optional relays + optional author)
 */
export function encodeEvent(id: string, relays?: string[], author?: string): string {
  return nip19.neventEncode({ id, relays, author });
}

/**
 * Encode an addressable event (kind + pubkey + identifier + optional relays)
 */
export function encodeAddress(
  kind: number,
  pubkey: string,
  identifier: string,
  relays?: string[]
): string {
  return nip19.naddrEncode({ kind, pubkey, identifier, relays });
}

/**
 * Try to decode, returning null on failure
 */
export function tryDecode(bech32: string): DecodeResult | null {
  try {
    return decode(bech32);
  } catch {
    return null;
  }
}

/**
 * Extract pubkey from any profile-related bech32 (npub or nprofile)
 */
export function extractPubkey(bech32: string): string | null {
  const decoded = tryDecode(bech32);
  if (!decoded) return null;

  if (decoded.type === 'npub') {
    return decoded.data;
  }
  if (decoded.type === 'nprofile') {
    return decoded.data.pubkey;
  }
  return null;
}

/**
 * Extract event id from any event-related bech32 (note or nevent)
 */
export function extractEventId(bech32: string): string | null {
  const decoded = tryDecode(bech32);
  if (!decoded) return null;

  if (decoded.type === 'note') {
    return decoded.data;
  }
  if (decoded.type === 'nevent') {
    return decoded.data.id;
  }
  return null;
}

/**
 * Extract relay hints from nprofile or nevent
 */
export function extractRelays(bech32: string): string[] | undefined {
  const decoded = tryDecode(bech32);
  if (!decoded) return undefined;

  if (decoded.type === 'nprofile' || decoded.type === 'nevent') {
    return decoded.data.relays;
  }
  return undefined;
}
