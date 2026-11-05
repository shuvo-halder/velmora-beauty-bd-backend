import { api } from "../lib/api";

export const blogService = {
  getPosts: () => api.get('/blog').then(res => res.data),
  getPostById: (id: string) => api.get(`/blog/${id}`).then(res => res.data),
  createPost: (data: any) => api.post('/blog', data).then(res => res.data),
  updatePost: (id: string, data: any) => api.put(`/blog/${id}`, data).then(res => res.data),
  deletePost: (id: string) => api.delete(`/blog/${id}`).then(res => res.data),
};
