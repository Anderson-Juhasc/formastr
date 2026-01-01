import { subscriptionManager } from './subscription-manager';
import { clearStatsCache } from './stats-cache';
import { resetStatsQueue } from './concurrency';
import { disconnectNDK } from './index';

/**
 * Page Visibility Handler
 * Pauses subscriptions when page is backgrounded to save memory on mobile
 */

let initialized = false;
let isVisible = typeof document !== 'undefined' ? !document.hidden : true;

// Track if the page has ever been visible
// This allows background tabs to do initial fetches
let hasEverBeenVisible = typeof document !== 'undefined' ? !document.hidden : true;

// Callbacks for components that need to know about visibility changes
type VisibilityCallback = (visible: boolean) => void;
const visibilityCallbacks = new Set<VisibilityCallback>();

/**
 * Subscribe to visibility changes
 * Returns unsubscribe function
 */
export function onVisibilityChange(callback: VisibilityCallback): () => void {
  visibilityCallbacks.add(callback);
  return () => {
    visibilityCallbacks.delete(callback);
  };
}

/**
 * Check if page is currently visible
 * Returns true for background tabs that haven't been visible yet (allows initial fetch)
 */
export function isPageVisible(): boolean {
  // Allow fetches if the page has never been visible (new background tab)
  // This enables Ctrl+click to open in new tab to still load data
  if (!hasEverBeenVisible) {
    return true;
  }
  return isVisible;
}

/**
 * Handle visibility change event
 */
function handleVisibilityChange(): void {
  const wasVisible = isVisible;
  isVisible = !document.hidden;

  // Track that page has been visible at least once
  if (isVisible) {
    hasEverBeenVisible = true;
  }

  if (wasVisible === isVisible) return;

  if (isVisible) {
    // Page became visible - resume
    subscriptionManager.resume();
  } else {
    // Page became hidden - pause and cleanup
    subscriptionManager.pauseAll();

    // Aggressive cleanup when backgrounded on mobile
    clearStatsCache();
    resetStatsQueue();

    // Clean up old subscriptions that might be orphaned
    subscriptionManager.cleanupOld(5 * 60 * 1000); // 5 minutes
  }

  // Notify all listeners
  for (const callback of visibilityCallbacks) {
    try {
      callback(isVisible);
    } catch {
      // Ignore callback errors
    }
  }
}

/**
 * Handle page unload - cleanup everything
 */
function handleBeforeUnload(): void {
  subscriptionManager.stopAll();
  clearStatsCache();
  resetStatsQueue();

  // Disconnect NDK synchronously if possible
  try {
    disconnectNDK();
  } catch {
    // Ignore errors during cleanup
  }
}

/**
 * Handle page hide (more reliable on mobile than beforeunload)
 */
function handlePageHide(): void {
  // On mobile, pagehide is often the last event we get
  subscriptionManager.pauseAll();
  clearStatsCache();
  resetStatsQueue();
}

/**
 * Initialize visibility handler
 * Safe to call multiple times - only initializes once
 */
export function initVisibilityHandler(): void {
  if (initialized || typeof document === 'undefined') return;
  initialized = true;

  // Visibility change - fires when tab is switched or minimized
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Page hide - more reliable on mobile than beforeunload
  window.addEventListener('pagehide', handlePageHide);

  // Before unload - cleanup before navigation (desktop)
  window.addEventListener('beforeunload', handleBeforeUnload);

  // Set initial state
  isVisible = !document.hidden;
}

/**
 * Cleanup visibility handler (for testing or hot reload)
 */
export function cleanupVisibilityHandler(): void {
  if (!initialized || typeof document === 'undefined') return;

  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('pagehide', handlePageHide);
  window.removeEventListener('beforeunload', handleBeforeUnload);

  visibilityCallbacks.clear();
  initialized = false;
  hasEverBeenVisible = typeof document !== 'undefined' ? !document.hidden : true;
}
