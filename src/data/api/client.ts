import { createNetworkError, mapApiError } from './errors';
import type { AppError } from '@/types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api-interesting-facts-mu.vercel.app';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method: HttpMethod;
  path: string;
  body?: unknown;
  params?: Record<string, string>;
  /** Async function that returns the auth token */
  getToken: () => Promise<string | null>;
}

async function request<T>(options: RequestOptions): Promise<T> {
  const { method, path, body, params, getToken } = options;

  const url = new URL(path, BASE_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Get token asynchronously (Firebase getIdToken is async)
  const token = await getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const responseBody = await response.json().catch(() => null);

    if (!response.ok) {
      throw mapApiError(response.status, responseBody);
    }

    return responseBody as T;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      throw error;
    }
    throw createNetworkError(error);
  }
}

/**
 * Typed API client for the Social Facts backend.
 * Token is fetched asynchronously on each request (supports Firebase async getIdToken).
 */
export function createApiClient(getToken: () => Promise<string | null>) {
  return {
    get: <T>(path: string, params?: Record<string, string>): Promise<T> =>
      request<T>({ method: 'GET', path, params, getToken }),

    post: <T>(path: string, body?: unknown): Promise<T> =>
      request<T>({ method: 'POST', path, body, getToken }),

    patch: <T>(path: string, body: unknown): Promise<T> =>
      request<T>({ method: 'PATCH', path, body, getToken }),

    del: (path: string): Promise<void> =>
      request<void>({ method: 'DELETE', path, getToken }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
