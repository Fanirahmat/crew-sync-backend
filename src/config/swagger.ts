import { Application, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import fs from 'fs';

export const setupSwagger = (app: Application): void => {
  const swaggerYamlPath = path.resolve(process.cwd(), 'docs/openapi.yaml');

  if (!fs.existsSync(swaggerYamlPath)) {
    console.warn(`⚠️ OpenAPI spec file not found at ${swaggerYamlPath}. Skipping Swagger UI setup.`);
    return;
  }

  try {
    const swaggerDocument = YAML.load(swaggerYamlPath);

    const swaggerOptions: swaggerUi.SwaggerOptions = {
      customSiteTitle: 'CrewSync API Documentation',
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin: 20px 0; }
        .swagger-ui .info .title { font-size: 32px; color: #1e293b; }
      `,
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        filter: true,
      },
    };

    // Serve interactive Swagger UI
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));

    // Serve raw specification formats (JSON & YAML)
    app.get('/api/docs.json', (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerDocument);
    });

    app.get('/api/docs.yaml', (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'text/yaml');
      res.sendFile(swaggerYamlPath);
    });

    console.log('📖 Swagger UI documentation available at /api/docs');
  } catch (error) {
    console.error('❌ Failed to load OpenAPI documentation:', error);
  }
};
