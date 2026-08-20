/**
 * Edit-window utilities for the comments module.
 * A comment can only be edited within 1 hour of creation (backend policy).
 */

const EDIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Whether a comment can still be edited — true when created within the last hour.
 */
export function canEditComment(
  createdAt: string,
  now: number = Date.now(),
): boolean {
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return false;
  return now - created < EDIT_WINDOW_MS;
}

/**
 * Milliseconds remaining until the 1-hour edit window closes.
 * Clamped at 0 when the window has already expired.
 * Intended to drive a 60s re-check interval.
 */
export function msUntilEditExpiry(createdAt: string): number {
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return 0;
  return Math.max(0, created + EDIT_WINDOW_MS - Date.now());
}

// ---------------------------------------------------------------------------
// Relative presentation time ("just now", "5m", "3h", "2d", "3w" or a date).
// ---------------------------------------------------------------------------

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

/**
 * Formats a timestamp as a short human-relative string in the Instagram style:
 * "just now", "5m", "3h", "2d" or "3w". Timestamps older than ~a month fall
 * back to a compact date so the value never goes stale or ambiguous.
 */
export function formatRelativeTime(createdAt: string, now: number = Date.now()): string {
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return '';

  const diff = now - created;
  if (diff < MINUTE_MS) return 'just now';
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)}m`;
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)}h`;
  if (diff < WEEK_MS) return `${Math.floor(diff / DAY_MS)}d`;
  if (diff < 4 * WEEK_MS) return `${Math.floor(diff / WEEK_MS)}w`;

  const d = new Date(created);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

