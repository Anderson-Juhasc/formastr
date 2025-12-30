// Stats cache with TTL to reduce relay subscriptions
// Stats don't change frequently, so caching for 5 minutes reduces memory usage significantly

import { NoteStats } from './stats';

// Detect mobile for more aggressive limits
const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

interface CachedStats {
  stats: NoteStats;
  timestamp: number;
}

// 5 minute TTL for stats cache
const STATS_CACHE_TTL = 5 * 60 * 1000;

// In-memory cache - survives component unmounts but not page refreshes
const statsCache = new Map<string, CachedStats>();

// Maximum cache entries - lower on mobile (200) vs desktop (500)
const MAX_CACHE_ENTRIES = isMobile ? 200 : 500;

export function getCachedStats(noteId: string): NoteStats | null {
  const cached = statsCache.get(noteId);
  if (!cached) return null;

  // Check if expired
  if (Date.now() - cached.timestamp > STATS_CACHE_TTL) {
    statsCache.delete(noteId);
    return null;
  }

  return cached.stats;
}

export function setCachedStats(noteId: string, stats: NoteStats): void {
  // Evict oldest entries if at capacity
  if (statsCache.size >= MAX_CACHE_ENTRIES) {
    // Remove ~20% of oldest entries
    const entriesToRemove = Math.floor(MAX_CACHE_ENTRIES * 0.2);
    const entries = Array.from(statsCache.entries());
    entries
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, entriesToRemove)
      .forEach(([key]) => statsCache.delete(key));
  }

  statsCache.set(noteId, {
    stats,
    timestamp: Date.now(),
  });
}

export function invalidateStatsCache(noteId: string): void {
  statsCache.delete(noteId);
}

export function clearStatsCache(): void {
  statsCache.clear();
}

export function getStatsCacheSize(): number {
  return statsCache.size;
}
