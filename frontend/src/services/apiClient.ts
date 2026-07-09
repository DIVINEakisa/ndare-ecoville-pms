import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse, CurrentUser } from '../types/api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

type SessionPayload = {
  accessToken: string;
  refreshToken: string;
  user: CurrentUser;
};

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

let refreshPromise: Promise<SessionPayload> | null = null;

function clearStoredSession() {
  localStorage.removeItem('hms.accessToken');
  localStorage.removeItem('hms.refreshToken');
  localStorage.removeItem('hms.user');
}

function storeSession(session: SessionPayload) {
  localStorage.setItem('hms.accessToken', session.accessToken);
  localStorage.setItem('hms.refreshToken', session.refreshToken);
  localStorage.setItem('hms.user', JSON.stringify(session.user));
}

export async function refreshStoredSession() {
  const refreshToken = localStorage.getItem('hms.refreshToken');

  if (!refreshToken) {
    // No refresh token — wipe everything (handles stale accessToken-only state)
    clearStoredSession();
    throw new Error('No refresh token available');
  }

  try {
    refreshPromise ??= axios
      .post<ApiResponse<SessionPayload>>(`${API_URL}/auth/refresh`, { refreshToken })
      .then((response) => response.data.data)
      .finally(() => {
        refreshPromise = null;
      });

    const session = await refreshPromise;
    storeSession(session);
    return session;
  } catch (error) {
    clearStoredSession();
    throw error;
  }
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('hms.accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const session = await refreshStoredSession();

      if (!session) {
        return Promise.reject(error);
      }

      originalRequest.headers.Authorization = `Bearer ${session.accessToken}`;
      return apiClient(originalRequest);
    } catch {
      return Promise.reject(error);
    }
  }
);
