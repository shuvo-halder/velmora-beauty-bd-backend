import { api } from "../lib/api";
import {
  DashboardOverviewResponse,
  DashboardQueryParams,
  RecentOrder,
  RecentCustomer,
  InventoryAlertItem,
} from "../types/dashboard";

export const getDashboardOverview = async (
  params?: DashboardQueryParams
): Promise<DashboardOverviewResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.range) queryParams.set("range", params.range);
  if (params?.from) queryParams.set("from", params.from);
  if (params?.to) queryParams.set("to", params.to);
  if (params?.limit) queryParams.set("limit", params.limit.toString());

  const url = `/dashboard/overview${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const response = await api.get(url);
  return response.data.data;
};

export const getDashboardRecentOrders = async (limit: number = 10): Promise<RecentOrder[]> => {
  const response = await api.get(`/dashboard/recent-orders?limit=${limit}`);
  return response.data.data;
};

export const getDashboardRecentCustomers = async (limit: number = 10): Promise<RecentCustomer[]> => {
  const response = await api.get(`/dashboard/recent-customers?limit=${limit}`);
  return response.data.data;
};

export const getDashboardInventoryAlerts = async (limit: number = 15): Promise<InventoryAlertItem[]> => {
  const response = await api.get(`/dashboard/inventory-alerts?limit=${limit}`);
  return response.data.data;
};
