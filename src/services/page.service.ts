import { api } from "../lib/api";

export interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: "DRAFT" | "PUBLISHED" | "SCHEDULED";
  pageType: "HOME" | "ABOUT" | "CONTACT" | "POLICY" | "CUSTOM";
  publishedAt?: string | null;
  scheduledFor?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const pageService = {
  getPages: () => api.get<Page[]>('/pages').then(res => res.data),
  getPageById: (id: string) => api.get<Page>(`/pages/${id}`).then(res => res.data),
  createPage: (data: any) => api.post<Page>('/pages', data).then(res => res.data),
  updatePage: (id: string, data: any) => api.put<Page>(`/pages/${id}`, data).then(res => res.data),
  deletePage: (id: string) => api.delete(`/pages/${id}`).then(res => res.data),
};
