import request from 'supertest';
import { createApp } from '@/app';
import { prisma } from '@/config/database';
import { Role } from '@prisma/client';

describe('SaaS Platform Admin Endpoints (/api/v1/admin)', () => {
  const app = createApp();
  let superadminToken = '';
  let ownerToken = '';
  let clientOrgId = '';

  beforeAll(async () => {
    // 1. Login as Superadmin (from seed)
    const superLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: '081111111111',
        password: 'password123',
      });

    expect(superLogin.status).toBe(200);
    expect(superLogin.body.data.user.role).toBe(Role.SUPERADMIN);
    superadminToken = superLogin.body.data.token;

    // 2. Login as Client Owner (from seed)
    const ownerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: '081234567899',
        password: 'password123',
      });

    expect(ownerLogin.status).toBe(200);
    expect(ownerLogin.body.data.user.role).toBe(Role.OWNER);
    ownerToken = ownerLogin.body.data.token;
    clientOrgId = ownerLogin.body.data.user.organizationId;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Authorization Checks', () => {
    it('should return 401 Unauthorized if no token provided', async () => {
      const res = await request(app).get('/api/v1/admin/stats');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 Forbidden if called by a tenant OWNER', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Role 'OWNER' is not authorized/i);
    });
  });

  describe('GET /api/v1/admin/stats', () => {
    it('should return platform overview metrics for SUPERADMIN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalOrganizations');
      expect(res.body.data).toHaveProperty('totalUsers');
      expect(res.body.data).toHaveProperty('totalEvents');
      expect(res.body.data).toHaveProperty('activeEvents');
      expect(res.body.data.totalOrganizations).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /api/v1/admin/organizations', () => {
    it('should list all organizations registered on the platform', async () => {
      const res = await request(app)
        .get('/api/v1/admin/organizations')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const target = res.body.data.find((o: { id: string }) => o.id === clientOrgId);
      expect(target).toBeDefined();
      expect(target.name).toBe('Artha Wedding & Event Planner');
      expect(target).toHaveProperty('totalUsers');
      expect(target).toHaveProperty('totalEvents');
    });
  });

  describe('GET /api/v1/admin/organizations/:id', () => {
    it('should retrieve full details of a specific organization', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/organizations/${clientOrgId}`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(clientOrgId);
      expect(res.body.data.name).toBe('Artha Wedding & Event Planner');
      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(4);
    });

    it('should return 404 for non-existent organization', async () => {
      const res = await request(app)
        .get('/api/v1/admin/organizations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/admin/organizations/:id/subscription', () => {
    it('should update organization subscription tier to enterprise', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/organizations/${clientOrgId}/subscription`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          subscriptionTier: 'enterprise',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subscriptionTier).toBe('enterprise');
    });

    it('should reject invalid subscription tier name', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/organizations/${clientOrgId}/subscription`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          subscriptionTier: 'invalid_random_tier',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
