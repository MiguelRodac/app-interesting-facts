type ScrollHandler = () => void;

const handlers = new Map<string, ScrollHandler>();

/**
 * Register a scroll-to-top handler for a specific target screen ('index' | 'profile').
 * Returns an unregister function for cleanup.
 */
export function registerScrollToTop(fn: ScrollHandler, target = 'index'): () => void {
  handlers.set(target, fn);
  return () => {
    handlers.delete(target);
  };
}

/**
 * Trigger scroll-to-top on the specified screen (called by the tab bar).
 */
export function triggerScrollToTop(target = 'index'): void {
  handlers.get(target)?.();
}
