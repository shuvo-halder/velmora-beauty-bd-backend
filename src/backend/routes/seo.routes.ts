import { validateBody, updateGlobalSeoSchema } from '../middlewares/validation';
import { Router } from 'express';
import * as Controller from '../controllers/seo.controller';
import { requireAuth, requirePermission } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission("SEO", "read"), Controller.getGlobalSeo);
router.put('/', requirePermission("SEO", "write"), validateBody(updateGlobalSeoSchema), Controller.updateGlobalSeo);

export default router;
