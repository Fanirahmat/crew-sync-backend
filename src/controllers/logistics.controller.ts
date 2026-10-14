import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LogisticsStage, ItemCondition } from '@prisma/client';
import { logisticsService, LogisticsService } from '@/services/logistics.service';
import { sendSuccess } from '@/utils/response.util';
import { BadRequestError, UnauthorizedError } from '@/types/common';

export const createChecklistSchema = z.object({
  name: z.string().min(2, 'Checklist name must be at least 2 characters'),
  stage: z.nativeEnum(LogisticsStage).default(LogisticsStage.LOAD_IN),
  items: z
    .array(
      z.object({
        itemName: z.string().min(1, 'Item name is required'),
        quantityExpected: z.number().int().positive('Quantity expected must be positive'),
      })
    )
    .optional(),
});

export const addChecklistItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  quantityExpected: z.number().int().positive('Quantity expected must be positive'),
});

export class LogisticsController {
  constructor(private service: LogisticsService = logisticsService) {}

  createChecklist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.organizationId) {
        throw new UnauthorizedError('Organization context required');
      }

      const checklist = await this.service.createChecklist(
        req.user.organizationId,
        req.params.id,
        req.body
      );
      sendSuccess(res, checklist, 'Logistics checklist created successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  getEventChecklists = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.organizationId) {
        throw new UnauthorizedError('Organization context required');
      }

      const checklists = await this.service.getEventChecklists(
        req.user.organizationId,
        req.params.id
      );
      sendSuccess(res, checklists, 'Logistics checklists retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  addItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.organizationId) {
        throw new UnauthorizedError('Organization context required');
      }

      const item = await this.service.addItemToChecklist(
        req.user.organizationId,
        req.params.id,
        req.params.checklistId,
        req.body
      );
      sendSuccess(res, item, 'Item added to checklist successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  verifyItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.userId || !req.user?.organizationId) {
        throw new UnauthorizedError('User and organization context required');
      }

      const body = req.body;
      const quantityActualRaw = body.quantityActual ?? body.quantity_actual;
      const condition = body.condition;
      const notes = body.notes;

      if (quantityActualRaw === undefined || isNaN(parseInt(quantityActualRaw, 10))) {
        throw new BadRequestError('quantityActual must be a valid integer');
      }

      if (!condition || !['GOOD', 'DAMAGED', 'MISSING'].includes(condition)) {
        throw new BadRequestError('Valid condition is required (GOOD, DAMAGED, or MISSING)');
      }

      const item = await this.service.verifyChecklistItem(
        req.user.organizationId,
        req.user.userId,
        req.params.itemId,
        {
          quantityActual: parseInt(quantityActualRaw, 10),
          condition: condition as ItemCondition,
          notes,
        },
        req.file
      );

      sendSuccess(res, item, 'Item condition verified successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  deleteChecklist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.organizationId) {
        throw new UnauthorizedError('Organization context required');
      }

      await this.service.deleteChecklist(req.user.organizationId, req.params.checklistId);
      sendSuccess(res, null, 'Checklist deleted successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  deleteItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.organizationId) {
        throw new UnauthorizedError('Organization context required');
      }

      await this.service.deleteItem(req.user.organizationId, req.params.itemId);
      sendSuccess(res, null, 'Item deleted successfully', 200);
    } catch (error) {
      next(error);
    }
  };
}

export const logisticsController = new LogisticsController();
