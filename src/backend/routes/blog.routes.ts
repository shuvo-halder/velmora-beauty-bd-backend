import { validateBody, validateParamsUUID, createBlogPostSchema, updateBlogPostSchema } from '../middlewares/validation';
import { Router } from 'express';
import * as Controller from '../controllers/blog.controller';
import { requireAuth, requirePermission } from '../middlewares/auth';

const router = Router();

// Apply auth middleware
router.use(requireAuth);

router.get('/', requirePermission("Blog", "read"), Controller.getAll);
router.get('/:id', requirePermission("Blog", "read"), validateParamsUUID(["id"]), Controller.getById);
router.post('/', requirePermission("Blog", "write"), validateBody(createBlogPostSchema), Controller.create);
router.put('/:id', requirePermission("Blog", "write"), validateParamsUUID(["id"]), validateBody(updateBlogPostSchema), Controller.update);
router.delete('/:id', requirePermission("Blog", "delete"), validateParamsUUID(["id"]), Controller.remove);

export default router;
