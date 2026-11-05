import { api } from "../lib/api";

export interface Promotion {
  id: string;
  name: string;
  type: "buy_x_get_y" | "category_discount" | "brand_discount" | "cart_discount" | "bundle_discount";
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  rules?: any;
  priority: number;
  isStackable: boolean;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  stats?: {
    revenueImpact: string;
    ordersGenerated: number;
    customerAcquisition: number;
  };
}

export const promotionService = {
  getAll: async (params?: { status?: string; type?: string }) => {
    const response = await api.get("/promotions", { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/promotions/${id}`);
    return response.data;
  },

  create: async (data: Partial<Promotion>) => {
    const response = await api.post("/promotions", data);
    return response.data;
  },

  update: async (id: string, data: Partial<Promotion>) => {
    const response = await api.put(`/promotions/${id}`, data);
    return response.data;
  },

  toggleActive: async (id: string) => {
    const response = await api.patch(`/promotions/${id}/toggle`);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/promotions/${id}`);
    return response.data;
  },

  apply: async (items: any[], totalAmount: number) => {
    const response = await api.post("/promotions/apply", { items, totalAmount });
    return response.data;
  },
};
