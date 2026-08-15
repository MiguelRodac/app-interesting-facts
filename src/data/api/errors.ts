import type { AppError } from '@/types';
import type { ApiErrorResponse } from './types';

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Please log in to continue.',
  FORBIDDEN: 'You do not have permission to do that.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  CONFLICT: 'This action conflicts with the current state.',
  FACT_NOT_FOUND: 'This fact no longer exists.',
  USER_NOT_FOUND: 'User not found.',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists.',
  USERNAME_ALREADY_EXISTS: 'This username is already taken.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  RATE_LIMITED: 'Too many requests. Please try again later.',
};

function getUserMessage(code: string, fallback: string): string {
  return ERROR_MESSAGES[code] ?? fallback;
}

/**
 * Maps an API error response (RFC 9457 or legacy format) to a domain AppError.
 * Falls back to generic messages when the response body is unparseable.
 */
export function mapApiError(status: number, body: unknown): AppError {
  const parsed = body as ApiErrorResponse | undefined;

  // Legacy error format
  if (parsed?.error) {
    const code = parsed.error.code;
    return {
      code,
      message: parsed.error.message,
      userMessage: getUserMessage(code, parsed.error.message),
      status,
    };
  }

  // RFC 9457 format
  const title = parsed?.title ?? 'Unknown error';
  const detail = parsed?.detail ?? title;
  const code = parsed?.type?.split('/').pop()?.toUpperCase() ?? title.replace(/\s+/g, '_').toUpperCase();

  return {
    code,
    message: detail,
    userMessage: getUserMessage(code, detail),
    status,
  };
}

/**
 * Creates a generic AppError for network/unknown failures.
 */
export function createNetworkError(cause?: unknown): AppError {
  const message =
    cause instanceof Error ? cause.message : 'Network request failed';
  return {
    code: 'NETWORK_ERROR',
    message,
    userMessage: 'Unable to connect. Please check your connection and try again.',
    status: 0,
  };
}
