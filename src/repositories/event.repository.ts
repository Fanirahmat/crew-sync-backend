import { Event, EventCrew, Prisma } from '@prisma/client';
import { prisma } from '@/config/database';

export class EventRepository {
  async create(data: Prisma.EventUncheckedCreateInput): Promise<Event> {
    return prisma.event.create({
      data,
    });
  }

  async findAllByOrg(organizationId: string): Promise<Event[]> {
    return prisma.event.findMany({
      where: { organizationId },
      orderBy: { eventDate: 'asc' },
      include: {
        _count: {
          select: {
            crews: true,
            rundowns: true,
            checklists: true,
          },
        },
      },
    });
  }

  async findByIdAndOrg(id: string, organizationId: string): Promise<Event | null> {
    return prisma.event.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        rundowns: {
          orderBy: { orderIndex: 'asc' },
          include: { picUser: { select: { id: true, fullName: true, phoneNumber: true } } },
        },
        crews: {
          include: {
            user: { select: { id: true, fullName: true, phoneNumber: true, role: true } },
          },
        },
        checklists: {
          include: {
            items: true,
          },
        },
      },
    });
  }

  async assignCrew(data: Prisma.EventCrewUncheckedCreateInput): Promise<EventCrew> {
    return prisma.eventCrew.upsert({
      where: {
        eventId_userId: {
          eventId: data.eventId,
          userId: data.userId,
        },
      },
      update: {
        assignedRole: data.assignedRole,
        shiftStart: data.shiftStart,
        shiftEnd: data.shiftEnd,
        feeAmount: data.feeAmount,
      },
      create: data,
      include: {
        user: {
          select: { id: true, fullName: true, phoneNumber: true, role: true },
        },
      },
    });
  }

  async findEventCrews(eventId: string): Promise<EventCrew[]> {
    return prisma.eventCrew.findMany({
      where: { eventId },
      include: {
        user: {
          select: { id: true, fullName: true, phoneNumber: true, role: true, email: true },
        },
        attendances: {
          orderBy: { recordedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findEventCrew(eventId: string, userId: string): Promise<EventCrew | null> {
    return prisma.eventCrew.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
      include: {
        event: true,
      },
    });
  }
}

export const eventRepository = new EventRepository();
