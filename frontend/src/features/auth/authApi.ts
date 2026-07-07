import { apiClient } from '../../services/apiClient';
import type { ApiResponse, CurrentUser } from '../../types/api';

export type LoginInput = {
  email: string;
  password: string;
};

export type SessionPayload = {
  accessToken: string;
  refreshToken: string;
  user: CurrentUser;
};

export async function loginRequest(input: LoginInput) {
  const { data } = await apiClient.post<ApiResponse<SessionPayload>>('/auth/login', input);
  return data.data;
}

export async function currentUserRequest() {
  const { data } = await apiClient.get<ApiResponse<CurrentUser>>('/auth/me');
  return data.data;
}
