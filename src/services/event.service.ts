import { EventStatus, Prisma } from '@prisma/client';
import { eventRepository, EventRepository } from '@/repositories/event.repository';
import { userRepository, UserRepository } from '@/repositories/user.repository';
import { NotFoundError, BadRequestError } from '@/types/common';

export interface CreateEventDTO {
  title: string;
  category: string;
  eventDate: string | Date;
  venueName: string;
  venueLat: number;
  venueLng: number;
  geofenceRadiusMeters?: number;
  status?: EventStatus;
}

export interface AssignCrewDTO {
  userId: string;
  assignedRole: string;
  shiftStart?: string | Date;
  shiftEnd?: string | Date;
  feeAmount?: number;
}

export class EventService {
  constructor(
    private eventRepo: EventRepository = eventRepository,
    private userRepo: UserRepository = userRepository
  ) {}

  async createEvent(organizationId: string, data: CreateEventDTO) {
    if (!data.title || !data.eventDate || !data.venueName) {
      throw new BadRequestError('Title, eventDate, and venueName are required');
    }

    const event = await this.eventRepo.create({
      organizationId,
      title: data.title,
      category: data.category || 'General',
      eventDate: new Date(data.eventDate),
      venueName: data.venueName,
      venueLat: new Prisma.Decimal(data.venueLat),
      venueLng: new Prisma.Decimal(data.venueLng),
      geofenceRadiusMeters: data.geofenceRadiusMeters ?? 100,
      status: data.status ?? EventStatus.DRAFT,
    });

    return event;
  }

  async getEvents(organizationId: string) {
    return this.eventRepo.findAllByOrg(organizationId);
  }

  async getEventById(organizationId: string, eventId: string) {
    const event = await this.eventRepo.findByIdAndOrg(eventId, organizationId);
    if (!event) {
      throw new NotFoundError(`Event with id ${eventId} not found`);
    }
    return event;
  }

  async assignCrewToEvent(organizationId: string, eventId: string, data: AssignCrewDTO) {
    // 1. Verify event belongs to organization
    const event = await this.eventRepo.findByIdAndOrg(eventId, organizationId);
    if (!event) {
      throw new NotFoundError(`Event with id ${eventId} not found`);
    }

    // 2. Verify user belongs to same organization
    const user = await this.userRepo.findByIdAndOrg(data.userId, organizationId);
    if (!user) {
      throw new NotFoundError(`User with id ${data.userId} not found in this organization`);
    }

    const assignedCrew = await this.eventRepo.assignCrew({
      eventId,
      userId: data.userId,
      assignedRole: data.assignedRole,
      shiftStart: data.shiftStart ? new Date(data.shiftStart) : null,
      shiftEnd: data.shiftEnd ? new Date(data.shiftEnd) : null,
      feeAmount: data.feeAmount !== undefined ? new Prisma.Decimal(data.feeAmount) : null,
    });

    return assignedCrew;
  }

  async getEventCrews(organizationId: string, eventId: string) {
    const event = await this.eventRepo.findByIdAndOrg(eventId, organizationId);
    if (!event) {
      throw new NotFoundError(`Event with id ${eventId} not found`);
    }

    return this.eventRepo.findEventCrews(eventId);
  }
}

export const eventService = new EventService();
