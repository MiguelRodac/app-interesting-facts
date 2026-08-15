import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
  type User,
} from '@/lib/firebase';

/**
 * Firebase Auth facade.
 * Uses Firebase SDK directly for authentication.
 * The Firebase ID token is sent to our backend via POST /auth/profile
 * to create the user record in our database.
 */

let cachedUser: User | null = null;
let authStateListener: (() => void) | null = null;
let authInitPromise: Promise<User | null> | null = null;

/** Get the current Firebase ID token (idToken). */
export async function getIdToken(): Promise<string | null> {
  // If cachedUser is null, wait for Firebase auth to initialize
  // This prevents race conditions where API calls are made before Firebase
  // has restored the persisted session
  if (!cachedUser) {
    await waitForAuthInit();
  }
  if (!cachedUser) return null;
  try {
    return await cachedUser.getIdToken();
  } catch {
    return null;
  }
}

/** Get the current user (Firebase User object). */
export function getCurrentUser(): User | null {
  return cachedUser;
}

/** Set the cached user (called by auth state listener). */
export function setCachedUser(user: User | null): void {
  cachedUser = user;
}

/**
 * Wait for Firebase to determine auth state on app start.
 * `onAuthStateChanged` fires once immediately with the current persisted
 * user (or null). This promise resolves with that first emission.
 *
 * This is the correct way to check for a persisted session — synchronous
 * `getCurrentUser()` returns null before Firebase has finished restoring.
 *
 * Caches the promise so multiple calls reuse the same initialization.
 */
export function waitForAuthInit(): Promise<User | null> {
  if (!authInitPromise) {
    authInitPromise = new Promise<User | null>((resolve) => {
      const unsubscribe = onAuthStateChanged(
        getAuth(),
        (user) => {
          cachedUser = user;
          unsubscribe();
          resolve(user);
        },
        (error) => {
          console.error('Firebase auth init error:', error);
          unsubscribe();
          resolve(null);
        },
      );
    });
  }
  return authInitPromise;
}

/** Subscribe to Firebase auth state changes. Returns unsubscribe function. */
export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  if (authStateListener) {
    authStateListener();
  }
  authStateListener = onAuthStateChanged(
    getAuth(),
    (user) => {
      cachedUser = user;
      callback(user);
    },
    (error) => {
      console.error('Firebase auth state error:', error);
    },
  );
  return authStateListener;
}

/** Sign in with email and password via Firebase. Returns Firebase user. */
export async function signIn(
  email: string,
  password: string,
): Promise<User> {
  const result = await signInWithEmailAndPassword(getAuth(), email, password);
  cachedUser = result.user;
  return result.user;
}

/** Register a new user via Firebase. Returns Firebase user. */
export async function signUp(
  email: string,
  password: string,
): Promise<User> {
  const result = await createUserWithEmailAndPassword(getAuth(), email, password);
  cachedUser = result.user;
  return result.user;
}

/** Sign out from Firebase. */
export async function signOut(): Promise<void> {
  await firebaseSignOut(getAuth());
  cachedUser = null;
}
