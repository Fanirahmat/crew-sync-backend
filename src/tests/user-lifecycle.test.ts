import request from 'supertest';
import { createApp } from '@/app';
import { prisma } from '@/config/database';
import { Role } from '@prisma/client';

describe('User Lifecycle & Account Management Endpoints', () => {
  const app = createApp();
  const testPhone = `088111${Math.floor(100000 + Math.random() * 900000)}`;
  const testEmail = `userlife_${Date.now()}@crewsync.test`;
  const initialPassword = 'InitialPass123!';
  const newPassword = 'NewSecretPassword456!';

  let ownerToken = '';
  let ownerUserId = '';
  let organizationId = '';
  let resetToken = '';
  let createdCrewId = '';
  const crewPhone = `088222${Math.floor(100000 + Math.random() * 900000)}`;

  beforeAll(async () => {
    // 1. Register an Owner user to act as test fixture
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        organizationName: 'Lifecycle Test EO',
        fullName: 'Lifecycle Owner User',
        phoneNumber: testPhone,
        email: testEmail,
        password: initialPassword,
      });

    expect(res.status).toBe(201);
    ownerToken = res.body.data.token;
    ownerUserId = res.body.data.user.id;
    organizationId = res.body.data.organization.id;
  });

  afterAll(async () => {
    // Cleanup database records created during test
    await prisma.passwordResetToken.deleteMany({
      where: { userId: ownerUserId },
    });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { phoneNumber: testPhone },
          { phoneNumber: crewPhone },
          { organizationId },
        ],
      },
    });
    await prisma.organization.deleteMany({
      where: { id: organizationId },
    });
    await prisma.$disconnect();
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 Unauthorized if no token is provided', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return current user profile and organization details', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(ownerUserId);
      expect(res.body.data.fullName).toBe('Lifecycle Owner User');
      expect(res.body.data.role).toBe(Role.OWNER);
      expect(res.body.data.organization.id).toBe(organizationId);
      expect(res.body.data.organization.name).toBe('Lifecycle Test EO');
    });
  });

  describe('PUT /api/v1/users/profile', () => {
    it('should update full name and email successfully', async () => {
      const updatedEmail = `updated_${Date.now()}@crewsync.test`;
      const res = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          fullName: 'Owner Name Updated',
          email: updatedEmail,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toBe('Owner Name Updated');
      expect(res.body.data.email).toBe(updatedEmail);
    });
  });

  describe('PUT /api/v1/users/change-password', () => {
    it('should reject password change if current password is wrong', async () => {
      const res = await request(app)
        .put('/api/v1/users/change-password')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: newPassword,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Current password is incorrect/i);
    });

    it('should change password successfully when current password is valid', async () => {
      const res = await request(app)
        .put('/api/v1/users/change-password')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          currentPassword: initialPassword,
          newPassword: newPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/updated successfully/i);

      // Verify that login works with new password
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testPhone,
          password: newPassword,
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      ownerToken = loginRes.body.data.token;
    });
  });

  describe('POST /api/v1/auth/forgot-password & /api/v1/auth/reset-password', () => {
    it('should generate a 6-digit reset token for registered phone number', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          identifier: testPhone,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('resetToken');
      expect(res.body.data.resetToken).toHaveLength(6);
      resetToken = res.body.data.resetToken;
    });

    it('should reset password with valid token and allow login with new password', async () => {
      const resetPass = 'PassReset999!';
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          identifier: testPhone,
          token: resetToken,
          newPassword: resetPass,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify user can login with reset password
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testPhone,
          password: resetPass,
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      ownerToken = loginRes.body.data.token;
    });

    it('should reject reused or invalid token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          identifier: testPhone,
          token: resetToken,
          newPassword: 'AnotherPassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Organization Crew & User Management (/api/v1/users)', () => {
    it('should allow Owner to create and invite a new Crew member to the organization', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          fullName: 'Ahmad Fauzi Field Crew',
          phoneNumber: crewPhone,
          email: `crew_${Date.now()}@crewsync.test`,
          role: Role.CREW,
          password: 'CrewDefaultPass123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toBe('Ahmad Fauzi Field Crew');
      expect(res.body.data.role).toBe(Role.CREW);
      expect(res.body.data.organizationId).toBe(organizationId);

      createdCrewId = res.body.data.id;
    });

    it('should list all members of the organization', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2); // Owner + Created Crew
    });

    it('should retrieve a specific user in the organization', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${createdCrewId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdCrewId);
      expect(res.body.data.fullName).toBe('Ahmad Fauzi Field Crew');
    });

    it('should allow Owner to update user role to COORDINATOR', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${createdCrewId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          role: Role.COORDINATOR,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe(Role.COORDINATOR);
    });

    it('should prevent Owner from deleting their own account', async () => {
      const res = await request(app)
        .delete(`/api/v1/users/${ownerUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Cannot delete your own account/i);
    });

    it('should allow Owner to delete a crew member', async () => {
      const res = await request(app)
        .delete(`/api/v1/users/${createdCrewId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/User removed/i);
    });
  });
});
