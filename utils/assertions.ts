import { expect } from '@playwright/test';
import { z } from 'zod';
import { errorSchema, type PageMeta } from '../schemas/common.schema';
import type { SortOrder } from './list-query';
import type { ApiResponse } from './api-client';

export class SchemaValidationError extends Error {
  constructor(details: string) {
    super(`La respuesta no cumple el schema esperado:\n${details}`);
    this.name = 'SchemaValidationError';
  }
}

function summarize(response: ApiResponse): string {
  const body = typeof response.body === 'string' ? response.body : JSON.stringify(response.body);
  return `${response.method} ${response.url} respondió ${response.status}: ${body.slice(0, 300)}`;
}

export function expectStatus(response: ApiResponse, expected: number): void {
  expect(response.status, summarize(response)).toBe(expected);
}

export function expectSchema<TSchema extends z.ZodType>(
  value: unknown,
  schema: TSchema,
): z.output<TSchema> {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new SchemaValidationError(z.prettifyError(result.error));
  }

  return result.data;
}

export function expectJson<TSchema extends z.ZodType>(
  response: ApiResponse,
  status: number,
  schema: TSchema,
): z.output<TSchema> {
  expectStatus(response, status);
  expect(response.headers['content-type']).toContain('application/json');
  return expectSchema(response.body, schema);
}

export function expectErrorResponse(
  response: ApiResponse,
  status: number,
  message: string | RegExp,
): void {
  expectStatus(response, status);
  const error = expectSchema(response.body, errorSchema);
  expect(error.message).toMatch(message);
}

export function expectSecurityHeaders(response: ApiResponse): void {
  expect(response.headers['x-content-type-options']).toBe('nosniff');
}

export function expectPageWindow(
  page: PageMeta,
  itemCount: number,
  requested: { limit: number; skip: number },
): void {
  const remaining = Math.max(page.total - requested.skip, 0);
  const expectedCount = requested.limit === 0 ? remaining : Math.min(requested.limit, remaining);

  expect(page.skip).toBe(requested.skip);
  expect(itemCount).toBe(expectedCount);
  expect(page.limit).toBe(itemCount);
}

export function expectSortedBy<T>(
  items: readonly T[],
  selector: (item: T) => number,
  order: SortOrder,
): void {
  const values = items.map(selector);
  const sorted = [...values].sort((a, b) => (order === 'asc' ? a - b : b - a));

  expect(values.length).toBeGreaterThan(1);
  expect(values).toEqual(sorted);
}

export function expectRecentTimestamp(isoDate: string, toleranceMs = 5 * 60_000): void {
  const drift = Math.abs(Date.now() - Date.parse(isoDate));
  expect(
    drift,
    `${isoDate} debería estar a menos de ${toleranceMs} ms de la hora actual`,
  ).toBeLessThan(toleranceMs);
}

export function expectCookie(
  response: ApiResponse,
  name: string,
  requiredAttributes: readonly string[],
): void {
  const cookie = response.rawHeaders
    .filter((header) => header.name.toLowerCase() === 'set-cookie')
    .map((header) => header.value)
    .find((value) => value.startsWith(`${name}=`));

  expect(cookie, `Header Set-Cookie de "${name}"`).toBeDefined();

  const attributes = (cookie ?? '').split(';').map((part) => part.trim().toLowerCase());

  for (const attribute of requiredAttributes) {
    expect(attributes, `Atributos de la cookie "${name}"`).toContain(attribute.toLowerCase());
  }
}
