// Simple concurrency limiter for NDK subscriptions
// Prevents mobile memory exhaustion from too many concurrent subscriptions

const MAX_CONCURRENT_STATS = 5;
const MAX_PENDING_STATS = 50; // Bound the queue to prevent memory growth

let activeStatsCount = 0;
const pendingStats: Array<() => void> = [];

export function canStartStatsFetch(): boolean {
  return activeStatsCount < MAX_CONCURRENT_STATS;
}

export function startStatsFetch(): boolean {
  if (activeStatsCount >= MAX_CONCURRENT_STATS) {
    return false;
  }
  activeStatsCount++;
  return true;
}

export function endStatsFetch(): void {
  activeStatsCount = Math.max(0, activeStatsCount - 1);
  // Process pending if any
  if (pendingStats.length > 0 && activeStatsCount < MAX_CONCURRENT_STATS) {
    const next = pendingStats.shift();
    next?.();
  }
}

export function queueStatsFetch(callback: () => void): void {
  if (activeStatsCount < MAX_CONCURRENT_STATS) {
    callback();
  } else {
    // Drop oldest if queue is full to prevent unbounded growth
    if (pendingStats.length >= MAX_PENDING_STATS) {
      pendingStats.shift(); // Remove oldest
    }
    pendingStats.push(callback);
  }
}

export function getActiveStatsCount(): number {
  return activeStatsCount;
}

export function getPendingStatsCount(): number {
  return pendingStats.length;
}

export function resetStatsQueue(): void {
  activeStatsCount = 0;
  pendingStats.length = 0;
}
