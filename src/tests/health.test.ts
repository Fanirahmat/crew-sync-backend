import request from 'supertest';
import { createApp } from '@/app';

describe('GET /api/v1/health', () => {
  const app = createApp();

  it('should return 200 OK with status and service name', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('service', 'CrewSync API');
  });

  it('should return 404 for non-existent route', async () => {
    const res = await request(app).get('/api/v1/non-existent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
