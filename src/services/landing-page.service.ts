import { api } from "../lib/api";

export const landingPageService = {
  getPages: () => api.get('/landing-pages').then(res => res.data),
  getPageById: (id: string) => api.get(`/landing-pages/${id}`).then(res => res.data),
  createPage: (data: any) => api.post('/landing-pages', data).then(res => res.data),
  updatePage: (id: string, data: any) => api.put(`/landing-pages/${id}`, data).then(res => res.data),
  deletePage: (id: string) => api.delete(`/landing-pages/${id}`).then(res => res.data),
};
