import apiClient from './client';

export interface ServerFilters {
  page?: number;
  perPage?: number;
  search?: string;
}

export const serversApi = {
  list: (params?: ServerFilters) => apiClient.get('/servers', { params }),
  get: (uuid: string) => apiClient.get(`/servers/${uuid}`),
  create: (data: Record<string, unknown>) => apiClient.post('/servers', data),
  update: (uuid: string, data: Record<string, unknown>) => apiClient.patch(`/servers/${uuid}`, data),
  delete: (uuid: string) => apiClient.delete(`/servers/${uuid}`),

  sendPower: (uuid: string, action: string) => apiClient.post(`/servers/${uuid}/power`, { action }),
  sendCommand: (uuid: string, command: string) => apiClient.post(`/servers/${uuid}/command`, { command }),

  getResources: (uuid: string) => apiClient.get(`/servers/${uuid}/resources`),
  getStartup: (uuid: string) => apiClient.get(`/servers/${uuid}/startup`),
  updateStartup: (uuid: string, vars: Record<string, string>) =>
    apiClient.put(`/servers/${uuid}/startup`, { variables: vars }),

  getDatabases: (uuid: string) => apiClient.get(`/servers/${uuid}/databases`),
  createDatabase: (uuid: string, data: { name: string; remote: string }) =>
    apiClient.post(`/servers/${uuid}/databases`, data),
  deleteDatabase: (uuid: string, id: string) => apiClient.delete(`/servers/${uuid}/databases/${id}`),
  rotateDatabasePassword: (uuid: string, id: string) =>
    apiClient.post(`/servers/${uuid}/databases/${id}/rotate-password`),

  getSchedules: (uuid: string) => apiClient.get(`/servers/${uuid}/schedules`),
  createSchedule: (uuid: string, data: Record<string, unknown>) =>
    apiClient.post(`/servers/${uuid}/schedules`, data),
  updateSchedule: (uuid: string, id: string, data: Record<string, unknown>) =>
    apiClient.put(`/servers/${uuid}/schedules/${id}`, data),
  deleteSchedule: (uuid: string, id: string) => apiClient.delete(`/servers/${uuid}/schedules/${id}`),

  getSubusers: (uuid: string) => apiClient.get(`/servers/${uuid}/subusers`),
  addSubuser: (uuid: string, data: { email: string; permissions: string[] }) =>
    apiClient.post(`/servers/${uuid}/subusers`, data),
  updateSubuser: (uuid: string, id: string, data: { permissions: string[] }) =>
    apiClient.put(`/servers/${uuid}/subusers/${id}`, data),
  removeSubuser: (uuid: string, id: string) => apiClient.delete(`/servers/${uuid}/subusers/${id}`),

  getSettings: (uuid: string) => apiClient.get(`/servers/${uuid}/settings`),
  updateSettings: (uuid: string, data: Record<string, unknown>) =>
    apiClient.patch(`/servers/${uuid}/settings`, data),
  reinstall: (uuid: string) => apiClient.post(`/servers/${uuid}/settings/reinstall`),
};
