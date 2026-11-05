import { api } from "../lib/api";

export interface OrderQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
}

export const getOrders = async (params?: OrderQueryParams) => {
  const { data } = await api.get("/orders", { params });
  return data.data;
};

export const getOrderById = async (id: string) => {
  const { data } = await api.get(`/orders/${id}`);
  return data.data.order;
};

export const updateOrderStatus = async (id: string, payload: { status?: string; paymentStatus?: string; internalNotes?: string }) => {
  const { data } = await api.put(`/orders/${id}/status`, payload);
  return data.data.order;
};

export const assignOrderStaff = async (id: string, assignedStaffId: string | null) => {
  const { data } = await api.patch(`/orders/${id}/assign`, { assignedStaffId });
  return data.data.order;
};

export const addOrderNote = async (id: string, note: string) => {
  const { data } = await api.post(`/orders/${id}/notes`, { note });
  return data.data.note;
};

export const deleteOrder = async (id: string) => {
  await api.delete(`/orders/${id}`);
};
