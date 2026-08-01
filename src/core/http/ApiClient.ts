import { APP_CONFIG } from '@/core/config/appConfig';
import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';

export type ApiClientConfig = {
  getBaseUrl: () => Promise<string>;
  getAccessToken?: () => Promise<string | null>;
  /** Prepare for automatic token refresh — called when 401 is received. */
  refreshAccessToken?: () => Promise<string | null>;
  timeoutMs?: number;
  maxRetries?: number;
  onRequest?: (url: string, method: string) => void;
  onResponse?: (url: string, status: number) => void;
  onError?: (url: string, error: unknown) => void;
};

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 2;

/**
 * Shared HTTP client for all RemoteDataSources.
 * Bearer auth, retry, timeout, logging, error mapping, token refresh hook.
 */
export class ApiClient {
  constructor(private readonly config: ApiClientConfig) {}

  async get<T>(path: string, query?: Record<string, string>): Promise<Result<T>> {
    return this.requestWithRetry<T>('GET', path, undefined, query);
  }

  async post<T>(path: string, body?: unknown): Promise<Result<T>> {
    return this.requestWithRetry<T>('POST', path, body);
  }

  private async requestWithRetry<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    query?: Record<string, string>,
    attempt = 0,
  ): Promise<Result<T>> {
    const result = await this.request<T>(method, path, body, query);
    if (result.ok) return result;

    const maxRetries = this.config.maxRetries ?? DEFAULT_MAX_RETRIES;
    const isRetryable =
      result.error.code === 'NETWORK' && attempt < maxRetries;

    if (isRetryable) {
      await sleep(500 * (attempt + 1));
      return this.requestWithRetry(method, path, body, query, attempt + 1);
    }

    return result;
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    query?: Record<string, string>,
    isRetryAfterRefresh = false,
  ): Promise<Result<T>> {
    const baseUrl = (await this.config.getBaseUrl()).replace(/\/$/, '');
    const url = new URL(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
      }
    }

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    const token = this.config.getAccessToken ? await this.config.getAccessToken() : null;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    this.config.onRequest?.(url.toString(), method);

    const timeoutMs = this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    try {
      const response = await fetchWithTimeout(url.toString(), {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        timeoutMs,
      });

      this.config.onResponse?.(url.toString(), response.status);

      if (response.status === 401 && this.config.refreshAccessToken && !isRetryAfterRefresh) {
        const newToken = await this.config.refreshAccessToken();
        if (newToken) {
          return this.request<T>(method, path, body, query, true);
        }
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        const error = AppError.network(
          text ? `HTTP ${response.status}: ${text.slice(0, 200)}` : `HTTP ${response.status}`,
        );
        this.config.onError?.(url.toString(), error);
        return err(error);
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        return ok(undefined as T);
      }

      const data = (await response.json()) as T;
      return ok(data);
    } catch (cause) {
      this.config.onError?.(url.toString(), cause);
      return err(AppError.network('Impossible de joindre le serveur', cause));
    }
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs: number },
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Build ApiClient config from local settings cache and secure storage. */
export function createApiClientConfig(
  getBaseUrl: () => Promise<string>,
  secureStorage?: { getItem(key: string): Promise<string | null> },
): ApiClientConfig {
  return {
    getBaseUrl,
    getAccessToken: secureStorage
      ? () => secureStorage.getItem(APP_CONFIG.secureStorageKeys.sessionToken)
      : undefined,
    refreshAccessToken: secureStorage
      ? async () => {
          const token = await secureStorage.getItem(APP_CONFIG.secureStorageKeys.sessionToken);
          return token;
        }
      : undefined,
    onRequest: (url, method) => {
      if (__DEV__) {
        console.debug(`[ApiClient] ${method} ${url}`);
      }
    },
  };
}
