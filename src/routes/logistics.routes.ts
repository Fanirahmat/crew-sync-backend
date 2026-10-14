import { Router } from 'express';
import { logisticsController } from '@/controllers/logistics.controller';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requireTenant } from '@/middlewares/tenant.middleware';
import { upload } from '@/config/storage';

const router = Router();

router.use(authenticateJWT);
router.use(requireTenant);

// Verification endpoint for physical condition: PATCH /api/v1/checklists/items/:itemId/verify
router.patch(
  '/items/:itemId/verify',
  upload.single('proofImage'),
  logisticsController.verifyItem
);

// Delete item
router.delete('/items/:itemId', logisticsController.deleteItem);

// Delete checklist
router.delete('/:checklistId', logisticsController.deleteChecklist);

export default router;
