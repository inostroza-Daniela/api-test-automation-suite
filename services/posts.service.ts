import type { ApiClient, ApiResponse } from '../utils/api-client';
import { toQueryParams, type ListQuery } from '../utils/list-query';

export type PostPayload = {
  title: string;
  body: string;
  userId: number;
  tags: string[];
  reactions: {
    likes: number;
    dislikes: number;
  };
};

const RESOURCE = '/posts';

export class PostsService {
  readonly #api: ApiClient;

  constructor(api: ApiClient) {
    this.#api = api;
  }

  list(query?: ListQuery): Promise<ApiResponse> {
    return this.#api.get(RESOURCE, { params: toQueryParams(query) });
  }

  getById(id: number | string): Promise<ApiResponse> {
    return this.#api.get(`${RESOURCE}/${id}`);
  }

  search(term: string, query?: ListQuery): Promise<ApiResponse> {
    return this.#api.get(`${RESOURCE}/search`, { params: { q: term, ...toQueryParams(query) } });
  }

  byUser(userId: number | string, query?: ListQuery): Promise<ApiResponse> {
    return this.#api.get(`${RESOURCE}/user/${userId}`, { params: toQueryParams(query) });
  }

  byTag(tag: string, query?: ListQuery): Promise<ApiResponse> {
    return this.#api.get(`${RESOURCE}/tag/${encodeURIComponent(tag)}`, {
      params: toQueryParams(query),
    });
  }

  tagList(): Promise<ApiResponse> {
    return this.#api.get(`${RESOURCE}/tag-list`);
  }

  create(payload: Partial<PostPayload> | Record<string, unknown>): Promise<ApiResponse> {
    return this.#api.post(`${RESOURCE}/add`, { data: payload });
  }

  replace(id: number | string, payload: PostPayload): Promise<ApiResponse> {
    return this.#api.put(`${RESOURCE}/${id}`, { data: payload });
  }

  update(id: number | string, changes: Partial<PostPayload>): Promise<ApiResponse> {
    return this.#api.patch(`${RESOURCE}/${id}`, { data: changes });
  }

  remove(id: number | string): Promise<ApiResponse> {
    return this.#api.delete(`${RESOURCE}/${id}`);
  }
}
