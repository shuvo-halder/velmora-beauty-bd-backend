import { api } from "../lib/api";

export interface MarketingCampaign {
  id: string;
  name: string;
  type: "Email" | "SMS" | "Push";
  subject?: string;
  content: string;
  status: "Draft" | "Scheduled" | "Sent" | "Archived";
  scheduledAt?: string;
  sentAt?: string;
  parsedMetrics?: {
    openRate: string;
    clickRate: string;
    conversions: number;
    revenueGenerated: string;
  };
}

export const marketingService = {
  getAnalytics: async () => {
    const response = await api.get("/marketing/analytics");
    return response.data;
  },

  getAllCampaigns: async (params?: { status?: string; type?: string }) => {
    const response = await api.get("/marketing/campaigns", { params });
    return response.data;
  },

  getCampaignById: async (id: string) => {
    const response = await api.get(`/marketing/campaigns/${id}`);
    return response.data;
  },

  createCampaign: async (data: Partial<MarketingCampaign>) => {
    const response = await api.post("/marketing/campaigns", data);
    return response.data;
  },

  updateCampaign: async (id: string, data: Partial<MarketingCampaign>) => {
    const response = await api.put(`/marketing/campaigns/${id}`, data);
    return response.data;
  },

  updateStatus: async (id: string, status: string) => {
    const response = await api.patch(`/marketing/campaigns/${id}/status`, { status });
    return response.data;
  },

  deleteCampaign: async (id: string) => {
    const response = await api.delete(`/marketing/campaigns/${id}`);
    return response.data;
  },
};
