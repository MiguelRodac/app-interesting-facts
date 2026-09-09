import i18n from 'i18next';
import type { AppError } from '@/types';
import type { ApiErrorResponse } from './types';

const HTTP_STATUS_FALLBACK_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'RESOURCE_NOT_FOUND',
  409: 'RESOURCE_CONFLICT',
  422: 'VALIDATION_ERROR',
  426: 'APP_VERSION_OUTDATED',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  502: 'NETWORK_ERROR',
  503: 'NETWORK_ERROR',
  504: 'NETWORK_ERROR',
};

function getUserMessage(code: string | undefined, status: number, fallback: string): string {
  if (i18n.isInitialized) {
    if (code && i18n.exists(`errors:${code}`)) {
      return i18n.t(`errors:${code}`);
    }
    const fallbackCode = HTTP_STATUS_FALLBACK_CODES[status];
    if (fallbackCode && i18n.exists(`errors:${fallbackCode}`)) {
      return i18n.t(`errors:${fallbackCode}`);
    }
    if (i18n.exists('errors:UNKNOWN_ERROR')) {
      return i18n.t('errors:UNKNOWN_ERROR');
    }
  }
  return fallback;
}

/**
 * Maps an API error response (RFC 9457 or legacy format) to a domain AppError.
 * Falls back to localized status-based messages when code is unmapped.
 */
export function mapApiError(status: number, body: unknown): AppError {
  const parsed = body as ApiErrorResponse | undefined;

  // Rate limiting special case (express-rate-limit returns { status: 429, error: 'Too Many Requests', message: '...' })
  if (status === 429) {
    const code = 'RATE_LIMITED';
    const message =
      (typeof parsed?.error === 'string' ? parsed.error : undefined) ??
      (body as { message?: string })?.message ??
      'Too many requests';
    return {
      code,
      message,
      userMessage: getUserMessage(code, status, message),
      status,
    };
  }

  // Legacy error format where parsed.error is an object { code, message }
  if (parsed?.error && typeof parsed.error === 'object') {
    const code =
      parsed.error_code ??
      parsed.error.code ??
      HTTP_STATUS_FALLBACK_CODES[status] ??
      'UNKNOWN_ERROR';
    const message = parsed.error.message ?? 'An error occurred';
    return {
      code,
      message,
      userMessage: getUserMessage(code, status, message),
      status,
    };
  }

  // RFC 9457 format
  const title = parsed?.title ?? 'Unknown error';
  const detail = parsed?.detail ?? (typeof parsed?.error === 'string' ? parsed.error : title);
  const code =
    parsed?.error_code ??
    parsed?.type?.split('/').pop()?.toUpperCase().replace(/-/g, '_') ??
    HTTP_STATUS_FALLBACK_CODES[status] ??
    title.replace(/\s+/g, '_').toUpperCase();

  return {
    code,
    message: detail,
    userMessage: getUserMessage(code, status, detail),
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
