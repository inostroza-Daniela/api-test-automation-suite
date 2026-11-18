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
  maxRetryDelayMs?: number;
}

export class ApiClientError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ApiClientError';
  }
}

const TOO_MANY_REQUESTS = 429;

export class ApiClient {
  readonly #request: APIRequestContext;
  readonly #history: ApiExchange[] = [];
  readonly #maxRateLimitRetries: number;
  readonly #maxRetryDelayMs: number;

  constructor(request: APIRequestContext, options: ApiClientOptions = {}) {
    this.#request = request;
    this.#maxRateLimitRetries = options.maxRateLimitRetries ?? 3;
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
    for (let attempt = 1; ; attempt += 1) {
      const startedAt = performance.now();
      const response = await this.#fetch(method, path, options);
      const durationMs = Math.round(performance.now() - startedAt);

      if (response.status() === TOO_MANY_REQUESTS && attempt <= this.#maxRateLimitRetries) {
        await sleep(this.#retryDelay(response.headers(), attempt));
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

  async #fetch(method: HttpMethod, path: string, options: RequestOptions): Promise<APIResponse> {
    try {
      return await this.#request.fetch(path, {
        method,
        params: options.params,
        data: options.data,
        headers: options.headers,
        failOnStatusCode: false,
      });
    } catch (error) {
      throw new ApiClientError(`${method} ${path} falló antes de recibir una respuesta`, {
        cause: error,
      });
    }
  }

  #retryDelay(headers: Record<string, string>, attempt: number): number {
    const retryAfterSeconds = Number(headers['retry-after']);
    const resetEpochSeconds = Number(headers['x-ratelimit-reset']);

    let delayMs = 1_000 * 2 ** (attempt - 1);

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
