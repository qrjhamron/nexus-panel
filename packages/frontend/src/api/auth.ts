import apiClient from './client';

export interface LoginPayload {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
}

export const authApi = {
  login: (payload: LoginPayload) => apiClient.post('/auth/login', payload),
  register: (payload: RegisterPayload) => apiClient.post('/auth/register', payload),
  refresh: () => apiClient.post('/auth/refresh'),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get('/auth/me'),

  setup2FA: () => apiClient.post('/auth/2fa/setup'),
  verify2FA: (code: string) => apiClient.post('/auth/2fa/verify', { code }),
  disable2FA: (password: string) => apiClient.post('/auth/2fa/disable', { password }),

  listSessions: () => apiClient.get('/auth/sessions'),
  revokeSession: (id: string) => apiClient.delete(`/auth/sessions/${id}`),
};
