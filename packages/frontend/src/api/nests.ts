import apiClient from './client';

export const nestsApi = {
  list: () => apiClient.get('/nests'),
  get: (id: string) => apiClient.get(`/nests/${id}`),
};
