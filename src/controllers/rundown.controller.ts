import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RundownStatus } from '@prisma/client';
import { rundownService, RundownService } from '@/services/rundown.service';
import { sendSuccess } from '@/utils/response.util';
import { UnauthorizedError } from '@/types/common';

export const createRundownItemSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format for startTime',
  }),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format for endTime',
  }),
  description: z.string().optional(),
  locationSection: z.string().optional(),
  picUserId: z.string().uuid('Invalid user UUID for picUserId').optional(),
  orderIndex: z.number().int().optional(),
  status: z.nativeEnum(RundownStatus).optional(),
});

export const reorderRundownSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid('Invalid UUID for item id'),
      orderIndex: z.number().int(),
    })
  ).min(1, 'At least one item must be provided for reordering'),
});

export const updateRundownStatusSchema = z.object({
  status: z.nativeEnum(RundownStatus, {
    errorMap: () => ({ message: 'Status must be PENDING, ACTIVE, COMPLETED, or SKIPPED' }),
  }),
});

export class RundownController {
  constructor(private service: RundownService = rundownService) {}

  addRundownItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.organizationId) {
        throw new UnauthorizedError('Organization context required');
      }

      const item = await this.service.addRundownItem(
        req.user.organizationId,
        req.params.id,
        req.body
      );
      sendSuccess(res, item, 'Rundown item added successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  getRundowns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.organizationId) {
        throw new UnauthorizedError('Organization context required');
      }

      const items = await this.service.getRundowns(req.user.organizationId, req.params.id);
      sendSuccess(res, items, 'Rundown items retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  reorderRundown = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.organizationId) {
        throw new UnauthorizedError('Organization context required');
      }

      const items = await this.service.reorderRundown(
        req.user.organizationId,
        req.params.id,
        req.body.items
      );
      sendSuccess(res, items, 'Rundown items reordered successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  updateRundownStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.organizationId) {
        throw new UnauthorizedError('Organization context required');
      }

      const item = await this.service.updateRundownStatus(
        req.user.organizationId,
        req.params.id,
        req.params.itemId,
        req.body.status
      );
      sendSuccess(res, item, `Rundown status updated to ${req.body.status}`, 200);
    } catch (error) {
      next(error);
    }
  };
}

export const rundownController = new RundownController();
