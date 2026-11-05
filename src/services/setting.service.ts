import { api } from "../lib/api";

export const getSettings = async (group: string) => {
  const { data } = await api.get(`/settings/${group}`);
  return data.data;
};

export const updateSettings = async (group: string, payload: any) => {
  const { data } = await api.put(`/settings/${group}`, payload);
  return data.data;
};

export const getStoreSettings = async () => {
  const { data } = await api.get('/settings/store');
  return data.data;
};

export const updateStoreSettings = async (payload: any) => {
  const { data } = await api.put('/settings/store', payload);
  return data.data;
};
