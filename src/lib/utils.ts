import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimestamp(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
}

export function formatNpub(npub: string): string {
  if (npub.length <= 16) return npub;
  return `${npub.slice(0, 8)}...${npub.slice(-8)}`;
}

// Timeout utility for async operations
export const FETCH_TIMEOUT = 15000; // 15 seconds

export function withTimeout<T>(promise: Promise<T>, ms = FETCH_TIMEOUT): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), ms)
    ),
  ]);
}
