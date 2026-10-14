import { CrewAttendance, Prisma } from '@prisma/client';
import { prisma } from '@/config/database';

export class AttendanceRepository {
  async create(data: Prisma.CrewAttendanceUncheckedCreateInput): Promise<CrewAttendance> {
    return prisma.crewAttendance.create({
      data,
    });
  }

  async findByEventCrewId(eventCrewId: string): Promise<CrewAttendance[]> {
    return prisma.crewAttendance.findMany({
      where: { eventCrewId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async findAllByEventId(eventId: string): Promise<CrewAttendance[]> {
    return prisma.crewAttendance.findMany({
      where: {
        eventCrew: {
          eventId,
        },
      },
      include: {
        eventCrew: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: { recordedAt: 'desc' },
    });
  }
}

export const attendanceRepository = new AttendanceRepository();
