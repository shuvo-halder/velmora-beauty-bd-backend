import { api } from "../lib/api";

export const getReviewStats = async () => {
  const { data } = await api.get("/reviews/stats");
  return data.data;
};

export const getReviews = async (params?: any) => {
  const { data } = await api.get("/reviews", { params });
  return data.data; // { reviews: [...], pagination: {...} }
};

export const getReviewById = async (id: string) => {
  const { data } = await api.get(`/reviews/${id}`);
  return data.data;
};

export const updateReviewStatus = async (id: string, status: "APPROVED" | "REJECTED" | "HIDDEN") => {
  const { data } = await api.put(`/reviews/${id}/status`, { status });
  return data.data;
};

export const deleteReview = async (id: string) => {
  const { data } = await api.delete(`/reviews/${id}`);
  return data.data;
};

export const updateAdminResponse = async (id: string, response: string) => {
  const { data } = await api.put(`/reviews/${id}/response`, { response });
  return data.data;
};
