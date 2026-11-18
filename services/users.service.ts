import type { ApiClient, ApiResponse } from '../utils/api-client';
import { toQueryParams, type ListQuery } from '../utils/list-query';

export type UserRole = 'admin' | 'moderator' | 'user';

export type UserPayload = {
  firstName: string;
  lastName: string;
  age: number;
  gender: 'female' | 'male';
  email: string;
  phone: string;
  username: string;
  password: string;
  birthDate: string;
  role: UserRole;
  company: {
    name: string;
    department: string;
    title: string;
  };
};

const RESOURCE = '/users';

export class UsersService {
  readonly #api: ApiClient;

  constructor(api: ApiClient) {
    this.#api = api;
  }

  list(query?: ListQuery): Promise<ApiResponse> {
    return this.#api.get(RESOURCE, { params: toQueryParams(query) });
  }

  getById(id: number | string, select?: readonly string[]): Promise<ApiResponse> {
    return this.#api.get(`${RESOURCE}/${id}`, { params: toQueryParams({ select }) });
  }

  search(term: string, query?: ListQuery): Promise<ApiResponse> {
    return this.#api.get(`${RESOURCE}/search`, { params: { q: term, ...toQueryParams(query) } });
  }

  filter(key: string, value: string, query?: ListQuery): Promise<ApiResponse> {
    return this.#api.get(`${RESOURCE}/filter`, {
      params: { key, value, ...toQueryParams(query) },
    });
  }

  create(payload: Partial<UserPayload>): Promise<ApiResponse> {
    return this.#api.post(`${RESOURCE}/add`, { data: payload });
  }

  replace(id: number | string, payload: UserPayload): Promise<ApiResponse> {
    return this.#api.put(`${RESOURCE}/${id}`, { data: payload });
  }

  update(id: number | string, changes: Partial<UserPayload>): Promise<ApiResponse> {
    return this.#api.patch(`${RESOURCE}/${id}`, { data: changes });
  }

  remove(id: number | string): Promise<ApiResponse> {
    return this.#api.delete(`${RESOURCE}/${id}`);
  }
}
