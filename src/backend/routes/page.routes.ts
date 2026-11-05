import { validateBody, validateParamsUUID, createPageSchema, updatePageSchema } from '../middlewares/validation';
import { Router } from 'express';
import * as Controller from '../controllers/page.controller';
import { requireAuth, requirePermission } from '../middlewares/auth';

const router = Router();

// Apply auth middleware
router.use(requireAuth);

router.get('/', requirePermission("CMS", "read"), Controller.getAll);
router.get('/:id', requirePermission("CMS", "read"), validateParamsUUID(["id"]), Controller.getById);
router.post('/', requirePermission("CMS", "write"), validateBody(createPageSchema), Controller.create);
router.put('/:id', requirePermission("CMS", "write"), validateParamsUUID(["id"]), validateBody(updatePageSchema), Controller.update);
router.delete('/:id', requirePermission("CMS", "delete"), validateParamsUUID(["id"]), Controller.remove);

export default router;
