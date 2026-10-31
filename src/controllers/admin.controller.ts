import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { adminService, AdminService } from '@/services/admin.service';
import { sendSuccess } from '@/utils/response.util';

export const updateSubscriptionSchema = z.object({
  subscriptionTier: z.string().min(2, 'Subscription tier is required'),
});

export class AdminController {
  constructor(private service: AdminService = adminService) {}

  getStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getPlatformStats();
      sendSuccess(res, result, 'Platform overview statistics retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  listOrganizations = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listOrganizations();
      sendSuccess(res, result, 'Platform client organizations retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  getOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getOrganizationDetails(req.params.id);
      sendSuccess(res, result, 'Organization details retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  updateSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { subscriptionTier } = req.body;
      const result = await this.service.updateSubscription(req.params.id, subscriptionTier);
      sendSuccess(res, result, 'Organization subscription tier updated successfully', 200);
    } catch (error) {
      next(error);
    }
  };
}

export const adminController = new AdminController();
