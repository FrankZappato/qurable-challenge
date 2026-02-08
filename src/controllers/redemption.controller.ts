import { Request, Response, NextFunction } from 'express';
import { RedemptionService } from '../services/redemption.service';
import { LockCouponDTO, UnlockCouponDTO } from '../dto/redemption.dto';

export class RedemptionController {
  private service: RedemptionService;

  constructor() {
    this.service = new RedemptionService();
  }

  async lockCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.params;
      const dto: LockCouponDTO = req.body;

      const result = await this.service.lockCoupon(
        code,
        dto.userId,
        dto.metadata,
        req.ip,
        req.get('user-agent')
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async unlockCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.params;
      const dto: UnlockCouponDTO = req.body;

      const result = await this.service.unlockCoupon(
        code,
        dto.userId,
        dto.metadata,
        req.ip,
        req.get('user-agent')
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async redeemCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.params;
      const dto: LockCouponDTO = req.body;

      const result = await this.service.redeemCoupon(
        code,
        dto.userId,
        dto.metadata,
        req.ip,
        req.get('user-agent')
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
