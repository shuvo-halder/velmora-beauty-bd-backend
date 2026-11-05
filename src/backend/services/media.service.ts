import path from 'path';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { MediaUsageService } from './media-usage.service';

export interface UploadFileOptions {
  folder?: string;
  altText?: string;
  isPrimary?: boolean;
  sortOrder?: number;
  entityType?: 'product' | 'category' | 'brand' | 'mediaAsset' | 'general';
  entityId?: string;
}

export interface UploadedMediaResult {
  id: string;
  url: string;
  secureUrl: string;
  cloudinaryPublicId: string | null;
  publicId: string | null;
  originalFilename: string;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  folder: string;
  altText?: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export class MediaService {
  /**
   * Validate uploaded file format and size
   */
  static validateFile(file: Express.Multer.File) {
    if (!file) {
      throw new AppError('No file provided for upload', 400, 'BAD_REQUEST');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
      throw new AppError(
        `Invalid file type (${file.mimetype}). Allowed formats: JPG, JPEG, PNG, WEBP, SVG`,
        400,
        'INVALID_FILE_TYPE'
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(
        `File size exceeds 10MB limit (Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`,
        400,
        'FILE_TOO_LARGE'
      );
    }
  }

  /**
   * Strict validation for rich-text editor image files
   * Rejects SVG, executables, scripts, etc.
   */
  static validateRichTextImage(file: Express.Multer.File) {
    if (!file) {
      throw new AppError('No image file provided for upload', 400, 'BAD_REQUEST');
    }

    const ALLOWED_RICH_TEXT_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const ALLOWED_RICH_TEXT_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

    const mime = file.mimetype ? file.mimetype.toLowerCase() : '';
    if (!ALLOWED_RICH_TEXT_MIMES.includes(mime)) {
      throw new AppError(
        `Invalid image format (${file.mimetype || 'unknown'}). Allowed formats: JPG, JPEG, PNG, WEBP, GIF`,
        400,
        'INVALID_FILE_TYPE'
      );
    }

    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ext || !ALLOWED_RICH_TEXT_EXTS.includes(ext)) {
      throw new AppError(
        `Invalid file extension (${ext || 'none'}). Allowed extensions: .jpg, .jpeg, .png, .webp, .gif`,
        400,
        'INVALID_FILE_EXTENSION'
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(
        `File size exceeds 10MB limit (Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`,
        400,
        'FILE_TOO_LARGE'
      );
    }
  }

  /**
   * Upload image specifically for Rich Text Editor
   */
  static async uploadRichTextImage(
    file: Express.Multer.File,
    options: UploadFileOptions = {}
  ): Promise<UploadedMediaResult> {
    this.validateRichTextImage(file);

    let rawFolder = options.folder || 'rich-text';
    let folder = rawFolder.replace(/[^a-zA-Z0-9_\/-]/g, '').replace(/\/+/g, '/');
    if (!folder.startsWith('rich-text')) {
      folder = `rich-text/${folder}`.replace(/\/+/g, '/');
    }

    return this.uploadSingle(file, {
      ...options,
      folder,
      altText: options.altText || file.originalname,
      entityType: 'mediaAsset',
    });
  }

  /**
   * Upload buffer or base64 to Cloudinary or fallback storage
   */
  static async uploadToStorage(
    file: Express.Multer.File,
    folder: string = 'media'
  ): Promise<{
    secureUrl: string;
    publicId: string;
    width?: number;
    height?: number;
  }> {
    this.validateFile(file);

    if (isCloudinaryConfigured()) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'image',
          },
          (error, result) => {
            if (error || !result) {
              return reject(new AppError(`Cloudinary Upload Error: ${error?.message || 'Unknown error'}`, 500, 'CLOUDINARY_ERROR'));
            }
            resolve({
              secureUrl: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height,
            });
          }
        );
        uploadStream.end(file.buffer);
      });
    }

    // Fallback data URI storage if Cloudinary API keys are not provided
    const base64Data = file.buffer.toString('base64');
    const dataUri = `data:${file.mimetype};base64,${base64Data}`;
    const generatedPublicId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    return {
      secureUrl: dataUri,
      publicId: generatedPublicId,
      width: 800,
      height: 600,
    };
  }

  /**
   * Single file upload
   */
  static async uploadSingle(
    file: Express.Multer.File,
    options: UploadFileOptions = {}
  ): Promise<UploadedMediaResult> {
    this.validateFile(file);

    const folder = options.folder || 'media';
    const uploadRes = await this.uploadToStorage(file, folder);

    let mediaAsset: any = null;
    try {
      mediaAsset = await prisma.mediaAsset.create({
        data: {
          filename: `${Date.now()}_${file.originalname}`,
          originalName: file.originalname,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url: uploadRes.secureUrl,
          secureUrl: uploadRes.secureUrl,
          publicId: uploadRes.publicId,
          cloudinaryPublicId: uploadRes.publicId,
          width: uploadRes.width || null,
          height: uploadRes.height || null,
          folder,
          altText: options.altText || file.originalname,
          isPrimary: options.isPrimary ?? false,
          sortOrder: options.sortOrder ?? 0,
        },
      });

      if (options.entityType && options.entityId && mediaAsset) {
        if (options.entityType === 'product') {
          await prisma.productImage.create({
            data: {
              productId: options.entityId,
              imageUrl: uploadRes.secureUrl,
              url: uploadRes.secureUrl,
              secureUrl: uploadRes.secureUrl,
              publicId: uploadRes.publicId,
              cloudinaryPublicId: uploadRes.publicId,
              originalFilename: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              width: uploadRes.width,
              height: uploadRes.height,
              folder,
              altText: options.altText || file.originalname,
              isPrimary: options.isPrimary ?? false,
              sortOrder: options.sortOrder ?? 0,
            },
          });
        } else if (options.entityType === 'category') {
          await prisma.categoryImage.create({
            data: {
              categoryId: options.entityId,
              secureUrl: uploadRes.secureUrl,
              cloudinaryPublicId: uploadRes.publicId,
              originalFilename: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              width: uploadRes.width,
              height: uploadRes.height,
              folder,
              altText: options.altText || file.originalname,
              isPrimary: options.isPrimary ?? false,
              sortOrder: options.sortOrder ?? 0,
            },
          });
        } else if (options.entityType === 'brand') {
          await prisma.brandImage.create({
            data: {
              brandId: options.entityId,
              secureUrl: uploadRes.secureUrl,
              cloudinaryPublicId: uploadRes.publicId,
              originalFilename: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              width: uploadRes.width,
              height: uploadRes.height,
              folder,
              altText: options.altText || file.originalname,
              isPrimary: options.isPrimary ?? false,
              sortOrder: options.sortOrder ?? 0,
            },
          });
        }
      }
    } catch (dbErr: any) {
      console.error(`[MediaService] Database record creation failed:`, dbErr.message);
      
      // Attempt to clean up orphaned Cloudinary asset
      // Limitation: True distributed rollback is impossible. If this cleanup request fails, 
      // or the process crashes here, the Cloudinary asset will remain orphaned.
      if (uploadRes.publicId && !uploadRes.publicId.startsWith('local_') && isCloudinaryConfigured()) {
        try {
          await cloudinary.uploader.destroy(uploadRes.publicId);
          console.log(`[MediaService] Successfully cleaned up orphaned Cloudinary asset: ${uploadRes.publicId}`);
        } catch (cleanupErr: any) {
          console.error(`[MediaService] FAILED to clean up orphaned Cloudinary asset ${uploadRes.publicId}:`, cleanupErr.message);
        }
      }
      
      throw new AppError(`Failed to save media record to database. ${dbErr.message}`, 500, 'DATABASE_ERROR');
    }

    return {
      id: mediaAsset?.id || `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      url: mediaAsset?.url || uploadRes.secureUrl,
      secureUrl: mediaAsset?.secureUrl || uploadRes.secureUrl,
      cloudinaryPublicId: mediaAsset?.cloudinaryPublicId || uploadRes.publicId,
      publicId: mediaAsset?.publicId || uploadRes.publicId,
      originalFilename: mediaAsset?.originalFilename || file.originalname,
      mimeType: mediaAsset?.mimeType || file.mimetype,
      size: mediaAsset?.size || file.size,
      width: mediaAsset?.width ?? uploadRes.width ?? null,
      height: mediaAsset?.height ?? uploadRes.height ?? null,
      folder: mediaAsset?.folder || folder,
      altText: mediaAsset?.altText || options.altText || file.originalname,
      isPrimary: mediaAsset?.isPrimary ?? options.isPrimary ?? false,
      sortOrder: mediaAsset?.sortOrder ?? options.sortOrder ?? 0,
    };
  }

  /**
   * Multiple files upload
   */
  static async uploadMultiple(
    files: Express.Multer.File[],
    options: UploadFileOptions = {}
  ): Promise<UploadedMediaResult[]> {
    if (!files || files.length === 0) {
      throw new AppError('No files uploaded', 400, 'BAD_REQUEST');
    }

    const results: UploadedMediaResult[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isPrimary = options.isPrimary && i === 0;
      const sortOrder = (options.sortOrder || 0) + i;

      const uploaded = await this.uploadSingle(file, {
        ...options,
        isPrimary,
        sortOrder,
      });
      results.push(uploaded);
    }

    return results;
  }

  /**
   * Delete asset by Cloudinary Public ID or MediaAsset ID
   */
  static async deleteAsset(assetOrPublicId: string): Promise<boolean> {
    const asset = await prisma.mediaAsset.findFirst({
      where: {
        OR: [
          { id: assetOrPublicId },
          { publicId: assetOrPublicId },
          { cloudinaryPublicId: assetOrPublicId },
        ],
      },
    });

    // 1. Safe Media Usage Detection: Check if asset is referenced anywhere across DB
    const usage = await MediaUsageService.checkAssetUsage(assetOrPublicId, asset || undefined);
    if (usage.used) {
      throw new AppError(
        'This media asset is currently in use and cannot be deleted.',
        400,
        'MEDIA_ASSET_IN_USE',
        true,
        usage
      );
    }

    const publicId = asset?.cloudinaryPublicId || asset?.publicId || assetOrPublicId;

    // 2. Destroy Cloudinary file ONLY AFTER confirming asset is completely unused
    if (publicId && !publicId.startsWith('local_') && isCloudinaryConfigured()) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error(`Cloudinary deletion error for ${publicId}:`, err);
      }
    }

    if (asset) {
      await prisma.mediaAsset.delete({ where: { id: asset.id } });
    }

    // Attempt to delete related entities if publicId matches
    if (publicId) {
      try {
        await prisma.productImage.deleteMany({
          where: {
            OR: [
              { publicId },
              { cloudinaryPublicId: publicId },
            ]
          }
        });
        await prisma.categoryImage.deleteMany({
          where: { cloudinaryPublicId: publicId }
        });
        await prisma.brandImage.deleteMany({
          where: { cloudinaryPublicId: publicId }
        });
      } catch (e) {
        console.error('Error cascading delete to entity images:', e);
      }
    }

    return true;
  }

  /**
   * Batch delete multiple media assets safely
   */
  static async batchDeleteAssets(ids: string[]): Promise<{
    deletedCount: number;
    deletedIds: string[];
    blockedCount: number;
    blocked: Array<{ id: string; reason: string; usage: any }>;
  }> {
    const deletedIds: string[] = [];
    const blocked: Array<{ id: string; reason: string; usage: any }> = [];

    for (const id of ids) {
      const usage = await MediaUsageService.checkAssetUsage(id);
      if (usage.used) {
        blocked.push({
          id,
          reason: 'This media asset is currently in use and cannot be deleted.',
          usage,
        });
        continue;
      }

      try {
        await this.deleteAsset(id);
        deletedIds.push(id);
      } catch (err: any) {
        if (err?.code === 'MEDIA_ASSET_IN_USE') {
          blocked.push({
            id,
            reason: err.message,
            usage: err.details,
          });
        } else {
          throw err;
        }
      }
    }

    return {
      deletedCount: deletedIds.length,
      deletedIds,
      blockedCount: blocked.length,
      blocked,
    };
  }

  /**
   * Replace existing asset with new file
   */
  static async replaceAsset(
    assetId: string,
    file: Express.Multer.File,
    options: UploadFileOptions = {}
  ): Promise<UploadedMediaResult> {
    await this.deleteAsset(assetId);
    return this.uploadSingle(file, options);
  }

  /**
   * List all media assets in library
   */
  static async listAssets(folder?: string, search?: string) {
    const where: any = {};
    if (folder && folder !== 'all' && folder !== 'root') {
      where.folder = folder;
    }
    if (search) {
      where.OR = [
        { filename: { contains: search, mode: 'insensitive' } },
        { originalFilename: { contains: search, mode: 'insensitive' } },
        { altText: { contains: search, mode: 'insensitive' } },
      ];
    }

    return prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}
