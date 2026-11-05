import { api } from "../lib/api";

export const getNotifications = async (params?: any) => {
  const { data } = await api.get("/notifications", { params });
  return data.data; // { notifications: [...], pagination: {...} }
};

export const markAsRead = async (id: string) => {
  const { data } = await api.post(`/notifications/${id}/read`);
  return data;
};

export const markAllAsRead = async () => {
  const { data } = await api.post(`/notifications/read-all`);
  return data;
};

export const sendBulkNotification = async (payload: any) => {
  const { data } = await api.post(`/notifications/send`, payload);
  return data;
};
