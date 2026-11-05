import { api } from "../lib/api";

export const faqService = {
  getFaqs: () => api.get('/faqs').then(res => res.data),
  getFaqById: (id: string) => api.get(`/faqs/${id}`).then(res => res.data),
  createFaq: (data: any) => api.post('/faqs', data).then(res => res.data),
  updateFaq: (id: string, data: any) => api.put(`/faqs/${id}`, data).then(res => res.data),
  deleteFaq: (id: string) => api.delete(`/faqs/${id}`).then(res => res.data),
  getCategories: () => api.get('/faqs/categories').then(res => res.data),
  createCategory: (data: any) => api.post('/faqs/categories', data).then(res => res.data),
  deleteCategory: (id: string) => api.delete(`/faqs/categories/${id}`).then(res => res.data),
};
