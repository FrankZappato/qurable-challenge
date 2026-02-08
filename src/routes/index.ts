import { Router } from 'express';
import { couponBookRoutes } from './couponBook.routes';
import { couponCodeRoutes } from './couponCode.routes';
import assignmentRoutes from './assignment.routes';
import redemptionRoutes from './redemption.routes';

export const apiRoutes = Router();

// Health check
apiRoutes.get('/ping', (_req, res) => {
  res.json({ message: 'pong', timestamp: new Date().toISOString() });
});

// Coupon Books routes
apiRoutes.use('/coupon-books', couponBookRoutes);

// Coupon Codes routes
apiRoutes.use('/coupon-codes', couponCodeRoutes);

// Assignment routes
apiRoutes.use('/assignments', assignmentRoutes);

// Coupon lock/unlock routes
apiRoutes.use('/coupons', redemptionRoutes);
