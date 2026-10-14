import { AttendanceType, VerificationMethod, Prisma } from '@prisma/client';
import { attendanceRepository, AttendanceRepository } from '@/repositories/attendance.repository';
import { eventRepository, EventRepository } from '@/repositories/event.repository';
import { NotFoundError, BadRequestError, ForbiddenError } from '@/types/common';

export interface SubmitAttendanceDTO {
  type: AttendanceType;
  method: VerificationMethod;
  clientLat: number;
  clientLng: number;
  clientDistanceMeters: number;
  isWithinGeofence: boolean;
  biometricTokenRef?: string;
  notes?: string;
}

export class AttendanceService {
  constructor(
    private attendanceRepo: AttendanceRepository = attendanceRepository,
    private eventRepo: EventRepository = eventRepository
  ) {}

  async recordAttendance(
    organizationId: string,
    userId: string,
    eventId: string,
    data: SubmitAttendanceDTO,
    file?: Express.Multer.File
  ) {
    // 1. Verify event belongs to organization
    const event = await this.eventRepo.findByIdAndOrg(eventId, organizationId);
    if (!event) {
      throw new NotFoundError(`Event with id ${eventId} not found`);
    }

    // 2. Verify crew assignment
    const eventCrew = await this.eventRepo.findEventCrew(eventId, userId);
    if (!eventCrew) {
      throw new ForbiddenError('You are not assigned as a crew member to this event');
    }

    // 3. Method validation
    let photoUrl: string | undefined;
    if (data.method === VerificationMethod.PHOTO) {
      if (!file) {
        throw new BadRequestError('Photo file is required when verification method is PHOTO');
      }
      photoUrl = `/uploads/${file.filename}`;
    }

    // 4. Save attendance
    const attendance = await this.attendanceRepo.create({
      eventCrewId: eventCrew.id,
      type: data.type,
      method: data.method,
      clientLat: new Prisma.Decimal(data.clientLat),
      clientLng: new Prisma.Decimal(data.clientLng),
      clientDistanceMeters: Math.round(data.clientDistanceMeters),
      isWithinGeofence: Boolean(data.isWithinGeofence),
      biometricTokenRef: data.biometricTokenRef || null,
      photoUrl: photoUrl || null,
      notes: data.notes || null,
    });

    return attendance;
  }

  async getEventAttendances(organizationId: string, eventId: string) {
    const event = await this.eventRepo.findByIdAndOrg(eventId, organizationId);
    if (!event) {
      throw new NotFoundError(`Event with id ${eventId} not found`);
    }

    return this.attendanceRepo.findAllByEventId(eventId);
  }
}

export const attendanceService = new AttendanceService();
