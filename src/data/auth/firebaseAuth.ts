import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  verifyBeforeUpdateEmail,
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
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

/** Send a password reset email via Firebase. */
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(getAuth(), email);
}

/**
 * Change the current user's password. Re-authenticates first so sessions
 * older than ~1 hour (Firebase refresh cutoff) don't reject the update.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = getCurrentUser();
  const email = user?.email;
  if (!user || !email) {
    throw new Error('No authenticated user');
  }

  const credential = EmailAuthProvider.credential(email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

/**
 * Verify-before-change email update. Re-authenticates first so sessions
 * older than ~1 hour (Firebase refresh cutoff) don't reject the request.
 * Sends a verification link to the NEW email via `verifyBeforeUpdateEmail` —
 * the user's email is NOT changed until they click that link.
 * Firebase enforces email uniqueness across accounts — a duplicate email
 * throws 'auth/email-already-in-use'.
 */
export async function changeEmail(
  newEmail: string,
  currentPassword: string,
): Promise<void> {
  const user = getCurrentUser();
  const email = user?.email;
  if (!user || !email) {
    throw new Error('No authenticated user');
  }

  const credential = EmailAuthProvider.credential(email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await verifyBeforeUpdateEmail(user, newEmail);
}

/**
 * Confirm a password reset using a Firebase action link (oobCode).
 * Validates the code first (returns the target email) and then applies the
 * new password. Throws if the code is invalid or expired.
 */
export async function confirmPasswordResetAction(
  oobCode: string,
  newPassword: string,
): Promise<void> {
  // Validates the code is still valid; throws on an invalid/expired code.
  await verifyPasswordResetCode(getAuth(), oobCode);
  await confirmPasswordReset(getAuth(), oobCode, newPassword);
}

/**
 * Apply an email-change action link (verifyBeforeUpdateEmail flow).
 * `checkActionCode` reveals the pending NEW email (`result.data.email`);
 * `applyActionCode` actually switches the account's email in Firebase.
 *
 * Returns the new email string so the caller can sync the backend. If the
 * pending email is unavailable, falls back to the current user's email.
 */
export async function applyEmailActionCode(oobCode: string): Promise<string> {
  const result = await checkActionCode(getAuth(), oobCode);
  const newEmail = result.data.email;
  await applyActionCode(getAuth(), oobCode);
  return newEmail ?? getCurrentUser()?.email ?? '';
}
