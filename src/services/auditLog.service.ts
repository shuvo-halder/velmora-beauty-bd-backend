import { api } from "../lib/api";

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  createdAt: string;
  details: string | null; // JSON string
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
    role: {
      id: string;
      name: string;
    };
  } | null;
}

export interface GetAuditLogsParams {
  startDate?: string;
  endDate?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  keyword?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogsResponse {
  status: string;
  data: {
    logs: AuditLog[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export const getAuditLogs = async (params?: GetAuditLogsParams): Promise<AuditLogsResponse["data"]> => {
  const { data } = await api.get("/audit-logs", { params });
  return data.data;
};

export const getAuditLogById = async (id: string): Promise<AuditLog> => {
  const { data } = await api.get(`/audit-logs/${id}`);
  return data.data.log;
};
