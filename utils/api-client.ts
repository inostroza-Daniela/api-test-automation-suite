import { setTimeout as sleep } from 'node:timers/promises';
import type { APIRequestContext, APIResponse } from '@playwright/test';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryParams = Record<string, string | number | boolean>;

export interface RequestOptions {
  params?: QueryParams;
  data?: unknown;
  headers?: Record<string, string>;
}

export interface HttpHeader {
  name: string;
  value: string;
}

export interface ApiResponse<TBody = unknown> {
  method: HttpMethod;
  url: string;
  status: number;
  headers: Record<string, string>;
  rawHeaders: HttpHeader[];
  body: TBody;
  durationMs: number;
  attempts: number;
}

export interface ApiExchange {
  request: { method: HttpMethod; path: string } & RequestOptions;
  response: ApiResponse;
}

export interface ApiClientOptions {
  maxRateLimitRetries?: number;
  maxConnectionRetries?: number;
  maxRetryDelayMs?: number;
}

export class ApiClientError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ApiClientError';
  }
}

const TOO_MANY_REQUESTS = 429;
const IDEMPOTENT_METHODS: ReadonlySet<HttpMethod> = new Set(['GET', 'PUT', 'DELETE']);
const TRANSIENT_CONNECTION_ERROR = /ECONNRESET|ETIMEDOUT|EPIPE|socket hang up/i;

const isRetryableConnectionError = (method: HttpMethod, error: unknown): boolean =>
  IDEMPOTENT_METHODS.has(method) &&
  error instanceof Error &&
  TRANSIENT_CONNECTION_ERROR.test(error.message);

export class ApiClient {
  readonly #request: APIRequestContext;
  readonly #history: ApiExchange[] = [];
  readonly #maxRateLimitRetries: number;
  readonly #maxConnectionRetries: number;
  readonly #maxRetryDelayMs: number;

  constructor(request: APIRequestContext, options: ApiClientOptions = {}) {
    this.#request = request;
    this.#maxRateLimitRetries = options.maxRateLimitRetries ?? 3;
    this.#maxConnectionRetries = options.maxConnectionRetries ?? 2;
    this.#maxRetryDelayMs = options.maxRetryDelayMs ?? 15_000;
  }

  get history(): readonly ApiExchange[] {
    return this.#history;
  }

  get(path: string, options?: RequestOptions): Promise<ApiResponse> {
    return this.send('GET', path, options);
  }

  post(path: string, options?: RequestOptions): Promise<ApiResponse> {
    return this.send('POST', path, options);
  }

  put(path: string, options?: RequestOptions): Promise<ApiResponse> {
    return this.send('PUT', path, options);
  }

  patch(path: string, options?: RequestOptions): Promise<ApiResponse> {
    return this.send('PATCH', path, options);
  }

  delete(path: string, options?: RequestOptions): Promise<ApiResponse> {
    return this.send('DELETE', path, options);
  }

  async send(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<ApiResponse> {
    let rateLimitRetries = 0;
    let connectionRetries = 0;

    for (let attempt = 1; ; attempt += 1) {
      const startedAt = performance.now();
      let response: APIResponse;

      try {
        response = await this.#request.fetch(path, {
          method,
          params: options.params,
          data: options.data,
          headers: options.headers,
          failOnStatusCode: false,
        });
      } catch (error) {
        if (
          connectionRetries < this.#maxConnectionRetries &&
          isRetryableConnectionError(method, error)
        ) {
          connectionRetries += 1;
          await sleep(this.#backoff(connectionRetries));
          continue;
        }

        throw new ApiClientError(
          `${method} ${path} falló antes de recibir una respuesta (intento ${attempt})`,
          { cause: error },
        );
      }

      const durationMs = Math.round(performance.now() - startedAt);

      if (response.status() === TOO_MANY_REQUESTS && rateLimitRetries < this.#maxRateLimitRetries) {
        rateLimitRetries += 1;
        await sleep(this.#rateLimitDelay(response.headers(), rateLimitRetries));
        continue;
      }

      const apiResponse: ApiResponse = {
        method,
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        rawHeaders: response.headersArray(),
        body: await parseBody(response, method),
        durationMs,
        attempts: attempt,
      };

      this.#history.push({ request: { method, path, ...options }, response: apiResponse });
      return apiResponse;
    }
  }

  #backoff(retry: number): number {
    return Math.min(500 * 2 ** (retry - 1), this.#maxRetryDelayMs);
  }

  #rateLimitDelay(headers: Record<string, string>, retry: number): number {
    const retryAfterSeconds = Number(headers['retry-after']);
    const resetEpochSeconds = Number(headers['x-ratelimit-reset']);

    let delayMs = this.#backoff(retry);

    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      delayMs = retryAfterSeconds * 1_000;
    } else if (Number.isFinite(resetEpochSeconds) && resetEpochSeconds > 0) {
      delayMs = resetEpochSeconds * 1_000 - Date.now();
    }

    return Math.min(Math.max(delayMs, 250), this.#maxRetryDelayMs);
  }
}

async function parseBody(response: APIResponse, method: HttpMethod): Promise<unknown> {
  const text = await response.text();

  if (text.length === 0) {
    return null;
  }

  const contentType = response.headers()['content-type'] ?? '';

  if (!contentType.includes('application/json')) {
    return text;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new ApiClientError(
      `${method} ${response.url()} devolvió un JSON inválido (status ${response.status()}): ${text.slice(0, 200)}`,
      { cause: error },
    );
  }
}
