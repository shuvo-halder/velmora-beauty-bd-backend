import { api } from "../lib/api";

export const getShipments = async (params?: any) => {
  const { data } = await api.get("/shipments", { params });
  return data.data; // { shipments: [...], pagination: {...} }
};

export const getShipmentById = async (id: string) => {
  const { data } = await api.get(`/shipments/${id}`);
  return data.data.shipment;
};

export const updateShipmentStatus = async (id: string, status: string, trackingInfo?: any) => {
  const { data } = await api.put(`/shipments/${id}/status`, { status, ...trackingInfo });
  return data.data.shipment;
};

export const createShipment = async (payload: any) => {
  const { data } = await api.post("/shipments", payload);
  return data.data.shipment;
};

export const deleteShipment = async (id: string) => {
  const { data } = await api.delete(`/shipments/${id}`);
  return data;
};
