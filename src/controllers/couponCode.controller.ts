import { Request, Response, NextFunction } from 'express';
import { GenerateCodesDTO, UploadCodesDTO, BulkCodeResponseDTO } from '../dto/couponCode.dto';
import { CouponCodeService } from '../services/couponCode.service';

export class CouponCodeController {
  private service: CouponCodeService;

  constructor() {
    this.service = new CouponCodeService();
  }

  // Generate random codes
  async generateCodes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: GenerateCodesDTO = req.body;
      const { bookId, quantity, prefix = '', length = 8 } = dto;

      const result = await this.service.generateCodes(bookId, quantity, prefix, length);

      const response: BulkCodeResponseDTO = {
        codesGenerated: result.codes.length,
        codesSkipped: result.skipped,
        duplicateCodes: [],
        totalCodes: quantity,
        message: `Successfully generated ${result.codes.length} coupon codes`,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  // Upload codes (bulk)
  async uploadCodes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: UploadCodesDTO = req.body;
      const { bookId, codes } = dto;

      const result = await this.service.uploadCodes(bookId, codes);

      const response: BulkCodeResponseDTO = {
        codesGenerated: result.created.length,
        codesSkipped: result.skipped.length,
        duplicateCodes: result.skipped,
        totalCodes: codes.length,
        message: `Successfully uploaded ${result.created.length} coupon codes. ${result.skipped.length} codes were skipped (duplicates or already exist).`,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get codes for a coupon book
  async getCodesByBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bookId } = req.params;
      const { status, limit = 100, offset = 0 } = req.query;

      const result = await this.service.getCodesByBook(
        bookId,
        status as any,
        Number(limit),
        Number(offset)
      );

      res.json({
        data: result.codes,
        pagination: {
          total: result.total,
          limit: Number(limit),
          offset: Number(offset),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
