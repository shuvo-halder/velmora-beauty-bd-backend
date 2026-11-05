import { api } from "../lib/api";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  icon: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  sortOrder: number;
  parentId: string | null;
  isActive: boolean;
  children?: Category[];
}

export const getCategories = async (asTree: boolean = false): Promise<Category[]> => {
  const { data } = await api.get(`/categories${asTree ? '?asTree=true' : ''}`);
  return data.data;
};

export const getCategoryById = async (id: string): Promise<Category> => {
  const { data } = await api.get(`/categories/${id}`);
  return data.data;
};

export const getCategoryBreadcrumb = async (id: string): Promise<any[]> => {
  const { data } = await api.get(`/categories/${id}/breadcrumb`);
  return data.data;
};

export const createCategory = async (categoryData: Partial<Category>): Promise<Category> => {
  const { data } = await api.post("/categories", categoryData);
  return data.data;
};

export const updateCategory = async (id: string, categoryData: Partial<Category>): Promise<Category> => {
  const { data } = await api.put(`/categories/${id}`, categoryData);
  return data.data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await api.delete(`/categories/${id}`);
};
