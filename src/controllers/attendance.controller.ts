import { Request, Response, NextFunction } from 'express';
import { AttendanceType, VerificationMethod } from '@prisma/client';
import { attendanceService, AttendanceService } from '@/services/attendance.service';
import { sendSuccess } from '@/utils/response.util';
import { BadRequestError, UnauthorizedError } from '@/types/common';

export class AttendanceController {
  constructor(private service: AttendanceService = attendanceService) {}

  submitAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.userId || !req.user?.organizationId) {
        throw new UnauthorizedError('Authentication and organization context required');
      }

      const body = req.body;

      // Extract fields with snake_case and camelCase fallback support
      const typeStr = body.type;
      const methodStr = body.method;
      const clientLatRaw = body.clientLat ?? body.client_lat;
      const clientLngRaw = body.clientLng ?? body.client_lng;
      const clientDistanceMetersRaw = body.clientDistanceMeters ?? body.client_distance_meters;
      const isWithinGeofenceRaw = body.isWithinGeofence ?? body.is_within_geofence;
      const biometricTokenRef = body.biometricTokenRef ?? body.biometric_token_ref;
      const notes = body.notes;

      if (!typeStr || !['CHECK_IN', 'CHECK_OUT'].includes(typeStr)) {
        throw new BadRequestError("Valid 'type' is required (CHECK_IN or CHECK_OUT)");
      }

      if (!methodStr || !['BIOMETRIC', 'PHOTO'].includes(methodStr)) {
        throw new BadRequestError("Valid 'method' is required (BIOMETRIC or PHOTO)");
      }

      const clientLat = parseFloat(clientLatRaw);
      const clientLng = parseFloat(clientLngRaw);
      const clientDistanceMeters = parseFloat(clientDistanceMetersRaw);

      if (isNaN(clientLat) || isNaN(clientLng) || isNaN(clientDistanceMeters)) {
        throw new BadRequestError('clientLat, clientLng, and clientDistanceMeters must be valid numbers');
      }

      const isWithinGeofence =
        isWithinGeofenceRaw === true ||
        isWithinGeofenceRaw === 'true' ||
        isWithinGeofenceRaw === 1 ||
        isWithinGeofenceRaw === '1';

      const attendance = await this.service.recordAttendance(
        req.user.organizationId,
        req.user.userId,
        req.params.id,
        {
          type: typeStr as AttendanceType,
          method: methodStr as VerificationMethod,
          clientLat,
          clientLng,
          clientDistanceMeters,
          isWithinGeofence,
          biometricTokenRef,
          notes,
        },
        req.file
      );

      sendSuccess(res, attendance, `Presensi ${attendance.type} berhasil dicatat.`, 201);
    } catch (error) {
      next(error);
    }
  };

  getEventAttendances = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.organizationId) {
        throw new UnauthorizedError('Organization context required');
      }

      const attendances = await this.service.getEventAttendances(
        req.user.organizationId,
        req.params.id
      );
      sendSuccess(res, attendances, 'Attendances retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  };
}

export const attendanceController = new AttendanceController();
