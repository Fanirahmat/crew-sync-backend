import request from 'supertest';
import { createApp } from '@/app';

describe('OpenAPI / Swagger Documentation Endpoints', () => {
  const app = createApp();

  it('should serve Swagger UI HTML page at /api/docs/', async () => {
    const res = await request(app).get('/api/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('should serve OpenAPI JSON specification at /api/docs.json', async () => {
    const res = await request(app).get('/api/docs.json');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('openapi', '3.0.3');
    expect(res.body.info).toHaveProperty('title', 'CrewSync API Documentation');
    expect(res.body.paths).toHaveProperty('/api/v1/health');
    expect(res.body.paths).toHaveProperty('/api/v1/auth/login');
    expect(res.body.paths).toHaveProperty('/api/v1/events');
    expect(res.body.paths).toHaveProperty('/api/v1/events/{id}/attendances');
  });

  it('should serve OpenAPI YAML specification at /api/docs.yaml', async () => {
    const res = await request(app).get('/api/docs.yaml');
    expect(res.status).toBe(200);
    expect(res.text).toContain('openapi: 3.0.3');
    expect(res.text).toContain('title: CrewSync API Documentation');
  });
});
