import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { EventStatus } from '@prisma/client';
import { eventService, EventService } from '@/services/event.service';
import { sendSuccess } from '@/utils/response.util';
import { UnauthorizedError } from '@/types/common';

export const createEventSchema = z.object({
  title: z.string().min(3, 'Event title must be at least 3 characters'),
  category: z.string().default('Wedding'),
  eventDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format for eventDate',
  }),
  venueName: z.string().min(2, 'Venue name is required'),
  venueLat: z.number({ required_error: 'venueLat is required' }),
  venueLng: z.number({ required_error: 'venueLng is required' }),
  geofenceRadiusMeters: z.number().positive().default(100),
  status: z.nativeEnum(EventStatus).default(EventStatus.DRAFT),
});

export const assignCrewSchema = z.object({
  userId: z.string().uuid('Invalid user UUID'),
  assignedRole: z.string().min(2, 'Assigned role is required'),
  shiftStart: z.string().optional(),
  shiftEnd: z.string().optional(),
  feeAmount: z.number().nonnegative().optional(),
});

export class EventController {
  constructor(private service: EventService = eventService) {}

  createEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.organizationId) {
        throw new UnauthorizedError('Organization context required');
      }

      const event = await this.service.createEvent(req.user.organizationId, req.body);
      sendSuccess(res, event, 'Event created successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  getEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.organizationId) {
        throw new UnauthorizedError('Organization context required');
      }

      const events = await this.service.getEvents(req.user.organizationId);
      sendSuccess(res, events, 'Events retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  getEventById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.organizationId) {
        throw new UnauthorizedError('Organization context required');
      }

      const event = await this.service.getEventById(req.user.organizationId, req.params.id);
      sendSuccess(res, event, 'Event details retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  assignCrew = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.organizationId) {
        throw new UnauthorizedError('Organization context required');
      }

      const assignedCrew = await this.service.assignCrewToEvent(
        req.user.organizationId,
        req.params.id,
        req.body
      );
      sendSuccess(res, assignedCrew, 'Crew assigned to event successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  getEventCrews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.organizationId) {
        throw new UnauthorizedError('Organization context required');
      }

      const crews = await this.service.getEventCrews(req.user.organizationId, req.params.id);
      sendSuccess(res, crews, 'Event crews retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  };
}

export const eventController = new EventController();
