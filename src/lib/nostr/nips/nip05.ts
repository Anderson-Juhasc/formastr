/**
 * NIP-05: DNS-Based Verification
 * https://github.com/nostr-protocol/nips/blob/master/05.md
 *
 * Maps internet identifiers (user@domain.com) to public keys via
 * a well-known URL: https://domain.com/.well-known/nostr.json?name=user
 */

import { nip05 } from 'nostr-tools';
import { withTimeout } from '@/lib/utils';

// Default timeout for NIP-05 lookups
const NIP05_TIMEOUT = 10000; // 10 seconds

export interface NIP05Profile {
  pubkey: string;
  relays?: string[];
}

/**
 * Check if a string looks like a NIP-05 identifier
 * Valid formats:
 * - user@domain.com
 * - _@domain.com (root identifier)
 * - domain.com (implies _@domain.com)
 */
export function isNIP05Identifier(str: string): boolean {
  // Must contain @ or . to be a potential NIP-05 identifier
  return str.includes('@') || str.includes('.');
}

/**
 * Parse a NIP-05 identifier into user and domain parts
 */
export function parseIdentifier(identifier: string): { user: string; domain: string } | null {
  const trimmed = identifier.trim().toLowerCase();

  if (trimmed.includes('@')) {
    const [user, domain] = trimmed.split('@');
    if (user && domain && domain.includes('.')) {
      return { user, domain };
    }
    return null;
  }

  // Plain domain implies _@domain
  if (trimmed.includes('.')) {
    return { user: '_', domain: trimmed };
  }

  return null;
}

/**
 * Build the well-known URL for a NIP-05 lookup
 */
export function buildLookupUrl(identifier: string): string | null {
  const parsed = parseIdentifier(identifier);
  if (!parsed) return null;

  return `https://${parsed.domain}/.well-known/nostr.json?name=${encodeURIComponent(parsed.user)}`;
}

/**
 * Query a NIP-05 identifier and return the associated profile
 * Uses nostr-tools implementation with timeout protection
 */
export async function queryProfile(identifier: string): Promise<NIP05Profile | null> {
  try {
    const profile = await withTimeout(nip05.queryProfile(identifier), NIP05_TIMEOUT);

    if (profile?.pubkey) {
      return {
        pubkey: profile.pubkey,
        relays: profile.relays,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Verify that a pubkey matches a NIP-05 identifier
 */
export async function verifyIdentifier(
  identifier: string,
  pubkey: string
): Promise<boolean> {
  const profile = await queryProfile(identifier);
  return profile?.pubkey === pubkey;
}

/**
 * Format a NIP-05 identifier for display
 * - "_@domain.com" becomes "domain.com"
 * - "user@domain.com" stays as-is
 */
export function formatForDisplay(identifier: string): string {
  if (identifier.startsWith('_@')) {
    return identifier.slice(2);
  }
  return identifier;
}
