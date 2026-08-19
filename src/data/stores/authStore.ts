import { create } from 'zustand';
import type { Author, AppError } from '@/types';
import * as authService from '../auth/authService';
import { isFirebaseAuthError, mapFirebaseError } from '../auth/firebaseErrors';
import { setUnauthorizedHandler } from '../api/client';
import { useUIStore } from './uiStore';
import { useFactsStore } from './factsStore';
import { useSearchStore } from './searchStore';
import { useUserProfileStore } from './userProfileStore';

interface AuthState {
  user: Author | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; username: string; displayName: string }) => Promise<void>;
  logout: () => Promise<void>;
  /** Update current user's profile (displayName, email, avatarUrl, avatarColor) */
  updateProfile: (data: { displayName?: string; email?: string; avatarUrl?: string | null; avatarColor?: string | null }) => Promise<void>;
  /** Hydrate auth state from Firebase on app start */
  hydrate: () => Promise<void>;
  /** Set user directly after login/register */
  setAuth: (user: Author, token: string) => void;
  /** Clear auth state on logout */
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { user, token } = await authService.login(email, password);
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      const appError = isFirebaseAuthError(error) ? mapFirebaseError(error) : error;
      if (appError && typeof appError === 'object' && 'code' in appError) {
        useUIStore.getState().setError(appError as AppError);
      }
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const { user, token } = await authService.registerNewUser(data);
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      const appError = isFirebaseAuthError(error) ? mapFirebaseError(error) : error;
      if (appError && typeof appError === 'object' && 'code' in appError) {
        useUIStore.getState().setError(appError as AppError);
      }
      throw error;
    }
  },

  logout: async () => {
    await authService.logout();
    set({ user: null, token: null, isAuthenticated: false });
    useFactsStore.getState().reset();
    useSearchStore.getState().clearResults();
    useUserProfileStore.getState().clearProfile();
  },

  updateProfile: async (data) => {
    set({ isLoading: true });
    try {
      const user = await authService.updateProfile(data);
      set({ user, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
      throw error;
    }
  },

  /** Hydrate auth state from Firebase on app start.
   * Checks if Firebase has a session, then fetches profile from backend.
   */
  hydrate: async () => {
    set({ isLoading: true });
    try {
      const user = await authService.hydrateAuth();
      if (user) {
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setAuth: (user, token) => {
    set({ user, token, isAuthenticated: true });
  },

  clearAuth: () => {
    set({ user: null, token: null, isAuthenticated: false });
  },
}));

// Backend rejected a request with 401 outside the auth flow —
// clear the session in a controlled way and tell the user why.
setUnauthorizedHandler(() => {
  useAuthStore.getState().clearAuth();
  useUIStore.getState().showToast('Your session has expired. Please sign in again.', 'warning');
});
