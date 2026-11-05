import { api } from "../lib/api";

export const seoService = {
  getGlobalSeo: () => api.get('/seo').then(res => res.data),
  updateGlobalSeo: (data: any) => api.put('/seo', data).then(res => res.data),
};
