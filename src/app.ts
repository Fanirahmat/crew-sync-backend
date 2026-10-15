import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { env } from '@/config/env';
import routes from '@/routes';
import { errorHandler } from '@/middlewares/error.middleware';
import { setupSwagger } from '@/config/swagger';

export const createApp = (): Application => {
  const app = express();

  // Security Middlewares (allow Swagger UI inline styles and scripts)
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );
  app.use(cors());

  // Body Parsing Middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static uploads directory serving
  const uploadPath = path.resolve(process.cwd(), env.UPLOAD_DIR);
  app.use('/uploads', express.static(uploadPath));

  // Swagger Documentation UI & Spec Endpoints
  setupSwagger(app);

  // Root redirect & service info
  app.get('/', (req, res) => {
    if (req.accepts('html')) {
      return res.redirect('/api/docs');
    }
    return res.status(200).json({
      name: 'CrewSync API',
      version: '1.0.0',
      documentation: '/api/docs',
      health: '/api/v1/health',
    });
  });

  app.get('/docs', (_req, res) => res.redirect('/api/docs'));

  // Base API v1 Routes
  app.use('/api/v1', routes);

  // Catch 404
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested route does not exist',
      },
    });
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};

export default createApp;
