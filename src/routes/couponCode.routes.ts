import { Router } from 'express';
import { CouponCodeController } from '../controllers/couponCode.controller';
import { validateRequest } from '../middlewares/validation';
import { generateCodesSchema, uploadCodesSchema } from '../dto/couponCode.dto';

const router = Router();
const controller = new CouponCodeController();

// POST /api/v1/coupon-codes/generate - Generate random codes
router.post(
  '/generate',
  validateRequest(generateCodesSchema),
  controller.generateCodes.bind(controller)
);

// POST /api/v1/coupon-codes/upload - Upload codes (bulk)
router.post(
  '/upload',
  validateRequest(uploadCodesSchema),
  controller.uploadCodes.bind(controller)
);

// GET /api/v1/coupon-codes/book/:bookId - Get codes for a book
router.get('/book/:bookId', controller.getCodesByBook.bind(controller));

export const couponCodeRoutes = router;
