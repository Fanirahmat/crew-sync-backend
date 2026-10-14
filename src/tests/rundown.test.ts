import request from 'supertest';
import { createApp } from '@/app';
import { prisma } from '@/config/database';
import { generateToken } from '@/utils/jwt.util';
import { Role, RundownStatus } from '@prisma/client';

describe('Rundown Engine & FCM Broadcast Endpoints', () => {
  const app = createApp();
  let orgId = '';
  let plannerToken = '';
  let testEventId = '';
  let itemId1 = '';
  let itemId2 = '';

  beforeAll(async () => {
    // 1. Fetch seeded organization & planner
    const org = await prisma.organization.findFirst({
      where: { name: 'Artha Wedding & Event Planner' },
    });
    if (!org) throw new Error('Seeded organization not found');
    orgId = org.id;

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

    // 2. Fetch seeded event
    const event = await prisma.event.findFirst({
      where: { organizationId: orgId },
    });
    if (!event) throw new Error('Seeded event not found');
    testEventId = event.id;
  });

  afterAll(async () => {
    if (itemId1) {
      await prisma.rundownItem.deleteMany({ where: { id: { in: [itemId1, itemId2] } } });
    }
    await prisma.$disconnect();
  });

  describe('POST /api/v1/events/:id/rundown', () => {
    it('should add a new rundown item', async () => {
      const startTime = new Date(Date.now() + 3600000).toISOString();
      const endTime = new Date(Date.now() + 7200000).toISOString();

      const res = await request(app)
        .post(`/api/v1/events/${testEventId}/rundown`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({
          title: 'Opening Dance & Toast',
          description: 'Tarian pembuka oleh pengantin dan keluarga inti.',
          locationSection: 'Dance Floor',
          startTime,
          endTime,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Opening Dance & Toast');
      expect(res.body.data.status).toBe('PENDING');

      itemId1 = res.body.data.id;
    });

    it('should add a second rundown item', async () => {
      const startTime = new Date(Date.now() + 7200000).toISOString();
      const endTime = new Date(Date.now() + 10800000).toISOString();

      const res = await request(app)
        .post(`/api/v1/events/${testEventId}/rundown`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({
          title: 'Photo Session with VIP Guests',
          locationSection: 'Photo Booth A',
          startTime,
          endTime,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Photo Session with VIP Guests');

      itemId2 = res.body.data.id;
    });
  });

  describe('GET /api/v1/events/:id/rundown', () => {
    it('should return rundown items for the event', async () => {
      const res = await request(app)
        .get(`/api/v1/events/${testEventId}/rundown`)
        .set('Authorization', `Bearer ${plannerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((item: { id: string }) => item.id === itemId1)).toBe(true);
    });
  });

  describe('PATCH /api/v1/events/:id/rundown/reorder', () => {
    it('should bulk reorder items successfully', async () => {
      const res = await request(app)
        .patch(`/api/v1/events/${testEventId}/rundown/reorder`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({
          items: [
            { id: itemId1, orderIndex: 10 },
            { id: itemId2, orderIndex: 9 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedItem1 = res.body.data.find((i: { id: string }) => i.id === itemId1);
      const updatedItem2 = res.body.data.find((i: { id: string }) => i.id === itemId2);
      expect(updatedItem1.orderIndex).toBe(10);
      expect(updatedItem2.orderIndex).toBe(9);
    });
  });

  describe('PATCH /api/v1/events/:id/rundown/:itemId/status', () => {
    it('should activate rundown item and trigger actualStartedAt and FCM topic broadcast', async () => {
      const res = await request(app)
        .patch(`/api/v1/events/${testEventId}/rundown/${itemId1}/status`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({
          status: RundownStatus.ACTIVE,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACTIVE');
      expect(res.body.data.actualStartedAt).not.toBeNull();
    });

    it('should complete rundown item and record actualEndedAt', async () => {
      const res = await request(app)
        .patch(`/api/v1/events/${testEventId}/rundown/${itemId1}/status`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({
          status: RundownStatus.COMPLETED,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('COMPLETED');
      expect(res.body.data.actualEndedAt).not.toBeNull();
    });
  });
});
