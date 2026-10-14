import { RundownItem, RundownStatus, Prisma } from '@prisma/client';
import { prisma } from '@/config/database';

export class RundownRepository {
  async create(data: Prisma.RundownItemUncheckedCreateInput): Promise<RundownItem> {
    return prisma.rundownItem.create({
      data,
      include: {
        picUser: {
          select: { id: true, fullName: true, phoneNumber: true },
        },
      },
    });
  }

  async findById(id: string): Promise<RundownItem | null> {
    return prisma.rundownItem.findUnique({
      where: { id },
      include: {
        event: true,
        picUser: {
          select: { id: true, fullName: true, phoneNumber: true },
        },
      },
    });
  }

  async findByEventId(eventId: string): Promise<RundownItem[]> {
    return prisma.rundownItem.findMany({
      where: { eventId },
      orderBy: { orderIndex: 'asc' },
      include: {
        picUser: {
          select: { id: true, fullName: true, phoneNumber: true },
        },
      },
    });
  }

  async getMaxOrderIndex(eventId: string): Promise<number> {
    const aggregate = await prisma.rundownItem.aggregate({
      where: { eventId },
      _max: { orderIndex: true },
    });
    return aggregate._max.orderIndex ?? 0;
  }

  async updateStatus(
    id: string,
    status: RundownStatus,
    actualStartedAt?: Date | null,
    actualEndedAt?: Date | null
  ): Promise<RundownItem> {
    const updateData: Prisma.RundownItemUpdateInput = { status };
    if (actualStartedAt !== undefined) {
      updateData.actualStartedAt = actualStartedAt;
    }
    if (actualEndedAt !== undefined) {
      updateData.actualEndedAt = actualEndedAt;
    }

    return prisma.rundownItem.update({
      where: { id },
      data: updateData,
      include: {
        picUser: {
          select: { id: true, fullName: true, phoneNumber: true },
        },
      },
    });
  }

  async reorder(items: { id: string; orderIndex: number }[]): Promise<void> {
    await prisma.$transaction(
      items.map((item) =>
        prisma.rundownItem.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        })
      )
    );
  }
}

export const rundownRepository = new RundownRepository();
