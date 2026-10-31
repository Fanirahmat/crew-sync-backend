import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  userController,
  updateProfileSchema,
  changePasswordSchema,
  createOrgUserSchema,
  updateOrgUserSchema,
} from '@/controllers/user.controller';
import { validateRequest } from '@/middlewares/validate.middleware';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { upload } from '@/config/storage';

const router = Router();

// Apply authentication to all user routes
router.use(authenticateJWT);

// --- User Profile & Account Settings (Self) ---
router.get('/profile', userController.getProfile);
router.put('/profile', validateRequest({ body: updateProfileSchema }), userController.updateProfile);
router.post('/avatar', upload.single('avatar'), userController.uploadAvatar);
router.put(
  '/change-password',
  validateRequest({ body: changePasswordSchema }),
  userController.changePassword
);

// --- Organization Users Management (Crew/Staff) ---
router.get(
  '/',
  requireRole([Role.OWNER, Role.PLANNER, Role.COORDINATOR]),
  userController.listOrgUsers
);

router.post(
  '/',
  requireRole([Role.OWNER, Role.PLANNER]),
  validateRequest({ body: createOrgUserSchema }),
  userController.createOrgUser
);

router.get(
  '/:id',
  requireRole([Role.OWNER, Role.PLANNER, Role.COORDINATOR]),
  userController.getOrgUser
);

router.patch(
  '/:id',
  requireRole([Role.OWNER, Role.PLANNER]),
  validateRequest({ body: updateOrgUserSchema }),
  userController.updateOrgUser
);

router.delete(
  '/:id',
  requireRole([Role.OWNER]),
  userController.deleteOrgUser
);

export default router;
