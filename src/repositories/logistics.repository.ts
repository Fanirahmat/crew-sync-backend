import { LogisticsChecklist, ChecklistItem, LogisticsStage, ItemCondition, Event, Prisma } from '@prisma/client';
import { prisma } from '@/config/database';

export class LogisticsRepository {
  async createChecklist(
    eventId: string,
    name: string,
    stage: LogisticsStage = LogisticsStage.LOAD_IN,
    initialItems?: { itemName: string; quantityExpected: number }[]
  ): Promise<LogisticsChecklist> {
    return prisma.logisticsChecklist.create({
      data: {
        eventId,
        name,
        stage,
        items: initialItems && initialItems.length > 0
          ? {
              create: initialItems.map((item) => ({
                itemName: item.itemName,
                quantityExpected: item.quantityExpected,
                condition: ItemCondition.GOOD,
              })),
            }
          : undefined,
      },
      include: {
        items: true,
      },
    });
  }

  async findChecklistsByEvent(eventId: string): Promise<LogisticsChecklist[]> {
    return prisma.logisticsChecklist.findMany({
      where: { eventId },
      include: {
        items: {
          include: {
            verifiedByUser: {
              select: { id: true, fullName: true, phoneNumber: true },
            },
          },
          orderBy: { itemName: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findChecklistById(checklistId: string): Promise<(LogisticsChecklist & { event: Event; items: ChecklistItem[] }) | null> {
    return prisma.logisticsChecklist.findUnique({
      where: { id: checklistId },
      include: {
        event: true,
        items: true,
      },
    });
  }

  async addItem(checklistId: string, itemName: string, quantityExpected: number): Promise<ChecklistItem> {
    return prisma.checklistItem.create({
      data: {
        checklistId,
        itemName,
        quantityExpected,
        condition: ItemCondition.GOOD,
      },
    });
  }

  async findItemById(itemId: string): Promise<(ChecklistItem & { checklist: LogisticsChecklist & { event: { organizationId: string } } }) | null> {
    return prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        checklist: {
          include: {
            event: {
              select: { organizationId: true },
            },
          },
        },
      },
    });
  }

  async verifyItem(
    itemId: string,
    data: {
      quantityActual: number;
      condition: ItemCondition;
      verifiedByUserId: string;
      proofImageUrl?: string | null;
      notes?: string | null;
    }
  ): Promise<ChecklistItem> {
    const updatePayload: Prisma.ChecklistItemUpdateInput = {
      quantityActual: data.quantityActual,
      condition: data.condition,
      verifiedByUser: { connect: { id: data.verifiedByUserId } },
      verifiedAt: new Date(),
      notes: data.notes ?? null,
    };

    if (data.proofImageUrl !== undefined) {
      updatePayload.proofImageUrl = data.proofImageUrl;
    }

    return prisma.checklistItem.update({
      where: { id: itemId },
      data: updatePayload,
      include: {
        verifiedByUser: {
          select: { id: true, fullName: true, phoneNumber: true },
        },
      },
    });
  }

  async deleteChecklist(checklistId: string): Promise<LogisticsChecklist> {
    return prisma.logisticsChecklist.delete({
      where: { id: checklistId },
    });
  }

  async deleteItem(itemId: string): Promise<ChecklistItem> {
    return prisma.checklistItem.delete({
      where: { id: itemId },
    });
  }
}

export const logisticsRepository = new LogisticsRepository();
