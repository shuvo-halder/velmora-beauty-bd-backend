import { api } from "../lib/api";

export const getSessions = async () => {
  const { data } = await api.get("/sessions");
  return data.data;
};

export const revokeSession = async (id: string) => {
  const { data } = await api.delete(`/sessions/${id}`);
  return data;
};
