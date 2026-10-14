import request from 'supertest';
import { createApp } from '@/app';
import { prisma } from '@/config/database';
import { generateToken } from '@/utils/jwt.util';
import { Role } from '@prisma/client';

describe('Logistics Checklists & Verification Endpoints', () => {
  const app = createApp();
  let orgId = '';
  let eventId = '';
  let plannerToken = '';
  let crewToken = '';
  let createdChecklistId = '';
  let testItemId = '';

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

    // 2. Fetch planner and crew
    const planner = await prisma.user.findFirst({
      where: { organizationId: orgId, role: Role.PLANNER },
    });
    if (!planner) throw new Error('Planner not found');

    plannerToken = generateToken({
      userId: planner.id,
      organizationId: orgId,
      role: planner.role,
      phoneNumber: planner.phoneNumber,
    });

    const crew = await prisma.user.findFirst({
      where: { organizationId: orgId, role: Role.CREW },
    });
    if (!crew) throw new Error('Crew not found');

    crewToken = generateToken({
      userId: crew.id,
      organizationId: orgId,
      role: crew.role,
      phoneNumber: crew.phoneNumber,
    });
  });

  afterAll(async () => {
    if (createdChecklistId) {
      await prisma.checklistItem.deleteMany({ where: { checklistId: createdChecklistId } });
      await prisma.logisticsChecklist.deleteMany({ where: { id: createdChecklistId } });
    }
    await prisma.$disconnect();
  });

  describe('POST /api/v1/events/:id/checklists', () => {
    it('should allow planner to create a new logistics checklist with initial items', async () => {
      const res = await request(app)
        .post(`/api/v1/events/${eventId}/checklists`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({
          name: 'Dekorasi & Bunga Pelaminan (Load-In)',
          stage: 'LOAD_IN',
          items: [
            { itemName: 'Standing Flower Besi Gold', quantityExpected: 6 },
            { itemName: 'Karpet Merah VIP 30m', quantityExpected: 2 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Dekorasi & Bunga Pelaminan (Load-In)');
      expect(res.body.data.items).toHaveLength(2);

      createdChecklistId = res.body.data.id;
      testItemId = res.body.data.items[0].id;
    });
  });

  describe('GET /api/v1/events/:id/checklists', () => {
    it('should retrieve all checklists and items for the event', async () => {
      const res = await request(app)
        .get(`/api/v1/events/${eventId}/checklists`)
        .set('Authorization', `Bearer ${crewToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((c: { id: string }) => c.id === createdChecklistId)).toBe(true);
    });
  });

  describe('POST /api/v1/events/:id/checklists/:checklistId/items', () => {
    it('should add an item to an existing checklist', async () => {
      const res = await request(app)
        .post(`/api/v1/events/${eventId}/checklists/${createdChecklistId}/items`)
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({
          itemName: 'Lampu Sorot Par LED 54x3W',
          quantityExpected: 8,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.itemName).toBe('Lampu Sorot Par LED 54x3W');
      expect(res.body.data.quantityExpected).toBe(8);
    });
  });

  describe('PATCH /api/v1/checklists/items/:itemId/verify', () => {
    it('should verify physical condition as GOOD', async () => {
      const res = await request(app)
        .patch(`/api/v1/checklists/items/${testItemId}/verify`)
        .set('Authorization', `Bearer ${crewToken}`)
        .field('quantityActual', '6')
        .field('condition', 'GOOD')
        .field('notes', 'Seluruh standing flower dalam kondisi mulus.');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quantityActual).toBe(6);
      expect(res.body.data.condition).toBe('GOOD');
      expect(res.body.data.verifiedAt).not.toBeNull();
      expect(res.body.data.verifiedByUser).toBeDefined();
    });

    it('should verify physical condition as DAMAGED with proofImage upload', async () => {
      const dummyProof = Buffer.from('damaged item evidence photo binary');

      const res = await request(app)
        .patch(`/api/v1/checklists/items/${testItemId}/verify`)
        .set('Authorization', `Bearer ${crewToken}`)
        .field('quantity_actual', '5')
        .field('condition', 'DAMAGED')
        .field('notes', '1 unit tiang bengkok tertindih saat bongkar muat.')
        .attach('proofImage', dummyProof, 'broken_pole.jpg');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quantityActual).toBe(5);
      expect(res.body.data.condition).toBe('DAMAGED');
      expect(res.body.data.proofImageUrl).toContain('/uploads/');
    });

    it('should verify physical condition as MISSING', async () => {
      const res = await request(app)
        .patch(`/api/v1/checklists/items/${testItemId}/verify`)
        .set('Authorization', `Bearer ${crewToken}`)
        .field('quantityActual', '4')
        .field('condition', 'MISSING')
        .field('notes', '2 unit tidak ditemukan di truk logistik.');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.condition).toBe('MISSING');
    });
  });
});
