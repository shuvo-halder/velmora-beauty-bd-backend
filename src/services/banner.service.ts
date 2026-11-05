import { api } from "../lib/api";

export interface Banner {
  id: string;
  title: string;
  desktopImage: string;
  mobileImage?: string;
  linkUrl?: string;
  ctaText?: string;
  startDate?: string;
  endDate?: string;
  priority: number;
  isActive: boolean;
}

export const bannerService = {
  getAll: async (params?: { status?: string }) => {
    const response = await api.get("/banners", { params });
    return response.data;
  },

  getPublic: async () => {
    const response = await api.get("/banners/public");
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/banners/${id}`);
    return response.data;
  },

  create: async (data: Partial<Banner>) => {
    const response = await api.post("/banners", data);
    return response.data;
  },

  update: async (id: string, data: Partial<Banner>) => {
    const response = await api.put(`/banners/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/banners/${id}`);
    return response.data;
  },
};
