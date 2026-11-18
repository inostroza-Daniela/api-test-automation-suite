import type { ApiClient, ApiResponse } from '../utils/api-client';

export interface Credentials {
  username: string;
  password: string;
}

export interface LoginPayload extends Credentials {
  expiresInMins?: number;
}

export interface RefreshPayload {
  refreshToken?: string;
  expiresInMins?: number;
}

const RESOURCE = '/auth';

export class AuthService {
  readonly #api: ApiClient;

  constructor(api: ApiClient) {
    this.#api = api;
  }

  login(payload: LoginPayload | Record<string, unknown>): Promise<ApiResponse> {
    return this.#api.post(`${RESOURCE}/login`, { data: payload });
  }

  currentUser(accessToken?: string): Promise<ApiResponse> {
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
    return this.#api.get(`${RESOURCE}/me`, { headers });
  }

  refresh(payload: RefreshPayload): Promise<ApiResponse> {
    return this.#api.post(`${RESOURCE}/refresh`, { data: payload });
  }
}
