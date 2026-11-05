import { api } from "../lib/api";

export const getRoles = async () => {
  const { data } = await api.get("/roles");
  return data.data;
};

export const getRoleById = async (id: string) => {
  const { data } = await api.get(`/roles/${id}`);
  return data.data;
};

export const createRole = async (roleData: any) => {
  const { data } = await api.post("/roles", roleData);
  return data.data;
};

export const updateRole = async (id: string, roleData: any) => {
  const { data } = await api.put(`/roles/${id}`, roleData);
  return data.data;
};

export const deleteRole = async (id: string) => {
  await api.delete(`/roles/${id}`);
};

export const updateRolePermissions = async (id: string, permissions: any[]) => {
  const { data } = await api.patch(`/roles/${id}/permissions`, { permissions });
  return data.data;
};
