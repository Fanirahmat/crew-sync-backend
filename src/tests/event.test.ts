import request from 'supertest';
import { createApp } from '@/app';
import { prisma } from '@/config/database';
import { generateToken } from '@/utils/jwt.util';
import { Role } from '@prisma/client';

describe('Events & Crew Endpoints (/api/v1/events)', () => {
  const app = createApp();
  let orgId = '';
  let plannerToken = '';
  let crewToken = '';
  let crewUserId = '';
  let createdEventId = '';

  beforeAll(async () => {
    // 1. Fetch seeded organization
    const org = await prisma.organization.findFirst({
      where: { name: 'Artha Wedding & Event Planner' },
    });
    if (!org) throw new Error('Seeded organization not found');
    orgId = org.id;

    // 2. Fetch seeded planner
    const planner = await prisma.user.findFirst({
      where: { organizationId: orgId, role: Role.PLANNER },
    });
    if (!planner) throw new Error('Seeded planner not found');

    plannerToken = generateToken({
      userId: planner.id,
      organizationId: orgId,
      role: planner.role,
      phoneNumber: planner.phoneNumber,
    });

    // 3. Fetch seeded crew
    const crew = await prisma.user.findFirst({
      where: { organizationId: orgId, role: Role.CREW },
    });
    if (!crew) throw new Error('Seeded crew not found');
    crewUserId = crew.id;

    crewToken = generateToken({
      userId: crew.id,
      organizationId: orgId,
      role: crew.role,
      phoneNumber: crew.phoneNumber,
    });
  });

  afterAll(async () => {
    if (createdEventId) {
      await prisma.eventCrew.deleteMany({ where: { eventId: createdEventId } });
      await prisma.rundownItem.deleteMany({ where: { eventId: createdEventId } });
      await prisma.event.deleteMany({ where: { id: createdEventId } });
    }
    await prisma.$disconnect();
  });

  describe('POST /api/v1/events', () => {
    it('should allow planner to create a new event with geofence settings', async () => {
      const res = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({
          title: 'Gala Dinner PT Nusantara',
          category: 'Corporate',
          eventDate: new Date(Date.now() + 86400000).toISOString(),
          venueName: 'The Ritz-Carlton Mega Kuningan',
          venueLat: -6.2285,
          venueLng: 106.8272,
          geofenceRadiusMeters: 200,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Gala Dinner PT Nusantara');
      expect(Number(res.body.data.geofenceRadiusMeters)).toBe(200);

      createdEventId = res.body.data.id;
    });

    it('should forbid crew from creating an event (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${crewToken}`)
        .send({
          title: 'Unauthorized Event',
          category: 'Wedding',
          eventDate: new Date().toISOString(),
          venueName: 'Some Venue',
          venueLat: -6.2,
          venueLng: 106.8,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/events', () => {
    it('should return list of events for the organization', async () => {
      const res = await request(app)
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${plannerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/events/:id', () => {
    it('should return event details including venue spatial coordinates', async () => {
      const res = await request(app)
        .get(`/api/v1/events/${createdEventId}`)
        .set('Authorization', `Bearer ${crewToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdEventId);
      expect(Number(res.body.data.venueLat)).toBeCloseTo(-6.2285);
      expect(Number(res.body.data.venueLng)).toBeCloseTo(106.8272);
      expect(res.body.data.geofenceRadiusMeters).toBe(200);
    });

    it('should return 404 for invalid event id', async () => {
      const res = await request(app)
        .get('/api/v1/events/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${plannerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/events/:id/crews', () => {
    it('should allow planner to assign a crew to the event', async () => {
      const res = await request(app)
        .post(`/api/v1/events/${createdEventId}/crews`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({
          userId: crewUserId,
          assignedRole: 'Head of Sound Engineer',
          shiftStart: new Date().toISOString(),
          shiftEnd: new Date(Date.now() + 28800000).toISOString(),
          feeAmount: 500000,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignedRole).toBe('Head of Sound Engineer');
      expect(res.body.data.userId).toBe(crewUserId);
    });
  });

  describe('GET /api/v1/events/:id/crews', () => {
    it('should return list of crews assigned to the event', async () => {
      const res = await request(app)
        .get(`/api/v1/events/${createdEventId}/crews`)
        .set('Authorization', `Bearer ${crewToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((c: { userId: string }) => c.userId === crewUserId)).toBe(true);
    });
  });
});
