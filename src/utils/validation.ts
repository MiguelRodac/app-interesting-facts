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

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export function isValidUsername(value: string): boolean {
  return USERNAME_REGEX.test(value.trim());
}