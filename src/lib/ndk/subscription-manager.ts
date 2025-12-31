import { NDKSubscription } from '@nostr-dev-kit/ndk';

/**
 * Subscription Manager - tracks all active NDK subscriptions
 * Enables pause/resume for page visibility and emergency cleanup
 */

interface ManagedSubscription {
  sub: NDKSubscription;
  cleanup: () => void;
  createdAt: number;
}

class SubscriptionManager {
  private active = new Map<string, ManagedSubscription>();
  private paused = false;
  private idCounter = 0;

  /**
   * Generate a unique subscription ID
   */
  generateId(prefix = 'sub'): string {
    return `${prefix}-${++this.idCounter}-${Date.now()}`;
  }

  /**
   * Register a subscription for tracking
   */
  register(id: string, sub: NDKSubscription, cleanup: () => void): void {
    // Stop existing subscription with same ID
    this.unregister(id);

    this.active.set(id, {
      sub,
      cleanup,
      createdAt: Date.now(),
    });

    // If manager is paused, stop the subscription immediately
    if (this.paused) {
      try {
        sub.stop();
      } catch {
        // Ignore errors during stop
      }
    }
  }

  /**
   * Unregister and cleanup a subscription
   */
  unregister(id: string): void {
    const entry = this.active.get(id);
    if (entry) {
      try {
        entry.cleanup();
        entry.sub.stop();
      } catch {
        // Ignore errors during cleanup
      }
      this.active.delete(id);
    }
  }

  /**
   * Check if a subscription is registered
   */
  has(id: string): boolean {
    return this.active.has(id);
  }

  /**
   * Pause all subscriptions (e.g., when page is backgrounded)
   * Subscriptions are stopped but remain registered for resume
   */
  pauseAll(): void {
    if (this.paused) return;
    this.paused = true;

    for (const { sub } of this.active.values()) {
      try {
        sub.stop();
      } catch {
        // Ignore errors during pause
      }
    }
  }

  /**
   * Check if manager is paused
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Resume flag - actual resubscription must be handled by components
   * This just clears the paused state
   */
  resume(): void {
    this.paused = false;
    // Note: Subscriptions cannot be "resumed" in NDK - they must be recreated
    // Components should listen for visibility changes and refetch if needed
  }

  /**
   * Stop and remove all subscriptions
   */
  stopAll(): void {
    for (const id of Array.from(this.active.keys())) {
      this.unregister(id);
    }
    this.paused = false;
  }

  /**
   * Get count of active subscriptions
   */
  get count(): number {
    return this.active.size;
  }

  /**
   * Get all subscription IDs (for debugging)
   */
  getIds(): string[] {
    return Array.from(this.active.keys());
  }

  /**
   * Cleanup subscriptions older than maxAge (milliseconds)
   * Useful for cleaning up orphaned subscriptions
   */
  cleanupOld(maxAgeMs: number): number {
    const now = Date.now();
    const cutoff = now - maxAgeMs;
    let cleaned = 0;

    for (const [id, entry] of this.active) {
      if (entry.createdAt < cutoff) {
        this.unregister(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Singleton instance
export const subscriptionManager = new SubscriptionManager();
