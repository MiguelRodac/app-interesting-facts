import { useAuthStore } from '../stores/authStore';

/**
 * Auth hook — thin wrapper over authStore for component consumption.
 * Provides stable selectors to minimize re-renders.
 */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const hydrate = useAuthStore((s) => s.hydrate);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    hydrate,
  };
}
