import { validateBody, validateParamsUUID, createLandingPageSchema, updateLandingPageSchema } from '../middlewares/validation';
import { Router } from 'express';
import * as Controller from '../controllers/landing-page.controller';
import { requireAuth, requirePermission } from '../middlewares/auth';

const router = Router();

// Apply auth middleware
router.use(requireAuth);

router.get('/', requirePermission("LandingPages", "read"), Controller.getAll);
router.get('/:id', requirePermission("LandingPages", "read"), validateParamsUUID(["id"]), Controller.getById);
router.post('/', requirePermission("LandingPages", "write"), validateBody(createLandingPageSchema), Controller.create);
router.put('/:id', requirePermission("LandingPages", "write"), validateParamsUUID(["id"]), validateBody(updateLandingPageSchema), Controller.update);
router.delete('/:id', requirePermission("LandingPages", "delete"), validateParamsUUID(["id"]), Controller.remove);

export default router;
