import { Request, Response, NextFunction } from 'express';
import { MediaService } from '../services/media.service';
import { MediaUsageService } from '../services/media-usage.service';
import { ProductMediaService } from '../services/product-media.service';
import { AppError } from '../utils/AppError';

export class MediaController {
  /**
   * Upload single image
   */
  static async uploadSingle(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError('No file provided in request', 400, 'BAD_REQUEST');
      }

      const folder = (req.body.folder as string) || 'media';
      const altText = (req.body.altText as string) || req.file.originalname;
      const isPrimary = req.body.isPrimary === 'true' || req.body.isPrimary === true;

      const result = await MediaService.uploadSingle(req.file, {
        folder,
        altText,
        isPrimary,
      });

      res.status(201).json({
        status: 'success',
        message: 'File uploaded successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload multiple images
   */
  static async uploadMultiple(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        throw new AppError('No files provided in request', 400, 'BAD_REQUEST');
      }

      const folder = (req.body.folder as string) || 'media';

      const results = await MediaService.uploadMultiple(files, { folder });

      res.status(201).json({
        status: 'success',
        message: `${results.length} files uploaded successfully`,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Safe usage inspection for a media asset across all entities
   */
  static async getAssetUsage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const usage = await MediaUsageService.checkAssetUsage(id);

      res.status(200).json({
        status: 'success',
        data: usage,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete asset
   */
  static async deleteAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await MediaService.deleteAsset(id);

      res.status(200).json({
        status: 'success',
        message: 'Media asset deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Batch delete multiple media assets safely
   */
  static async batchDeleteAssets(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new AppError('Array of asset IDs is required', 400, 'BAD_REQUEST');
      }

      const result = await MediaService.batchDeleteAssets(ids);

      res.status(200).json({
        status: 'success',
        message: `${result.deletedCount} asset(s) deleted. ${result.blockedCount} asset(s) blocked due to active usage.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Replace asset
   */
  static async replaceAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!req.file) {
        throw new AppError('Replacement file is required', 400, 'BAD_REQUEST');
      }

      const result = await MediaService.replaceAsset(id, req.file, {
        folder: req.body.folder || 'media',
      });

      res.status(200).json({
        status: 'success',
        message: 'Asset replaced successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List media library assets
   */
  static async listAssets(req: Request, res: Response, next: NextFunction) {
    try {
      const folder = req.query.folder as string;
      const search = req.query.search as string;

      const assets = await MediaService.listAssets(folder, search);

      res.status(200).json({
        status: 'success',
        data: assets,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Product media: Set Primary Image
   */
  static async setPrimaryProductImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, imageId } = req.params;
      const primaryImage = await ProductMediaService.setPrimaryImage(productId, imageId);

      res.status(200).json({
        status: 'success',
        message: 'Primary image updated',
        data: primaryImage,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Product media: Reorder Gallery Images
   */
  static async reorderGalleryImages(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId } = req.params;
      const { imageIds } = req.body;

      if (!Array.isArray(imageIds)) {
        throw new AppError('imageIds must be an array of image IDs', 400, 'BAD_REQUEST');
      }

      const reordered = await ProductMediaService.reorderImages(productId, imageIds);

      res.status(200).json({
        status: 'success',
        message: 'Gallery reordered successfully',
        data: reordered,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload image specifically for Rich Text Editor content
   */
  static async uploadRichTextImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError('No image file provided in request', 400, 'BAD_REQUEST');
      }

      const folder = (req.body?.folder as string) || 'rich-text';
      const altText = (req.body?.altText as string) || req.file.originalname;

      const result = await MediaService.uploadRichTextImage(req.file, {
        folder,
        altText,
      });

      res.status(201).json({
        success: true,
        status: 'success',
        message: 'Rich text image uploaded successfully',
        url: result.secureUrl || result.url,
        secureUrl: result.secureUrl || result.url,
        publicId: result.publicId || result.cloudinaryPublicId,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
