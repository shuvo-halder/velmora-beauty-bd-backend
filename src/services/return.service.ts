import { api } from "../lib/api";

export const getReturns = async (params?: any) => {
  const { data } = await api.get("/returns", { params });
  return data.data; // { returns: [...], pagination: {...} }
};

export const getReturnById = async (id: string) => {
  const { data } = await api.get(`/returns/${id}`);
  return data.data.returnRequest;
};

export const updateReturnStatus = async (id: string, status: string, adminNotes?: string) => {
  const { data } = await api.put(`/returns/${id}`, { status, adminNotes });
  return data.data.returnRequest;
};

export const approveReturn = async (id: string, adminNotes?: string) => {
  const { data } = await api.post(`/returns/${id}/approve`, { adminNotes });
  return data.data.returnRequest;
};

export const rejectReturn = async (id: string, adminNotes?: string) => {
  const { data } = await api.post(`/returns/${id}/reject`, { adminNotes });
  return data.data.returnRequest;
};

export const receiveReturn = async (id: string, adminNotes?: string) => {
  const { data } = await api.post(`/returns/${id}/receive`, { adminNotes });
  return data.data.returnRequest;
};

export const deleteReturn = async (id: string) => {
  const { data } = await api.delete(`/returns/${id}`);
  return data;
};
