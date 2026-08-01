import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';

export type ApiClientConfig = {
  getBaseUrl: () => Promise<string>;
  getAccessToken?: () => Promise<string | null>;
};

/**
 * Thin HTTP client for backend API calls.
 * Base URL and auth token are resolved per request so offline cache can update apiUrl.
 */
export class ApiClient {
  constructor(private readonly config: ApiClientConfig) {}

  async get<T>(path: string, query?: Record<string, string>): Promise<Result<T>> {
    return this.request<T>('GET', path, undefined, query);
  }

  async post<T>(path: string, body?: unknown): Promise<Result<T>> {
    return this.request<T>('POST', path, body);
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    query?: Record<string, string>,
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

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        return err(
          AppError.network(
            text ? `HTTP ${response.status}: ${text.slice(0, 200)}` : `HTTP ${response.status}`,
          ),
        );
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        return ok(undefined as T);
      }

      const data = (await response.json()) as T;
      return ok(data);
    } catch (cause) {
      return err(AppError.network('Impossible de joindre le serveur', cause));
    }
  }
}
