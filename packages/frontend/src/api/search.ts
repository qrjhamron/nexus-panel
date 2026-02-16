import apiClient from './client';

export const searchApi = {
  global: (query: string) => apiClient.get('/search', { params: { q: query } }),
};
