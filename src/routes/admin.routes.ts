import { Router } from 'express';
import { Role } from '@prisma/client';
import { adminController, updateSubscriptionSchema } from '@/controllers/admin.controller';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { validateRequest } from '@/middlewares/validate.middleware';

const router = Router();

// Only SUPERADMIN can access platform administration routes
router.use(authenticateJWT, requireRole([Role.SUPERADMIN]));

router.get('/stats', adminController.getStats);
router.get('/organizations', adminController.listOrganizations);
router.get('/organizations/:id', adminController.getOrganization);
router.patch(
  '/organizations/:id/subscription',
  validateRequest({ body: updateSubscriptionSchema }),
  adminController.updateSubscription
);

export default router;
