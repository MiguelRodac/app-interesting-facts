import { createApiClient } from '../api/client';
import { mapUserDto } from '../mappers/userMapper';
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
import type { Author } from '@/types';
import type { ApiProfileResponse } from '../api/types';

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

  return {
    token,
    user: mapUserDto(backendUser),
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

  return {
    token,
    user: mapUserDto(backendUser),
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

  return {
    token,
    user: mapUserDto(backendUser),
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
    return mapUserDto(user);
  } catch {
    return null;
  }
}

/**
 * Hydrate auth state on app start.
 * Waits for Firebase to restore any persisted session (onAuthStateChanged
 * fires once immediately), then fetches the backend profile.
 * Returns null if no persisted Firebase session exists.
 */
export async function hydrateAuth(): Promise<Author | null> {
  // Wait for Firebase to determine auth state — this is async.
  // Synchronous getCurrentUser() returns null before Firebase has
  // finished checking IndexedDB/localStorage for persisted credentials.
  const firebaseUser = await waitForAuthInit();
  if (!firebaseUser) return null;

  try {
    const user = await client.get<ApiProfileResponse>('/auth/me');
    return mapUserDto(user);
  } catch {
    return null;
  }
}

/**
 * Subscribe to Firebase auth state changes.
 * Returns unsubscribe function.
 */
export function subscribeToAuth(callback: (user: Author | null) => void): () => void {
  return subscribeToAuthState(async (firebaseUser) => {
    if (!firebaseUser) {
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
 * Logout — clears Firebase session.
 */
export async function logout(): Promise<void> {
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
  return mapUserDto(backendUser);
}

/**
 * Get initial Firebase user (synchronous check, no network).
 */
export function getInitialUser(): Author | null {
  const firebaseUser = getCurrentUser();
  if (!firebaseUser) return null;
  // Note: Full user data requires async fetch from backend
  return null;
}
