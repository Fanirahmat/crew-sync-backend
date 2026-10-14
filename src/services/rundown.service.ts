import { RundownStatus } from '@prisma/client';
import { rundownRepository, RundownRepository } from '@/repositories/rundown.repository';
import { eventRepository, EventRepository } from '@/repositories/event.repository';
import { fcmService, FcmService } from '@/services/fcm.service';
import { NotFoundError, BadRequestError } from '@/types/common';

export interface CreateRundownItemDTO {
  title: string;
  startTime: string | Date;
  endTime: string | Date;
  description?: string;
  locationSection?: string;
  picUserId?: string;
  orderIndex?: number;
  status?: RundownStatus;
}

export interface ReorderItemDTO {
  id: string;
  orderIndex: number;
}

export class RundownService {
  constructor(
    private rundownRepo: RundownRepository = rundownRepository,
    private eventRepo: EventRepository = eventRepository,
    private fcm: FcmService = fcmService
  ) {}

  async addRundownItem(organizationId: string, eventId: string, data: CreateRundownItemDTO) {
    const event = await this.eventRepo.findByIdAndOrg(eventId, organizationId);
    if (!event) {
      throw new NotFoundError(`Event with id ${eventId} not found`);
    }

    let orderIndex = data.orderIndex;
    if (orderIndex === undefined || orderIndex === null) {
      const maxIndex = await this.rundownRepo.getMaxOrderIndex(eventId);
      orderIndex = maxIndex + 1;
    }

    const item = await this.rundownRepo.create({
      eventId,
      orderIndex,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      title: data.title,
      description: data.description,
      locationSection: data.locationSection,
      picUserId: data.picUserId,
      status: data.status ?? RundownStatus.PENDING,
    });

    return item;
  }

  async getRundowns(organizationId: string, eventId: string) {
    const event = await this.eventRepo.findByIdAndOrg(eventId, organizationId);
    if (!event) {
      throw new NotFoundError(`Event with id ${eventId} not found`);
    }

    return this.rundownRepo.findByEventId(eventId);
  }

  async reorderRundown(organizationId: string, eventId: string, items: ReorderItemDTO[]) {
    const event = await this.eventRepo.findByIdAndOrg(eventId, organizationId);
    if (!event) {
      throw new NotFoundError(`Event with id ${eventId} not found`);
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestError('Items array cannot be empty');
    }

    await this.rundownRepo.reorder(items);
    return this.rundownRepo.findByEventId(eventId);
  }

  async updateRundownStatus(
    organizationId: string,
    eventId: string,
    itemId: string,
    status: RundownStatus
  ) {
    const event = await this.eventRepo.findByIdAndOrg(eventId, organizationId);
    if (!event) {
      throw new NotFoundError(`Event with id ${eventId} not found`);
    }

    const existingItem = await this.rundownRepo.findById(itemId);
    if (!existingItem || existingItem.eventId !== eventId) {
      throw new NotFoundError(`Rundown item with id ${itemId} not found in this event`);
    }

    let actualStartedAt: Date | undefined;
    let actualEndedAt: Date | undefined;

    if (status === RundownStatus.ACTIVE) {
      actualStartedAt = new Date();
    } else if (status === RundownStatus.COMPLETED) {
      actualEndedAt = new Date();
    }

    const updatedItem = await this.rundownRepo.updateStatus(
      itemId,
      status,
      actualStartedAt,
      actualEndedAt
    );

    // Phase 4 Requirement: Broadcast FCM topic if status changed to ACTIVE
    if (status === RundownStatus.ACTIVE) {
      await this.fcm.publishRundownCue(eventId, {
        id: updatedItem.id,
        title: updatedItem.title,
        status: updatedItem.status,
        startTime: updatedItem.startTime,
      });
    }

    return updatedItem;
  }
}

export const rundownService = new RundownService();
