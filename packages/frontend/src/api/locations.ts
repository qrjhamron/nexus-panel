import apiClient from './client';

export interface Location {
  id: string;
  short: string;
  long: string;
  nodeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLocationPayload {
  short: string;
  long: string;
}

export const locationsApi = {
  list: () => apiClient.get('/admin/locations'),
  create: (data: CreateLocationPayload) => apiClient.post('/admin/locations', data),
  update: (id: string, data: Partial<CreateLocationPayload>) =>
    apiClient.put(`/admin/locations/${id}`, data),
  delete: (id: string) => apiClient.delete(`/admin/locations/${id}`),
};
