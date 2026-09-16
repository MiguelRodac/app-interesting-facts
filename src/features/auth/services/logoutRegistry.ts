type LogoutHandler = () => void;

const logoutHandlers = new Set<LogoutHandler>();

/**
 * Register a cleanup callback to be executed when the user logs out.
 * Returns an unsubscribe function.
 */
export function registerOnLogout(handler: LogoutHandler): () => void {
  logoutHandlers.add(handler);
  return () => {
    logoutHandlers.delete(handler);
  };
}

/**
 * Executes all registered logout cleanup handlers safely.
 */
export function runLogoutHandlers(): void {
  logoutHandlers.forEach((handler) => {
    try {
      handler();
    } catch (error) {
      console.error('[LogoutRegistry] Error running logout handler:', error);
    }
  });
}
