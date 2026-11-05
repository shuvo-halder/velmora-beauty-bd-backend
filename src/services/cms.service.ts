import { api } from "../lib/api";

export const cmsService = {
  getPages: () => api.get('/pages').then(res => res.data),
  getPageById: (id: string) => api.get(`/pages/${id}`).then(res => res.data),
  createPage: (data: any) => api.post('/pages', data).then(res => res.data),
  updatePage: (id: string, data: any) => api.put(`/pages/${id}`, data).then(res => res.data),
  deletePage: (id: string) => api.delete(`/pages/${id}`).then(res => res.data),
};
