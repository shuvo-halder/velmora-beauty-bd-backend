import { api } from "../lib/api";

export interface Variant {
  id: string;
  productId: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  costPrice: number | null;
  barcode: string | null;
  weight: number | null;
  isActive: boolean;
  attributes: any[];
  images: any[];
  inventories: any[];
}

export const getProductVariants = async (productId: string): Promise<Variant[]> => {
  const { data } = await api.get(`/products/${productId}/variants`);
  return data.data;
};

export const getVariantById = async (id: string): Promise<Variant> => {
  const { data } = await api.get(`/variants/${id}`);
  return data.data;
};

export const createProductVariant = async (productId: string, variantData: Partial<Variant>): Promise<Variant> => {
  const { data } = await api.post(`/products/${productId}/variants`, variantData);
  return data.data;
};

export const updateVariant = async (id: string, variantData: Partial<Variant>): Promise<Variant> => {
  const { data } = await api.put(`/variants/${id}`, variantData);
  return data.data;
};

export const deleteVariant = async (id: string): Promise<void> => {
  await api.delete(`/variants/${id}`);
};
