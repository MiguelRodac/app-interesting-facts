/**
 * Shared validation rules mirroring the backend
 * (src/shared/domain/validation.ts on the API side).
 * The backend is the source of truth — these only improve UX.
 */

/** Same shape zod's z.string().email() accepts */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** Backend rule: ^[a-zA-Z0-9_.]{3,30}$ */
const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,30}$/;

export const USERNAME_ERROR_MESSAGE =
  'Username must be 3-30 characters and only contain letters, numbers, underscores or dots.';

export const EMAIL_ERROR_MESSAGE = 'Email is invalid';

/** Display names are capped at 50 chars */
export const MAX_DISPLAY_NAME_LENGTH = 50;

/** Firebase Auth requires at least 6 characters; 16 is our product max */
export const MIN_PASSWORD_LENGTH = 6;

export const MAX_PASSWORD_LENGTH = 16;

export const PASSWORD_ERROR_MESSAGE = `Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters`;

export const PASSWORD_STRENGTH_LABELS = ['Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Strong'] as const;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export function isValidUsername(value: string): boolean {
  return USERNAME_REGEX.test(value.trim());
}

/**
 * Scores a password 0-5: length >= 8, lowercase, uppercase, digit, special char.
 * Firebase only enforces the 6-char minimum — this is a UX guide, not a gate.
 */
export function getPasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}