import apiClient from './client';

export const notificationsApi = {
  list: (params?: { page?: number; perPage?: number }) =>
    apiClient.get('/notifications', { params }),
  markRead: (id: string) => apiClient.post(`/notifications/${id}/read`),
  markAllRead: () => apiClient.post('/notifications/read-all'),
  unreadCount: () => apiClient.get('/notifications/unread-count'),
};
