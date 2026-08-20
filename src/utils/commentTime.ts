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
