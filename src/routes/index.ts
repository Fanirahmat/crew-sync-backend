import { Router } from 'express';
import authRoutes from '@/routes/auth.routes';
import eventRoutes from '@/routes/event.routes';
import logisticsRoutes from '@/routes/logistics.routes';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'CrewSync API',
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes
router.use('/auth', authRoutes);

// Events & Crew routes
router.use('/events', eventRoutes);

// Logistics Checklist & Verification routes
router.use('/checklists', logisticsRoutes);
router.use('/logistics', logisticsRoutes);

export default router;
