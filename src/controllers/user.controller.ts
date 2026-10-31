import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { userService, UserService } from '@/services/user.service';
import { sendSuccess } from '@/utils/response.util';
import { UnauthorizedError, BadRequestError } from '@/types/common';

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phoneNumber: z.string().min(8, 'Phone number must be at least 8 characters').optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const createOrgUserSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phoneNumber: z.string().min(8, 'Phone number must be at least 8 characters'),
  email: z.string().email('Invalid email address').optional(),
  role: z.enum([Role.CREW, Role.COORDINATOR, Role.PLANNER]).default(Role.CREW),
  password: z.string().min(6, 'Initial password must be at least 6 characters').optional(),
});

export const updateOrgUserSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  role: z.enum([Role.CREW, Role.COORDINATOR, Role.PLANNER]).optional(),
  phoneNumber: z.string().min(8, 'Phone number must be at least 8 characters').optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
});

export class UserController {
  constructor(private service: UserService = userService) {}

  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = await this.service.getProfile(req.user.userId);
      sendSuccess(res, result, 'User profile fetched successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = await this.service.updateProfile(req.user.userId, req.body);
      sendSuccess(res, result, 'Profile updated successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  uploadAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!req.file) {
        throw new BadRequestError('No image file uploaded');
      }

      const avatarUrl = `/uploads/${req.file.filename}`;
      const result = await this.service.updateProfile(req.user.userId, { avatarUrl });

      sendSuccess(res, result, 'Avatar uploaded and profile updated successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.userId) {
        throw new UnauthorizedError('Authentication required');
      }

      const { currentPassword, newPassword } = req.body;
      const result = await this.service.changePassword(req.user.userId, currentPassword, newPassword);
      sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  };

  listOrgUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.organizationId) {
        throw new UnauthorizedError('Organization context required');
      }

      const result = await this.service.listOrgUsers(req.user.organizationId);
      sendSuccess(res, result, 'Organization users retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  createOrgUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.organizationId) {
        throw new UnauthorizedError('Organization context required');
      }

      const result = await this.service.createOrgUser(req.user.organizationId, req.body);
      sendSuccess(res, result, 'User created and added to organization successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  getOrgUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.organizationId) {
        throw new UnauthorizedError('Organization context required');
      }

      const result = await this.service.getOrgUser(req.user.organizationId, req.params.id);
      sendSuccess(res, result, 'User details retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  updateOrgUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.organizationId) {
        throw new UnauthorizedError('Organization context required');
      }

      const result = await this.service.updateOrgUser(
        req.user.organizationId,
        req.params.id,
        req.body
      );
      sendSuccess(res, result, 'User updated successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  deleteOrgUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.organizationId || !req.user?.userId) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = await this.service.deleteOrgUser(
        req.user.organizationId,
        req.params.id,
        req.user.userId
      );
      sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  };
}

export const userController = new UserController();
