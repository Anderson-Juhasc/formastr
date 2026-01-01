import { subscriptionManager } from './subscription-manager';
import { clearStatsCache } from './stats-cache';
import { resetStatsQueue } from './concurrency';

/**
 * Memory Pressure Detection
 * Detects low-memory conditions and triggers aggressive cleanup
 */

// Extend Navigator type for deviceMemory (not in all browsers)
declare global {
  interface Navigator {
    deviceMemory?: number;
  }
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

let initialized = false;
let isLowMemoryDevice = false;
let memoryCheckInterval: ReturnType<typeof setInterval> | null = null;

// Thresholds
const LOW_MEMORY_DEVICE_GB = 4; // Devices with <= 4GB RAM are considered low memory
const HIGH_MEMORY_USAGE_PERCENT = 0.7; // 70% heap usage triggers cleanup
const MEMORY_CHECK_INTERVAL = 30000; // Check every 30 seconds

// Callbacks for components that need to respond to memory pressure
type MemoryPressureCallback = () => void;
const memoryPressureCallbacks = new Set<MemoryPressureCallback>();

/**
 * Subscribe to memory pressure events
 * Returns unsubscribe function
 */
export function onMemoryPressure(callback: MemoryPressureCallback): () => void {
  memoryPressureCallbacks.add(callback);
  return () => {
    memoryPressureCallbacks.delete(callback);
  };
}

/**
 * Check if device is considered low memory
 */
export function isLowMemory(): boolean {
  return isLowMemoryDevice;
}

/**
 * Detect if this is a low-memory device
 */
function detectLowMemoryDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  // Check navigator.deviceMemory (Chrome, Edge, Opera)
  // Returns RAM in GB (0.25, 0.5, 1, 2, 4, 8)
  if (navigator.deviceMemory !== undefined) {
    return navigator.deviceMemory <= LOW_MEMORY_DEVICE_GB;
  }

  // Fallback: check if mobile (mobile devices often have less RAM)
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isMobile;
}

/**
 * Check current memory usage (Chrome only)
 * Returns usage as percentage (0-1) or null if not available
 */
function getMemoryUsage(): number | null {
  if (typeof performance === 'undefined') return null;

  const memory = performance.memory;
  if (!memory) return null;

  return memory.usedJSHeapSize / memory.jsHeapSizeLimit;
}

/**
 * Trigger aggressive cleanup to free memory
 */
function triggerMemoryCleanup(): void {
  // Clear stats cache
  clearStatsCache();

  // Reset pending stats queue
  resetStatsQueue();

  // Clean up old subscriptions (older than 2 minutes)
  subscriptionManager.cleanupOld(2 * 60 * 1000);

  // Notify all listeners
  for (const callback of memoryPressureCallbacks) {
    try {
      callback();
    } catch {
      // Ignore callback errors
    }
  }
}

/**
 * Periodic memory check
 */
function checkMemoryPressure(): void {
  const usage = getMemoryUsage();

  if (usage !== null && usage > HIGH_MEMORY_USAGE_PERCENT) {
    triggerMemoryCleanup();
  }
}

/**
 * Initialize memory pressure detection
 * Safe to call multiple times - only initializes once
 */
export function initMemoryPressure(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  // Detect low memory device
  isLowMemoryDevice = detectLowMemoryDevice();

  // Start periodic memory checks (if performance.memory is available)
  if (typeof performance !== 'undefined' && performance.memory) {
    memoryCheckInterval = setInterval(checkMemoryPressure, MEMORY_CHECK_INTERVAL);
  }
}

/**
 * Cleanup memory pressure detection (for testing or hot reload)
 */
export function cleanupMemoryPressure(): void {
  if (!initialized) return;

  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval);
    memoryCheckInterval = null;
  }

  memoryPressureCallbacks.clear();
  initialized = false;
}

/**
 * Get memory status for debugging
 */
export function getMemoryStatus(): {
  isLowMemoryDevice: boolean;
  deviceMemoryGB: number | undefined;
  heapUsagePercent: number | null;
  subscriptionCount: number;
} {
  return {
    isLowMemoryDevice,
    deviceMemoryGB: typeof navigator !== 'undefined' ? navigator.deviceMemory : undefined,
    heapUsagePercent: getMemoryUsage(),
    subscriptionCount: subscriptionManager.count,
  };
}
