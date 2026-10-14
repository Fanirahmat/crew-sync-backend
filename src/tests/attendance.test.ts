import request from 'supertest';
import { createApp } from '@/app';
import { prisma } from '@/config/database';
import { generateToken } from '@/utils/jwt.util';
import { Role } from '@prisma/client';

describe('Crew Attendance Endpoints (/api/v1/events/:id/attendances)', () => {
  const app = createApp();
  let orgId = '';
  let eventId = '';
  let assignedCrewToken = '';
  let unassignedUserToken = '';

  beforeAll(async () => {
    // 1. Fetch seeded organization & event
    const org = await prisma.organization.findFirst({
      where: { name: 'Artha Wedding & Event Planner' },
    });
    if (!org) throw new Error('Seeded organization not found');
    orgId = org.id;

    const event = await prisma.event.findFirst({
      where: { organizationId: orgId },
    });
    if (!event) throw new Error('Seeded event not found');
    eventId = event.id;

    // 2. Fetch assigned crew (Siti Rahma)
    const assignedCrew = await prisma.user.findFirst({
      where: { organizationId: orgId, phoneNumber: '081234567891' },
    });
    if (!assignedCrew) throw new Error('Assigned crew not found');

    assignedCrewToken = generateToken({
      userId: assignedCrew.id,
      organizationId: orgId,
      role: assignedCrew.role,
      phoneNumber: assignedCrew.phoneNumber,
    });

    // 3. Create an unassigned user for negative testing
    const unassignedUser = await prisma.user.create({
      data: {
        organizationId: orgId,
        fullName: 'Unassigned User',
        phoneNumber: `089888${Math.floor(100000 + Math.random() * 900000)}`,
        passwordHash: 'hash',
        role: Role.CREW,
      },
    });

    unassignedUserToken = generateToken({
      userId: unassignedUser.id,
      organizationId: orgId,
      role: unassignedUser.role,
      phoneNumber: unassignedUser.phoneNumber,
    });
  });

  afterAll(async () => {
    await prisma.crewAttendance.deleteMany({
      where: { eventCrew: { eventId } },
    });
    await prisma.user.deleteMany({
      where: { fullName: 'Unassigned User' },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/events/:id/attendances (BIOMETRIC)', () => {
    it('should successfully record CHECK_IN with BIOMETRIC method', async () => {
      const res = await request(app)
        .post(`/api/v1/events/${eventId}/attendances`)
        .set('Authorization', `Bearer ${assignedCrewToken}`)
        .field('type', 'CHECK_IN')
        .field('method', 'BIOMETRIC')
        .field('clientLat', '-6.2361250')
        .field('clientLng', '106.8284150')
        .field('clientDistanceMeters', '8')
        .field('isWithinGeofence', 'true')
        .field('biometricTokenRef', 'bio_auth_signature_token_abc');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('CHECK_IN');
      expect(res.body.data.method).toBe('BIOMETRIC');
      expect(res.body.data.isWithinGeofence).toBe(true);
      expect(res.body.data.id).toBeDefined();
    });

    it('should reject attendance if user is not assigned to this event (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/events/${eventId}/attendances`)
        .set('Authorization', `Bearer ${unassignedUserToken}`)
        .field('type', 'CHECK_IN')
        .field('method', 'BIOMETRIC')
        .field('clientLat', '-6.2361250')
        .field('clientLng', '106.8284150')
        .field('clientDistanceMeters', '8')
        .field('isWithinGeofence', 'true');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/v1/events/:id/attendances (PHOTO)', () => {
    it('should successfully record CHECK_OUT with PHOTO upload', async () => {
      const dummyImageBuffer = Buffer.from('fake image binary data');

      const res = await request(app)
        .post(`/api/v1/events/${eventId}/attendances`)
        .set('Authorization', `Bearer ${assignedCrewToken}`)
        .field('type', 'CHECK_OUT')
        .field('method', 'PHOTO')
        .field('client_lat', '-6.2361250')
        .field('client_lng', '106.8284150')
        .field('client_distance_meters', '12')
        .field('is_within_geofence', 'true')
        .field('notes', 'Selesai bertugas sesi akad dan resepsi.')
        .attach('photo', dummyImageBuffer, 'selfie.jpg');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('CHECK_OUT');
      expect(res.body.data.method).toBe('PHOTO');
      expect(res.body.data.photoUrl).toContain('/uploads/');
    });

    it('should fail if method is PHOTO but no photo is uploaded (400)', async () => {
      const res = await request(app)
        .post(`/api/v1/events/${eventId}/attendances`)
        .set('Authorization', `Bearer ${assignedCrewToken}`)
        .field('type', 'CHECK_IN')
        .field('method', 'PHOTO')
        .field('clientLat', '-6.2361250')
        .field('clientLng', '106.8284150')
        .field('clientDistanceMeters', '10')
        .field('isWithinGeofence', 'true');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/events/:id/attendances', () => {
    it('should return list of attendance records for the event', async () => {
      const res = await request(app)
        .get(`/api/v1/events/${eventId}/attendances`)
        .set('Authorization', `Bearer ${assignedCrewToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
