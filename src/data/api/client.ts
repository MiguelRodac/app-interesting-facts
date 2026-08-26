import { createNetworkError, mapApiError } from "./errors";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  "https://api-interesting-facts-mu.vercel.app";
const APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION ?? "0.0.0";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface RequestOptions {
  method: HttpMethod;
  path: string;
  body?: unknown;
  params?: Record<string, string>;
  /** Async function that returns the auth token */
  getToken: () => Promise<string | null>;
}

/**
 * Called when the backend rejects a request because the client version is
 * outdated (426 APP_VERSION_OUTDATED) or missing the version header in
 * strict mode (400 APP_VERSION_MISSING). Registered by the root layout to
 * render a full-screen "update required" gate.
 */
let appUpdateHandler: (() => void) | null = null;

export function setAppUpdateHandler(handler: () => void): void {
  appUpdateHandler = handler;
}

/**
 * Called when the backend rejects a request with 401 on a NON-auth endpoint.
 * Registered by authStore to clear the session in a controlled way.
 */
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
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
    "Content-Type": "application/json",
    "X-App-Version": APP_VERSION,
  };

  // Get token asynchronously (Firebase getIdToken is async)
  const token = await getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
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
      // A 401 outside the auth flow means the session is gone/broken —
      // notify the app so it can clear auth state in a controlled way
      // (the screen shows a "session expired" message instead of a crash).
      if (response.status === 401 && !path.startsWith('/auth/')) {
        unauthorizedHandler?.();
      }
      // Outdated client — backend version check rejected the request. Flag it
      // so the root gate blocks the UI and points to the latest download.
      const errorCode = (responseBody as { error_code?: string } | null)?.error_code;
      if (
        response.status === 426 ||
        errorCode === 'APP_VERSION_OUTDATED' ||
        errorCode === 'APP_VERSION_MISSING'
      ) {
        appUpdateHandler?.();
      }
      throw mapApiError(response.status, responseBody);
    }

    return responseBody as T;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
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
      request<T>({ method: "GET", path, params, getToken }),

    post: <T>(path: string, body?: unknown): Promise<T> =>
      request<T>({ method: "POST", path, body, getToken }),

    patch: <T>(path: string, body: unknown): Promise<T> =>
      request<T>({ method: "PATCH", path, body, getToken }),

    del: (path: string): Promise<void> =>
      request<void>({ method: "DELETE", path, getToken }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
