import i18n from 'i18next';
import type { AppError, AppErrorDetail } from '@/types';
import type { ApiErrorResponse, ApiValidationErrorDetail } from './types';

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

const GENERIC_DESCRIPTIONS = new Set([
  'unknown error',
  'an error occurred',
  'validation error',
  'bad request',
  'unauthorized',
  'forbidden',
  'not found',
  'conflict',
  'internal server error',
  'invalid format',
]);

function getUserMessage(
  code: string | undefined,
  status: number,
  detail: string | undefined,
  details?: ApiValidationErrorDetail[]
): string {
  // 1. If Zod validation details are present, surface field-specific error messages directly!
  if (details && details.length > 0) {
    const messages = details.map((d) => d.message).filter(Boolean);
    if (messages.length > 0) {
      return messages.join('\n');
    }
  }

  // 2. If the backend provided a specific detail message that isn't just a generic title/status phrase:
  const trimmedDetail = detail?.trim();
  const isMeaningfulDetail =
    trimmedDetail &&
    !GENERIC_DESCRIPTIONS.has(trimmedDetail.toLowerCase());

  // For validation (422), bad request (400) or invalid format (400), custom business rules
  // like "You cannot repost your own fact" or "Text exceeds 500 characters" come in detail.
  // Prioritize meaningful detail over generic translations!
  if (
    isMeaningfulDetail &&
    (status === 422 ||
      status === 400 ||
      code === 'VALIDATION_ERROR' ||
      code === 'BAD_REQUEST' ||
      code === 'INVALID_FORMAT')
  ) {
    return trimmedDetail;
  }

  // 3. Check localized catalog for the specific error_code
  if (i18n.isInitialized) {
    if (code && i18n.exists(`errors:${code}`)) {
      return i18n.t(`errors:${code}`);
    }
    const fallbackCode = HTTP_STATUS_FALLBACK_CODES[status];
    if (fallbackCode && i18n.exists(`errors:${fallbackCode}`)) {
      return i18n.t(`errors:${fallbackCode}`);
    }
  }

  // 4. If code was unmapped in i18n, but detail is meaningful, use detail
  if (isMeaningfulDetail) {
    return trimmedDetail;
  }

  // 5. Ultimate fallback
  if (i18n.isInitialized && i18n.exists('errors:UNKNOWN_ERROR')) {
    return i18n.t('errors:UNKNOWN_ERROR');
  }

  return trimmedDetail || 'An unexpected error occurred. Please try again.';
}

/**
 * Maps an API error response (RFC 9457 or legacy format) to a domain AppError.
 * Captures Zod details: [{ field, message }] and backend detail.
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
    const details: AppErrorDetail[] | undefined = parsed.error.field
      ? [{ field: parsed.error.field, message }]
      : undefined;
    return {
      code,
      message,
      userMessage: getUserMessage(code, status, message, details),
      status,
      details,
    };
  }

  // RFC 9457 format
  const title = parsed?.title ?? 'Unknown error';
  const rawDetails = parsed?.details;
  const detail = parsed?.detail ?? (typeof parsed?.error === 'string' ? parsed.error : title);
  const code =
    parsed?.error_code ??
    parsed?.type?.split('/').pop()?.toUpperCase().replace(/-/g, '_') ??
    HTTP_STATUS_FALLBACK_CODES[status] ??
    title.replace(/\s+/g, '_').toUpperCase();

  const details: AppErrorDetail[] | undefined =
    Array.isArray(rawDetails) && rawDetails.length > 0
      ? rawDetails.map((d) => ({ field: d.field, message: d.message }))
      : undefined;

  return {
    code,
    message: detail,
    userMessage: getUserMessage(code, status, detail, details),
    status,
    details,
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
