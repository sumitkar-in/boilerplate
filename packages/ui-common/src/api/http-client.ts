/**
 * Platform-agnostic fetch transport shared by apps/web and apps/mobile —
 * base URL + auth header + a single shared in-flight refresh-and-retry on
 * 401. Each platform supplies its own token persistence (localStorage vs
 * AsyncStorage) via `TokenStore`; the fetch/refresh/retry logic itself
 * only needs to live once. See: docs/multi-tenant-modular-boilerplate-architecture.md §11.2/§11.4
 */

export type TokenStore = {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  getTenantSlug: () => string | null;
  setSession: (input: {
    accessToken: string;
    refreshToken: string;
    tenantSlug?: string | null;
  }) => void;
  clearSession: () => void;
};

export type FetchOptions = {
  method?: string;
  body?: unknown;
  // Only needed for pre-auth calls (login, accept-invite) — TenantResolverMiddleware
  // reads this header before a JWT exists. Authenticated calls carry the
  // tenant in the access token instead. See: skills/tenant-data-access/SKILL.md
  tenantSlug?: string;
  skipAuth?: boolean;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type HttpClient = {
  apiFetch: <T>(path: string, opts?: FetchOptions) => Promise<T>;
  apiDownload: (path: string) => Promise<Blob>;
  apiFetchStream: <T>(path: string, opts?: FetchOptions) => AsyncGenerator<T>;
};

export function createHttpClient(options: {
  baseUrl: string;
  tokenStore: TokenStore;
}): HttpClient {
  const { baseUrl, tokenStore } = options;

  async function rawFetch(path: string, opts: FetchOptions = {}): Promise<Response> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const tenantSlug = opts.tenantSlug ?? tokenStore.getTenantSlug();
    if (tenantSlug) headers['x-tenant-id'] = tenantSlug;
    if (!opts.skipAuth) {
      const token = tokenStore.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return fetch(`${baseUrl}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  }

  // Shared in-flight promise so concurrent 401s only trigger one refresh call.
  let refreshPromise: Promise<boolean> | null = null;

  function tryRefresh(): Promise<boolean> {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      const refreshToken = tokenStore.getRefreshToken();
      const tenantSlug = tokenStore.getTenantSlug();
      if (!refreshToken) return false;
      try {
        const res = await rawFetch('/auth/refresh', {
          method: 'POST',
          skipAuth: true,
          body: { refreshToken },
        });
        if (!res.ok) {
          tokenStore.clearSession();
          return false;
        }
        const data = (await res.json()) as {
          accessToken: string;
          refreshToken: string;
        };
        tokenStore.setSession({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          tenantSlug: tenantSlug ?? '',
        });
        return true;
      } catch {
        tokenStore.clearSession();
        return false;
      }
    })();
    void refreshPromise.finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  }

  /** Authorized binary fetch (file downloads) with the same 401 refresh-and-retry as apiFetch. */
  async function apiDownload(path: string): Promise<Blob> {
    let res = await rawFetch(path);
    if (res.status === 401) {
      const refreshed = await tryRefresh();
      if (refreshed) res = await rawFetch(path);
    }
    if (!res.ok) throw new ApiError(res.status, res.statusText);
    return res.blob();
  }

  /** Attempts one silent refresh-and-retry on a 401 before giving up. */
  async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
    let res = await rawFetch(path, opts);
    if (res.status === 401 && !opts.skipAuth) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        res = await rawFetch(path, opts);
      }
    }
    if (!res.ok) {
      const body: unknown = await res.json().catch(() => ({}));
      const message =
        body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
          ? body.message
          : res.statusText;
      throw new ApiError(res.status, message);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  /**
   * Consumes a Server-Sent-Events endpoint, yielding each frame's parsed
   * JSON payload as it arrives. A `data: [DONE]` frame ends the stream
   * (not yielded). The 401-refresh-and-retry only covers the initial
   * request — once bytes start streaming there's no way to swap the
   * token underneath an in-flight response, same limitation any SSE/
   * fetch-stream client has.
   */
  async function* apiFetchStream<T>(
    path: string,
    opts: FetchOptions = {},
  ): AsyncGenerator<T> {
    let res = await rawFetch(path, opts);
    if (res.status === 401 && !opts.skipAuth) {
      const refreshed = await tryRefresh();
      if (refreshed) res = await rawFetch(path, opts);
    }
    if (!res.ok || !res.body) {
      const body: unknown = await res.json().catch(() => ({}));
      const message =
        body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
          ? body.message
          : res.statusText;
      throw new ApiError(res.status, message);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    function parseFrame(frame: string): T | null | 'done' {
      const line = frame.trim();
      if (!line.startsWith('data:')) return null;
      const data = line.slice('data:'.length).trim();
      if (data === '[DONE]') return 'done';
      return JSON.parse(data) as T;
    }

    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const frame = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf('\n\n');

          const parsed = parseFrame(frame);
          if (parsed === 'done') return;
          if (parsed) yield parsed;
        }
      }
      buffer += decoder.decode().replace(/\r\n/g, '\n');
      if (buffer.trim()) {
        const parsed = parseFrame(buffer);
        if (parsed !== 'done' && parsed) yield parsed;
      }
    } finally {
      reader.releaseLock();
    }
  }

  return { apiFetch, apiDownload, apiFetchStream };
}

/** Normalizes a configured API base URL to always end in `/api/v1`. */
export function normalizeApiUrl(value: string | undefined, fallback: string): string {
  const trimmed = (value?.trim() || fallback).replace(/\/+$/, '');
  if (!trimmed || trimmed === '/') return fallback;
  if (trimmed.endsWith('/api/v1')) return trimmed;
  if (trimmed.endsWith('/api')) return `${trimmed}/v1`;
  // A bare origin/host (e.g. "http://10.0.2.2:3000", the documented mobile
  // .env example) always needs the API path appended — it never means
  // "already correct as-is".
  return `${trimmed}/api/v1`;
}
