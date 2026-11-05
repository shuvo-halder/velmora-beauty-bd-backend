import { api } from "../lib/api";

export const getUsers = async (params?: any) => {
  try {
    const { data } = await api.get("/users", { params });
    return data;
  } catch (error) {
    return Promise.reject(error);
  }
};

export const getUserById = async (id: string) => {
  try {
    const { data } = await api.get(`/users/${id}`);
    return data.data;
  } catch (error) {
    return Promise.reject(error);
  }
};

export const createUser = async (userData: any) => {
  try {
    const { data } = await api.post("/users", userData);
    return data.data;
  } catch (error) {
    return Promise.reject(error);
  }
};

export const updateUser = async (id: string, userData: any) => {
  try {
    const { data } = await api.put(`/users/${id}`, userData);
    return data.data;
  } catch (error) {
    return Promise.reject(error);
  }
};

export const deleteUser = async (id: string) => {
  try {
    await api.delete(`/users/${id}`);
  } catch (error) {
    return Promise.reject(error);
  }
};

export const updateUserStatus = async (id: string, isActive: boolean) => {
  try {
    const { data } = await api.patch(`/users/${id}/status`, { isActive });
    return data.data;
  } catch (error) {
    return Promise.reject(error);
  }
};

export const updateUserRole = async (id: string, roleId: string) => {
  try {
    const { data } = await api.patch(`/users/${id}/role`, { roleId });
    return data.data;
  } catch (error) {
    return Promise.reject(error);
  }
};

export const adminResetPassword = async (id: string, newPassword: string) => {
  try {
    const { data } = await api.patch(`/users/${id}/reset-password`, { newPassword });
    return data.data;
  } catch (error) {
    return Promise.reject(error);
  }
};

export const forceLogoutUser = async (id: string) => {
  try {
    const { data } = await api.post(`/users/${id}/force-logout`);
    return data.data;
  } catch (error) {
    return Promise.reject(error);
  }
};
