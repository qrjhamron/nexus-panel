import apiClient from './client';

export const filesApi = {
  list: (uuid: string, directory: string) =>
    apiClient.get(`/servers/${uuid}/files/list`, { params: { directory } }),
  contents: (uuid: string, file: string) =>
    apiClient.get(`/servers/${uuid}/files/contents`, { params: { file } }),
  save: (uuid: string, file: string, content: string) =>
    apiClient.post(`/servers/${uuid}/files/write`, content, {
      params: { file },
      headers: { 'Content-Type': 'text/plain' },
    }),
  rename: (uuid: string, root: string, files: { from: string; to: string }[]) =>
    apiClient.put(`/servers/${uuid}/files/rename`, { root, files }),
  copy: (uuid: string, location: string) =>
    apiClient.post(`/servers/${uuid}/files/copy`, { location }),
  compress: (uuid: string, root: string, files: string[]) =>
    apiClient.post(`/servers/${uuid}/files/compress`, { root, files }),
  decompress: (uuid: string, root: string, file: string) =>
    apiClient.post(`/servers/${uuid}/files/decompress`, { root, file }),
  delete: (uuid: string, root: string, files: string[]) =>
    apiClient.post(`/servers/${uuid}/files/delete`, { root, files }),
  createDirectory: (uuid: string, root: string, name: string) =>
    apiClient.post(`/servers/${uuid}/files/create-directory`, { root, name }),
  getUploadUrl: (uuid: string) => apiClient.get(`/servers/${uuid}/files/upload`),
  getDownloadUrl: (uuid: string, file: string) =>
    apiClient.get(`/servers/${uuid}/files/download`, { params: { file } }),
};
