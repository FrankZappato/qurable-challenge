import { Router } from 'express';
import { RedemptionController } from '../controllers/redemption.controller';
import { validateRequest } from '../middlewares/validation';
import { lockCouponSchema, unlockCouponSchema } from '../dto/redemption.dto';

const router = Router();
const controller = new RedemptionController();

// Lock a coupon code (temporary)
router.post(
  '/:code/lock',
  validateRequest(lockCouponSchema),
  controller.lockCoupon.bind(controller)
);

// Unlock a coupon code
router.post(
  '/:code/unlock',
  validateRequest(unlockCouponSchema),
  controller.unlockCoupon.bind(controller)
);

// Redeem a coupon code
router.post(
  '/:code/redeem',
  validateRequest(lockCouponSchema),
  controller.redeemCoupon.bind(controller)
);

export default router;
