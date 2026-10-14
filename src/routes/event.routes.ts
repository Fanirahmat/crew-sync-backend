import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  eventController,
  createEventSchema,
  assignCrewSchema,
} from '@/controllers/event.controller';
import {
  rundownController,
  createRundownItemSchema,
  reorderRundownSchema,
  updateRundownStatusSchema,
} from '@/controllers/rundown.controller';
import { attendanceController } from '@/controllers/attendance.controller';
import {
  logisticsController,
  createChecklistSchema,
  addChecklistItemSchema,
} from '@/controllers/logistics.controller';
import { upload } from '@/config/storage';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requireTenant } from '@/middlewares/tenant.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { validateRequest } from '@/middlewares/validate.middleware';

const router = Router();

// Apply auth & tenant protection across all event routes
router.use(authenticateJWT);
router.use(requireTenant);

// Events CRUD
router.post(
  '/',
  requireRole([Role.OWNER, Role.PLANNER, Role.COORDINATOR]),
  validateRequest({ body: createEventSchema }),
  eventController.createEvent
);

router.get('/', eventController.getEvents);
router.get('/:id', eventController.getEventById);

// Crew assignments
router.post(
  '/:id/crews',
  requireRole([Role.OWNER, Role.PLANNER, Role.COORDINATOR]),
  validateRequest({ body: assignCrewSchema }),
  eventController.assignCrew
);

router.get('/:id/crews', eventController.getEventCrews);

// Rundown Engine & FCM Broadcast
router.post(
  '/:id/rundown',
  requireRole([Role.OWNER, Role.PLANNER, Role.COORDINATOR]),
  validateRequest({ body: createRundownItemSchema }),
  rundownController.addRundownItem
);

router.get('/:id/rundown', rundownController.getRundowns);

router.patch(
  '/:id/rundown/reorder',
  requireRole([Role.OWNER, Role.PLANNER, Role.COORDINATOR]),
  validateRequest({ body: reorderRundownSchema }),
  rundownController.reorderRundown
);

router.patch(
  '/:id/rundown/:itemId/status',
  requireRole([Role.OWNER, Role.PLANNER, Role.COORDINATOR]),
  validateRequest({ body: updateRundownStatusSchema }),
  rundownController.updateRundownStatus
);

// Crew Attendance (Biometric & Photo with Client Geofence)
router.post(
  '/:id/attendances',
  upload.single('photo'),
  attendanceController.submitAttendance
);

router.get(
  '/:id/attendances',
  attendanceController.getEventAttendances
);

// Logistics Checklists
router.post(
  '/:id/checklists',
  requireRole([Role.OWNER, Role.PLANNER, Role.COORDINATOR]),
  validateRequest({ body: createChecklistSchema }),
  logisticsController.createChecklist
);

router.get(
  '/:id/checklists',
  logisticsController.getEventChecklists
);

router.post(
  '/:id/checklists/:checklistId/items',
  requireRole([Role.OWNER, Role.PLANNER, Role.COORDINATOR]),
  validateRequest({ body: addChecklistItemSchema }),
  logisticsController.addItem
);

export default router;
