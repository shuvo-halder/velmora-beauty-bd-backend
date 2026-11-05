import { validateBody, validateParamsUUID, createFAQSchema, updateFAQSchema } from '../middlewares/validation';
import { Router } from 'express';
import * as Controller from '../controllers/faq.controller';
import { requireAuth, requirePermission } from '../middlewares/auth';

const router = Router();

// Apply auth middleware
router.use(requireAuth);

router.get('/', requirePermission("FAQ", "read"), Controller.getAll);
router.get('/categories', requirePermission("FAQ", "read"), Controller.getCategories);
router.post('/categories', requirePermission("FAQ", "write"), Controller.createCategory);
router.delete('/categories/:id', requirePermission("FAQ", "delete"), validateParamsUUID(["id"]), Controller.deleteCategory);

router.get('/:id', requirePermission("FAQ", "read"), validateParamsUUID(["id"]), Controller.getById);
router.post('/', requirePermission("FAQ", "write"), validateBody(createFAQSchema), Controller.create);
router.put('/:id', requirePermission("FAQ", "write"), validateParamsUUID(["id"]), validateBody(updateFAQSchema), Controller.update);
router.delete('/:id', requirePermission("FAQ", "delete"), validateParamsUUID(["id"]), Controller.remove);

export default router;
