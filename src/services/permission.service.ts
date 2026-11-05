import { api } from "../lib/api";

export interface Permission {
  id: string;
  name: string;
  module: string;
  action: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const getPermissions = async (): Promise<Permission[]> => {
  const { data } = await api.get("/permissions");
  return data?.data?.permissions || [];
};
