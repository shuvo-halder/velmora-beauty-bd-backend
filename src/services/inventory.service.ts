import { api } from "../lib/api";

export const getLowStock = async (): Promise<any[]> => {
  const { data } = await api.get("/inventory/low-stock");
  return data.data;
};

export const getOutOfStock = async (): Promise<any[]> => {
  const { data } = await api.get("/inventory/out-of-stock");
  return data.data;
};

export const getInventoryValue = async (): Promise<{ totalValue: number }> => {
  const { data } = await api.get("/inventory/value");
  return data.data;
};

export const getAllInventory = async (): Promise<any[]> => {
  const { data } = await api.get("/inventory");
  return data.data;
};
