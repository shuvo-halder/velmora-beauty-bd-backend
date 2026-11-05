import { api } from "../lib/api";

export const getRefunds = async (params?: any) => {
  const { data } = await api.get("/refunds", { params });
  return data.data; // { refunds: [...], pagination: {...} }
};

export const getRefundById = async (id: string) => {
  const { data } = await api.get(`/refunds/${id}`);
  return data.data?.refund || data.data;
};

export const approveRefund = async (id: string, payload?: any) => {
  const { data } = await api.post(`/refunds/${id}/approve`, payload || {});
  return data.data?.refund || data.data;
};

export const rejectRefund = async (id: string, reason?: string, providerReference?: string) => {
  const { data } = await api.post(`/refunds/${id}/reject`, { reason, providerReference });
  return data.data?.refund || data.data;
};

export const processRefund = async (id: string, approve: boolean, providerReference?: string) => {
  const { data } = await api.post(`/refunds/${id}/process`, { approve, providerReference });
  return data.data?.refund || data.data;
};

export const initiateRefund = async (payload: { orderId: string; paymentId: string; amount: number; reason: string }) => {
  const { data } = await api.post("/refunds/initiate", payload);
  return data.data?.refund || data.data;
};


export const deleteRefund = async (id: string) => {
  const { data } = await api.delete(`/refunds/${id}`);
  return data;
};
