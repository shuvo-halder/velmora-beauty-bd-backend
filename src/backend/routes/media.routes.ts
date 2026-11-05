import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { MediaController } from '../controllers/media.controller';
import { requireAuth, requirePermission } from '../middlewares/auth';
import { AppError } from '../utils/AppError';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error(`Disallowed file type (${file.mimetype}). Allowed types: JPG, PNG, WEBP, SVG`));
    }
  },
});

export const richTextUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname || '').toLowerCase();

    if (allowedMimeTypes.includes((file.mimetype || '').toLowerCase()) && allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new AppError(`Invalid file type (${file.mimetype}). Allowed rich text image types: JPG, PNG, WEBP, GIF`, 400, 'INVALID_FILE_TYPE'));
    }
  },
});

export const richTextUploadMiddleware = (req: any, res: any, next: any) => {
  richTextUpload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ])(req, res, (err: any) => {
    if (err) return next(err);
    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      req.file = files['file']?.[0] || files['image']?.[0];
    }
    next();
  });
};

// Protect all media endpoints with authentication
router.use(requireAuth);

// GET /api/v1/media - List all assets (Media.Read)
router.get('/', requirePermission('Media', 'Read'), MediaController.listAssets);

// POST /api/v1/media/upload - Single file upload (Media.Write)
router.post('/upload', requirePermission('Media', 'Write'), upload.single('file'), MediaController.uploadSingle);

// POST /api/v1/media/rich-text-image - Upload image for Rich Text Editor (Media.Write)
router.post(
  '/rich-text-image',
  requirePermission('Media', 'Write'),
  richTextUploadMiddleware,
  MediaController.uploadRichTextImage
);

// POST /api/v1/media/upload-multiple - Multiple files upload (Media.Write)
router.post('/upload-multiple', requirePermission('Media', 'Write'), upload.array('files', 10), MediaController.uploadMultiple);

// GET /api/v1/media/:id/usage - Check asset usage (Media.Read)
router.get('/:id/usage', requirePermission('Media', 'Read'), MediaController.getAssetUsage);

// POST /api/v1/media/batch-delete - Batch delete assets safely (Media.Delete)
router.post('/batch-delete', requirePermission('Media', 'Delete'), MediaController.batchDeleteAssets);

// PUT /api/v1/media/:id - Replace asset (Media.Write)
router.put('/:id', requirePermission('Media', 'Write'), upload.single('file'), MediaController.replaceAsset);

// DELETE /api/v1/media/:id - Delete asset (Media.Delete)
router.delete('/:id', requirePermission('Media', 'Delete'), MediaController.deleteAsset);

// Product-specific gallery management endpoints
router.put('/products/:productId/primary/:imageId', requirePermission('Media', 'Write'), MediaController.setPrimaryProductImage);
router.put('/products/:productId/reorder', requirePermission('Media', 'Write'), MediaController.reorderGalleryImages);

export default router;
