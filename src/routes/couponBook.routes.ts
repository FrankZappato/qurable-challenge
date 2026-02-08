import { Router } from 'express';
import { CouponBookController } from '../controllers/couponBook.controller';
import { validateRequest } from '../middlewares/validation';
import { createCouponBookSchema, updateCouponBookSchema } from '../dto/couponBook.dto';

const router = Router();
const controller = new CouponBookController();

// POST /api/v1/coupon-books - Create new coupon book
router.post(
  '/',
  validateRequest(createCouponBookSchema),
  controller.create.bind(controller)
);

// GET /api/v1/coupon-books - Get all coupon books
router.get('/', controller.getAll.bind(controller));

// GET /api/v1/coupon-books/:id - Get coupon book by ID
router.get('/:id', controller.getById.bind(controller));

// PATCH /api/v1/coupon-books/:id - Update coupon book
router.patch(
  '/:id',
  validateRequest(updateCouponBookSchema),
  controller.update.bind(controller)
);

export const couponBookRoutes = router;
