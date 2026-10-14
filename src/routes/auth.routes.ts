import { Router } from 'express';
import {
  authController,
  registerSchema,
  loginSchema,
  fcmTokenSchema,
} from '@/controllers/auth.controller';
import { validateRequest } from '@/middlewares/validate.middleware';
import { authenticateJWT } from '@/middlewares/auth.middleware';

const router = Router();

router.post('/register', validateRequest({ body: registerSchema }), authController.register);
router.post('/login', validateRequest({ body: loginSchema }), authController.login);
router.post(
  '/fcm-token',
  authenticateJWT,
  validateRequest({ body: fcmTokenSchema }),
  authController.registerFcmToken
);

export default router;
