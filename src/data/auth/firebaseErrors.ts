import type { AppError } from '@/types';

/**
 * Maps Firebase Auth errors (FirebaseError with code "auth/...") to a domain
 * AppError so the UI can show a readable message.
 * API errors pass through unchanged; anything else becomes a generic error.
 */
const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-login-credentials': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/email-already-in-use': 'This email is already registered.',
  'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Please check your connection and try again.',
  'auth/invalid-email': 'The email address is invalid.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled.',
  'auth/user-disabled': 'This account has been disabled.',
};

export function isFirebaseAuthError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string' &&
    (error as { code: string }).code.startsWith('auth/')
  );
}

export function mapFirebaseError(error: unknown): AppError {
  const code = (error as { code?: string }).code ?? 'auth/unknown';
  const message =
    error instanceof Error
      ? error.message
      : 'Authentication failed';

  return {
    code,
    message,
    userMessage: FIREBASE_ERROR_MESSAGES[code] ?? message,
    status: 0,
  };
}