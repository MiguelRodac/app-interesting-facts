import { createApiClient } from '@/shared/api/client';
import { mapUserDto } from '@/features/profile/mappers/userMapper';
import {
  signIn,
  signUp,
  signOut,
  getIdToken,
  getCurrentUser,
  waitForAuthInit,
  subscribeToAuthState,
  setCachedUser,
} from './firebaseAuth';
import {
  getStoredAuthor,
  setStoredAuthor,
  clearStoredAuthor,
} from './authStorage';
import type { Author } from '@/types';
import type { ApiProfileResponse } from '@/shared/api/types';

export { getStoredAuthor, setStoredAuthor, clearStoredAuthor, waitForAuthInit };

/**
 * Auth service — high-level auth operations consumed by authStore.
 * Flow:
 * 1. Firebase SDK handles registration/login → returns Firebase User with idToken
 * 2. We POST to /auth/profile with the idToken → backend creates/returns user record
 * 3. The Firebase idToken is used for all subsequent API calls
 */

const client = createApiClient(getIdToken); // getIdToken is async

export interface AuthResult {
  user: Author;
  token: string;
}

/**
 * Login with email + password.
 * 1. Firebase signs in the user
 * 2. GET /auth/me to retrieve the user's profile from backend
 */
export async function login(email: string, password: string): Promise<AuthResult> {
  // Step 1: Firebase authentication
  const firebaseUser = await signIn(email, password);
  const token = await firebaseUser.getIdToken();

  // Step 2: Get user profile from backend using Firebase token
  const backendUser = await client.get<ApiProfileResponse>('/auth/me');
  const user = mapUserDto(backendUser);
  await setStoredAuthor(user);

  return {
    token,
    user,
  };
}

/**
 * Complete onboarding — create profile for a new Firebase user.
 * Called after Firebase login when /auth/profile fails (new user).
 */
export async function completeOnboarding(data: {
  username: string;
  displayName: string;
}): Promise<AuthResult> {
  const firebaseUser = getCurrentUser();
  if (!firebaseUser) {
    throw new Error('No Firebase user');
  }
  const token = await firebaseUser.getIdToken();

  const backendUser = await client.post<ApiProfileResponse>('/auth/profile', {
    username: data.username,
    displayName: data.displayName,
  });
  const user = mapUserDto(backendUser);
  await setStoredAuthor(user);

  return {
    token,
    user,
  };
}

/**
 * Register a new user.
 * 1. Firebase creates the user account
 * 2. We POST to /auth/profile with username + displayName
 */
export async function registerNewUser(data: {
  email: string;
  password: string;
  username: string;
  displayName: string;
}): Promise<AuthResult> {
  // Step 1: Firebase creates the user
  const firebaseUser = await signUp(data.email, data.password);
  const token = await firebaseUser.getIdToken();

  // Step 2: Notify backend to create user record (with username/displayName for new users)
  const backendUser = await client.post<ApiProfileResponse>('/auth/profile', {
    username: data.username,
    displayName: data.displayName,
  });
  const user = mapUserDto(backendUser);
  await setStoredAuthor(user);

  return {
    token,
    user,
  };
}

/**
 * Fetch current user from backend using Firebase idToken.
 */
export async function fetchCurrentUser(): Promise<Author | null> {
  const firebaseUser = getCurrentUser();
  if (!firebaseUser) return null;

  try {
    const user = await client.get<ApiProfileResponse>('/auth/me');
    const author = mapUserDto(user);
    await setStoredAuthor(author);
    return author;
  } catch {
    return null;
  }
}

/**
 * Fast, non-blocking local session restore.
 * Checks Firebase local state and cached author profile from storage (~20ms).
 * Does NOT hit the network or block the UI waiting for sleeping backend servers.
 */
export async function initLocalAuth(): Promise<{ user: Author | null; hasSession: boolean }> {
  const [cachedUser, firebaseUser] = await Promise.all([
    getStoredAuthor(),
    waitForAuthInit(),
  ]);

  if (!firebaseUser) {
    await clearStoredAuthor();
    return { user: null, hasSession: false };
  }

  const initialUser: Author = cachedUser ?? {
    id: firebaseUser.uid,
    username: firebaseUser.email?.split('@')[0] ?? 'user',
    displayName: firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'User',
    avatarUrl: firebaseUser.photoURL ?? null,
    avatarColor: null,
  };

  return { user: initialUser, hasSession: true };
}

/**
 * Background profile sync against the backend API.
 * Runs asynchronously after the UI is already mounted.
 */
export async function syncProfile(): Promise<Author | null> {
  const firebaseUser = getCurrentUser();
  if (!firebaseUser) return null;

  try {
    const backendUser = await client.get<ApiProfileResponse>('/auth/me');
    const user = mapUserDto(backendUser);
    await setStoredAuthor(user);
    return user;
  } catch (err: any) {
    if (err?.status === 401) {
      await logout();
      return null;
    }
    return null;
  }
}

/**
 * Hydrate auth state on app start (instant local lookup).
 */
export async function hydrateAuth(): Promise<Author | null> {
  const { user } = await initLocalAuth();
  return user;
}

/**
 * Subscribe to Firebase auth state changes.
 * Returns unsubscribe function.
 */
export function subscribeToAuth(callback: (user: Author | null) => void): () => void {
  return subscribeToAuthState(async (firebaseUser) => {
    if (!firebaseUser) {
      await clearStoredAuthor();
      callback(null);
      return;
    }
    try {
      const author = await fetchCurrentUser();
      callback(author);
    } catch {
      callback(null);
    }
  });
}

/**
 * Logout — clears Firebase session and cached storage.
 */
export async function logout(): Promise<void> {
  await clearStoredAuthor();
  await signOut();
  setCachedUser(null);
}

/**
 * Update the current user's profile on the backend.
 * Returns the updated Author domain object.
 */
export async function updateProfile(data: {
  displayName?: string;
  email?: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
}): Promise<Author> {
  const backendUser = await client.patch<ApiProfileResponse>('/auth/me', {
    displayName: data.displayName,
    email: data.email,
    avatarUrl: data.avatarUrl ?? null,
    avatarColor: data.avatarColor ?? null,
  });
  const updatedUser = mapUserDto(backendUser);
  await setStoredAuthor(updatedUser);
  return updatedUser;
}

/**
 * Get initial Firebase user (synchronous check, no network).
 */
export function getInitialUser(): Author | null {
  const firebaseUser = getCurrentUser();
  if (!firebaseUser) return null;
  return null;
}
