import { LogisticsStage, ItemCondition } from '@prisma/client';
import { logisticsRepository, LogisticsRepository } from '@/repositories/logistics.repository';
import { eventRepository, EventRepository } from '@/repositories/event.repository';
import { NotFoundError, BadRequestError } from '@/types/common';

export interface CreateChecklistDTO {
  name: string;
  stage?: LogisticsStage;
  items?: { itemName: string; quantityExpected: number }[];
}

export interface AddItemDTO {
  itemName: string;
  quantityExpected: number;
}

export interface VerifyItemDTO {
  quantityActual: number;
  condition: ItemCondition;
  notes?: string;
}

export class LogisticsService {
  constructor(
    private logisticsRepo: LogisticsRepository = logisticsRepository,
    private eventRepo: EventRepository = eventRepository
  ) {}

  async createChecklist(organizationId: string, eventId: string, data: CreateChecklistDTO) {
    const event = await this.eventRepo.findByIdAndOrg(eventId, organizationId);
    if (!event) {
      throw new NotFoundError(`Event with id ${eventId} not found`);
    }

    if (!data.name) {
      throw new BadRequestError('Checklist name is required');
    }

    return this.logisticsRepo.createChecklist(
      eventId,
      data.name,
      data.stage ?? LogisticsStage.LOAD_IN,
      data.items
    );
  }

  async getEventChecklists(organizationId: string, eventId: string) {
    const event = await this.eventRepo.findByIdAndOrg(eventId, organizationId);
    if (!event) {
      throw new NotFoundError(`Event with id ${eventId} not found`);
    }

    return this.logisticsRepo.findChecklistsByEvent(eventId);
  }

  async addItemToChecklist(
    organizationId: string,
    eventId: string,
    checklistId: string,
    data: AddItemDTO
  ) {
    const event = await this.eventRepo.findByIdAndOrg(eventId, organizationId);
    if (!event) {
      throw new NotFoundError(`Event with id ${eventId} not found`);
    }

    const checklist = await this.logisticsRepo.findChecklistById(checklistId);
    if (!checklist || checklist.eventId !== eventId) {
      throw new NotFoundError(`Checklist with id ${checklistId} not found in this event`);
    }

    return this.logisticsRepo.addItem(checklistId, data.itemName, data.quantityExpected);
  }

  async verifyChecklistItem(
    organizationId: string,
    userId: string,
    itemId: string,
    data: VerifyItemDTO,
    file?: Express.Multer.File
  ) {
    const item = await this.logisticsRepo.findItemById(itemId);
    if (!item || item.checklist.event.organizationId !== organizationId) {
      throw new NotFoundError(`Checklist item with id ${itemId} not found`);
    }

    let proofImageUrl: string | undefined;
    if (file) {
      proofImageUrl = `/uploads/${file.filename}`;
    }

    return this.logisticsRepo.verifyItem(itemId, {
      quantityActual: data.quantityActual,
      condition: data.condition,
      verifiedByUserId: userId,
      proofImageUrl,
      notes: data.notes,
    });
  }

  async deleteChecklist(organizationId: string, checklistId: string) {
    const checklist = await this.logisticsRepo.findChecklistById(checklistId);
    if (!checklist || checklist.event.organizationId !== organizationId) {
      throw new NotFoundError(`Checklist with id ${checklistId} not found`);
    }

    return this.logisticsRepo.deleteChecklist(checklistId);
  }

  async deleteItem(organizationId: string, itemId: string) {
    const item = await this.logisticsRepo.findItemById(itemId);
    if (!item || item.checklist.event.organizationId !== organizationId) {
      throw new NotFoundError(`Checklist item with id ${itemId} not found`);
    }

    return this.logisticsRepo.deleteItem(itemId);
  }
}

export const logisticsService = new LogisticsService();
