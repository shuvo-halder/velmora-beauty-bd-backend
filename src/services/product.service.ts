import { api } from "../lib/api";

export interface ProductImageItem {
  id: string;
  productId?: string;
  imageUrl?: string;
  url: string;
  publicId?: string | null;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  description: string | null;
  shortDescription: string | null;
  price: number | null;
  categoryId: string;
  brandId: string | null;
  
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  
  trackInventory: boolean;
  status: string;
  isActive: boolean;
  
  barcode: string | null;
  gtin: string | null;
  mpn: string | null;
  condition: string | null;
  
  category?: { id: string; name: string };
  brand?: { id: string; name: string };
  inventory?: { quantity: number; lowStockThreshold: number; quantityAvailable: number };
  images?: ProductImageItem[];
  thumbnail?: string | null;
  gallery?: ProductImageItem[];
  primaryImage?: ProductImageItem | string | null;
  tags?: any[];
  variants?: any[];
}

export const getProducts = async (): Promise<Product[]> => {
  const { data } = await api.get("/products");
  return data.data;
};

export const getProductById = async (id: string): Promise<Product> => {
  const { data } = await api.get(`/products/${id}`);
  return data.data;
};

export const createProduct = async (productData: any): Promise<Product> => {
  const { data } = await api.post("/products", productData);
  return data.data;
};

export const updateProduct = async (id: string, productData: any): Promise<Product> => {
  const { data } = await api.put(`/products/${id}`, productData);
  return data.data;
};

export const deleteProduct = async (id: string): Promise<void> => {
  await api.delete(`/products/${id}`);
};

export const uploadProductImage = async (productId: string, fileOrFormData: File | FormData, extraData?: { altText?: string; isPrimary?: boolean }): Promise<ProductImageItem> => {
  let formData: FormData;
  if (fileOrFormData instanceof FormData) {
    formData = fileOrFormData;
  } else {
    formData = new FormData();
    formData.append("image", fileOrFormData);
    if (extraData?.altText) formData.append("altText", extraData.altText);
    if (extraData?.isPrimary) formData.append("isPrimary", String(extraData.isPrimary));
  }

  const { data } = await api.post(`/products/${productId}/images`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
};

export const deleteProductImage = async (productId: string, imageId: string): Promise<void> => {
  await api.delete(`/products/${productId}/images/${imageId}`);
};

export const reorderProductImages = async (productId: string, imageIds: string[]): Promise<ProductImageItem[]> => {
  const { data } = await api.put(`/products/${productId}/images/reorder`, { imageIds });
  return data.data;
};

export const setPrimaryProductImage = async (productId: string, imageId: string): Promise<ProductImageItem[]> => {
  const { data } = await api.put(`/products/${productId}/images/${imageId}/primary`);
  return data.data;
};

// ==========================================
// Product FAQ Management Services (STEP 2D)
// ==========================================

export interface ProductFaqItem {
  id: string;
  question: string;
  answer: string;
  category: {
    id: string;
    name: string;
  } | null;
  sortOrder: number;
  isActive: boolean;
}

export interface ProductFaqsResponse {
  productId: string;
  faqs: ProductFaqItem[];
}

export const getProductFaqs = async (productId: string): Promise<ProductFaqItem[]> => {
  const { data } = await api.get(`/products/${productId}/faqs`);
  return data.data?.faqs || data.faqs || [];
};

export const assignProductFaq = async (
  productId: string,
  faqId: string,
  sortOrder?: number
): Promise<any> => {
  const { data } = await api.post(`/products/${productId}/faqs`, { faqId, sortOrder });
  return data.data || data;
};

export const reorderProductFaqs = async (
  productId: string,
  faqIds: string[]
): Promise<any> => {
  const { data } = await api.put(`/products/${productId}/faqs/reorder`, { faqIds });
  return data.data || data;
};

export const unlinkProductFaq = async (
  productId: string,
  faqId: string
): Promise<any> => {
  const { data } = await api.delete(`/products/${productId}/faqs/${faqId}`);
  return data.data || data;
};
