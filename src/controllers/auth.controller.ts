import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService, AuthService } from '@/services/auth.service';
import { sendSuccess } from '@/utils/response.util';
import { UnauthorizedError } from '@/types/common';

export const registerSchema = z.object({
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phoneNumber: z.string().min(8, 'Phone number must be at least 8 characters'),
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Identifier is required'),
  password: z.string().min(1, 'Password is required'),
});

export const fcmTokenSchema = z.object({
  fcmToken: z.string().min(5, 'FCM token must be at least 5 characters'),
  platform: z.enum(['android', 'ios', 'web']).default('android'),
});

export class AuthController {
  constructor(private service: AuthService = authService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.register(req.body);
      sendSuccess(res, result, 'Organization and owner registered successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.login(req.body);
      sendSuccess(res, result, 'Login successful', 200);
    } catch (error) {
      next(error);
    }
  };

  registerFcmToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = await this.service.registerFcmToken(req.user.userId, req.body);
      sendSuccess(res, result, 'Device token registered successfully', 200);
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
