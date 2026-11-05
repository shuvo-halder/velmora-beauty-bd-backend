import { api } from "../lib/api";

export interface Popup {
  id: string;
  title: string;
  type: "exit_intent" | "homepage" | "product" | "coupon";
  headline?: string;
  body?: string;
  couponCode?: string;
  imageUrl?: string;
  delaySeconds: number;
  isActive: boolean;
}

export const popupService = {
  getAll: async (params?: { type?: string; status?: string }) => {
    const response = await api.get("/popups", { params });
    return response.data;
  },

  getPublic: async () => {
    const response = await api.get("/popups/public");
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/popups/${id}`);
    return response.data;
  },

  create: async (data: Partial<Popup>) => {
    const response = await api.post("/popups", data);
    return response.data;
  },

  update: async (id: string, data: Partial<Popup>) => {
    const response = await api.put(`/popups/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/popups/${id}`);
    return response.data;
  },
};
