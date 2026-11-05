import { api } from "../lib/api";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  website: string | null;
  description: string | null;
  isActive: boolean;
}

export const getBrands = async (): Promise<Brand[]> => {
  const { data } = await api.get("/brands");
  return data.data;
};

export const getBrandById = async (id: string): Promise<Brand> => {
  const { data } = await api.get(`/brands/${id}`);
  return data.data;
};

export const createBrand = async (brandData: Partial<Brand>): Promise<Brand> => {
  const { data } = await api.post("/brands", brandData);
  return data.data;
};

export const updateBrand = async (id: string, brandData: Partial<Brand>): Promise<Brand> => {
  const { data } = await api.put(`/brands/${id}`, brandData);
  return data.data;
};

export const deleteBrand = async (id: string): Promise<void> => {
  await api.delete(`/brands/${id}`);
};
