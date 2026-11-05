import { api } from "../lib/api";

export const getOverviewMetrics = async () => {
  const { data } = await api.get("/analytics/overview");
  return data.data;
};

export const getRevenueMetrics = async () => {
  const { data } = await api.get("/analytics/revenue");
  return data.data;
};

export const getOrdersMetrics = async () => {
  const { data } = await api.get("/analytics/orders");
  return data.data;
};

export const getProductsMetrics = async () => {
  const { data } = await api.get("/analytics/products");
  return data.data;
};

export const getCategoryMetrics = async () => {
  const { data } = await api.get("/analytics/categories");
  return data.data;
};

export const getGa4Metrics = async () => {
  const { data } = await api.get("/analytics/ga4");
  return data.data;
};

export const getBrandMetrics = async () => {
  const { data } = await api.get("/analytics/brands");
  return data.data.brandData;
};
