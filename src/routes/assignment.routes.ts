import { Router } from 'express';
import { AssignmentController } from '../controllers/assignment.controller';
import { validateRequest } from '../middlewares/validation';
import { assignRandomCodeSchema, assignSpecificCodeSchema } from '../dto/assignment.dto';

const router = Router();
const controller = new AssignmentController();

// Assign random code from a book
router.post(
  '/random',
  validateRequest(assignRandomCodeSchema),
  controller.assignRandomCode.bind(controller)
);

// Assign specific code to user
router.post(
  '/:code',
  validateRequest(assignSpecificCodeSchema),
  controller.assignSpecificCode.bind(controller)
);

// Get user assignments
router.get(
  '/user/:userId',
  controller.getUserAssignments.bind(controller)
);

export default router;
