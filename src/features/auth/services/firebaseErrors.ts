import i18n from 'i18next';
import type { AppError } from '@/types';

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

  const userMessage =
    i18n.isInitialized && i18n.exists(`errors:${code}`)
      ? i18n.t(`errors:${code}`)
      : message;

  return {
    code,
    message,
    userMessage,
    status: 0,
  };
}