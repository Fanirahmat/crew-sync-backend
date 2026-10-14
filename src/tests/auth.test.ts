import request from 'supertest';
import { createApp } from '@/app';
import { prisma } from '@/config/database';

describe('Auth Endpoints (/api/v1/auth)', () => {
  const app = createApp();
  const testPhone = `089999${Math.floor(100000 + Math.random() * 900000)}`;
  const testEmail = `test_${Date.now()}@testorg.com`;
  let authToken = '';

  afterAll(async () => {
    // Cleanup created test records
    await prisma.userDeviceToken.deleteMany({
      where: { user: { phoneNumber: testPhone } },
    });
    await prisma.user.deleteMany({
      where: { phoneNumber: testPhone },
    });
    await prisma.organization.deleteMany({
      where: { name: 'Test Wedding Organizer' },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should successfully register a new organization and owner user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          organizationName: 'Test Wedding Organizer',
          fullName: 'Owner Test User',
          phoneNumber: testPhone,
          email: testEmail,
          password: 'securePassword123',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.role).toBe('OWNER');
      expect(res.body.data.user.phoneNumber).toBe(testPhone);

      authToken = res.body.data.token;
    });

    it('should return 409 Conflict if phone number is already registered', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          organizationName: 'Duplicate Test Org',
          fullName: 'Duplicate User',
          phoneNumber: testPhone,
          email: 'duplicate@testorg.com',
          password: 'securePassword123',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should return 422 for invalid input (short password)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          organizationName: 'Invalid Input Org',
          fullName: 'Invalid User',
          phoneNumber: '08111111111',
          password: '123', // too short
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with phone number and valid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testPhone,
          password: 'securePassword123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.phoneNumber).toBe(testPhone);
    });

    it('should login successfully with email and valid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testEmail,
          password: 'securePassword123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail);
    });

    it('should reject login with wrong password (401)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testPhone,
          password: 'wrongPassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/v1/auth/fcm-token', () => {
    it('should successfully register FCM device token when authenticated', async () => {
      const res = await request(app)
        .post('/api/v1/auth/fcm-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fcmToken: `sample_fcm_token_${Date.now()}`,
          platform: 'android',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.platform).toBe('android');
    });

    it('should reject FCM registration without Bearer token (401)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/fcm-token')
        .send({
          fcmToken: 'sample_token',
          platform: 'android',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
