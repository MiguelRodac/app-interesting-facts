type ScrollHandler = () => void;

let handler: ScrollHandler | null = null;

/**
 * Register a scroll-to-top handler (called by the feed screen).
 * Returns an unregister function for cleanup.
 */
export function registerScrollToTop(fn: ScrollHandler): () => void {
  handler = fn;
  return () => {
    handler = null;
  };
}

/**
 * Trigger scroll-to-top on the active feed screen (called by the tab bar).
 */
export function triggerScrollToTop(): void {
  handler?.();
}
