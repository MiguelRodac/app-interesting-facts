import i18n from 'i18next';
import type { AppError } from '@/types';
import type { ApiErrorResponse } from './types';

function getUserMessage(code: string, fallback: string): string {
  if (i18n.isInitialized && i18n.exists(`errors:${code}`)) {
    return i18n.t(`errors:${code}`);
  }
  return fallback;
}

/**
 * Maps an API error response (RFC 9457 or legacy format) to a domain AppError.
 * Falls back to generic messages when the response body is unparseable.
 */
export function mapApiError(status: number, body: unknown): AppError {
  const parsed = body as ApiErrorResponse | undefined;

  // Legacy error format
  if (parsed?.error) {
    const code = parsed.error_code ?? parsed.error.code;
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
  const code =
    parsed?.error_code ??
    parsed?.type?.split('/').pop()?.toUpperCase() ??
    title.replace(/\s+/g, '_').toUpperCase();

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
  const userMessage =
    i18n.isInitialized && i18n.exists('errors:NETWORK_ERROR')
      ? i18n.t('errors:NETWORK_ERROR')
      : 'Unable to connect. Please check your connection and try again.';
  return {
    code: 'NETWORK_ERROR',
    message,
    userMessage,
    status: 0,
  };
}
