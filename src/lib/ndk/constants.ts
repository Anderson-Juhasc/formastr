// Standardized timeout constants for NDK streaming operations

// Time to wait after EOSE before completing (allows late relay responses)
export const EOSE_DELAY = 1000;

// Time to wait for a single note/profile lookup before giving up
export const SINGLE_ITEM_TIMEOUT = 2000;

// Time to wait for relay list fetch
export const RELAY_FETCH_TIMEOUT = 8000;

// Maximum time for a profile request before forcing completion (prevents hanging)
export const PROFILE_REQUEST_TIMEOUT = 15000;

// Interval for cleaning up stale pending requests
export const PENDING_REQUEST_CLEANUP_INTERVAL = 60000;
