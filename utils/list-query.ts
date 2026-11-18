import type { QueryParams } from './api-client';

export type SortOrder = 'asc' | 'desc';

export interface ListQuery {
  limit?: number | string;
  skip?: number | string;
  select?: readonly string[];
  sortBy?: string;
  order?: SortOrder | (string & {});
}

export function toQueryParams(query: ListQuery = {}): QueryParams {
  const params: QueryParams = {};

  if (query.limit !== undefined) params.limit = query.limit;
  if (query.skip !== undefined) params.skip = query.skip;
  if (query.select?.length) params.select = query.select.join(',');
  if (query.sortBy !== undefined) params.sortBy = query.sortBy;
  if (query.order !== undefined) params.order = query.order;

  return params;
}
