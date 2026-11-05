import { api } from "../lib/api";

export interface MediaAssetItem {
  id: string;
  filename: string;
  originalName?: string;
  originalFilename?: string;
  mimeType: string;
  size: number;
  url: string;
  secureUrl?: string;
  publicId?: string;
  cloudinaryPublicId?: string;
  width?: number;
  height?: number;
  folder?: string;
  altText?: string;
  isPrimary?: boolean;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaUsageReference {
  type: string;
  entityId: string;
  entityName: string;
  field: string;
  reference: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface MediaUsageResult {
  used: boolean;
  referenceCount: number;
  references: MediaUsageReference[];
}

export const mediaService = {
  getAssets: async (params?: { folder?: string; search?: string }): Promise<MediaAssetItem[]> => {
    const res = await api.get('/media', { params });
    return res.data?.data || res.data || [];
  },

  getAssetById: async (id: string): Promise<MediaAssetItem> => {
    const res = await api.get(`/media/${id}`);
    return res.data?.data || res.data;
  },

  getAssetUsage: async (id: string): Promise<MediaUsageResult> => {
    const res = await api.get(`/media/${id}/usage`);
    return res.data?.data || res.data;
  },

  batchDeleteAssets: async (ids: string[]): Promise<{
    deletedCount: number;
    deletedIds: string[];
    blockedCount: number;
    blocked: Array<{ id: string; reason: string; usage: MediaUsageResult }>;
  }> => {
    const res = await api.post('/media/batch-delete', { ids });
    return res.data?.data || res.data;
  },

  uploadAsset: async (file: File | FormData, folder: string = 'media'): Promise<MediaAssetItem> => {
    let formData: FormData;
    if (file instanceof FormData) {
      formData = file;
    } else {
      formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
    }
    const res = await api.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data?.data || res.data;
  },

  uploadMultiple: async (files: File[], folder: string = 'media'): Promise<MediaAssetItem[]> => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    formData.append('folder', folder);

    const res = await api.post('/media/upload-multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data?.data || res.data;
  },

  updateAsset: async (id: string, data: Partial<MediaAssetItem>): Promise<MediaAssetItem> => {
    const res = await api.put(`/media/${id}`, data);
    return res.data?.data || res.data;
  },

  deleteAsset: async (id: string): Promise<any> => {
    const res = await api.delete(`/media/${id}`);
    return res.data;
  },
};
