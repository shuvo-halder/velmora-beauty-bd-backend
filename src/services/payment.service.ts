import { api } from "../lib/api";

export const getPayments = async (params?: any) => {
  const { data } = await api.get("/payments", { params });
  return data;
};

export const getPaymentById = async (id: string) => {
  const { data } = await api.get(`/payments/${id}`);
  return data.data;
};

export const updatePaymentStatus = async (id: string, status: string) => {
  const { data } = await api.put(`/payments/${id}`, { status });
  return data.data;
};

export const deletePayment = async (id: string) => {
  const { data } = await api.delete(`/payments/${id}`);
  return data;
};
