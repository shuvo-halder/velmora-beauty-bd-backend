import { api } from "../lib/api";

export interface CustomerQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const getCustomers = async (params?: CustomerQueryParams) => {
  const { data } = await api.get("/customers", { params });
  return data.data;
};

export const getCustomerById = async (id: string) => {
  const { data } = await api.get(`/customers/${id}`);
  return data.data.customer;
};

export const updateCustomerStatus = async (id: string, isActive: boolean) => {
  const { data } = await api.patch(`/customers/${id}/status`, { isActive });
  return data.data.customer;
};

export const addCustomerNote = async (id: string, note: string) => {
  const { data } = await api.post(`/customers/${id}/notes`, { note });
  return data.data.note;
};

export const resetCustomerPassword = async (id: string) => {
  const { data } = await api.post(`/customers/${id}/reset-password`);
  return data;
};

export const updateCustomerMobileStatus = async (id: string, updates: { phone?: string; phoneVerified?: boolean }) => {
  const { data } = await api.patch(`/customers/${id}/mobile`, updates);
  return data.data.customer;
};
