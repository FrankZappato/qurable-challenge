import { Request, Response, NextFunction } from 'express';
import { CreateCouponBookDTO, UpdateCouponBookDTO, CouponBookResponseDTO } from '../dto/couponBook.dto';
import { CouponBookService } from '../services/couponBook.service';

export class CouponBookController {
  private service: CouponBookService;

  constructor() {
    this.service = new CouponBookService();
  }

  // Create new coupon book
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: CreateCouponBookDTO = req.body;
      const book = await this.service.create(dto);

      const response: CouponBookResponseDTO = {
        id: book.id,
        businessId: book.businessId,
        name: book.name,
        description: book.description ?? undefined,
        status: book.status,
        maxRedeemsPerUser: book.maxRedeemsPerUser,
        maxCodesPerUser: book.maxCodesPerUser,
        totalCodesExpected: book.totalCodesExpected,
        generatedCount: book.generatedCount,
        expiresAt: book.expiresAt ?? undefined,
        isExpired: book.isExpired,
        isActive: book.isActive,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get all coupon books
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId, status } = req.query;

      const filters: any = {};
      if (businessId) filters.businessId = businessId;
      if (status) filters.status = status;

      const books = await this.service.getAll(filters);

      const response: CouponBookResponseDTO[] = books.map(book => ({
        id: book.id,
        businessId: book.businessId,
        name: book.name,
        description: book.description ?? undefined,
        status: book.status,
        maxRedeemsPerUser: book.maxRedeemsPerUser,
        maxCodesPerUser: book.maxCodesPerUser,
        totalCodesExpected: book.totalCodesExpected,
        generatedCount: book.generatedCount,
        expiresAt: book.expiresAt ?? undefined,
        isExpired: book.isExpired,
        isActive: book.isActive,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
      }));

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get coupon book by ID
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const book = await this.service.getById(id);

      const response: CouponBookResponseDTO = {
        id: book.id,
        businessId: book.businessId,
        name: book.name,
        description: book.description ?? undefined,
        status: book.status,
        maxRedeemsPerUser: book.maxRedeemsPerUser,
        maxCodesPerUser: book.maxCodesPerUser,
        totalCodesExpected: book.totalCodesExpected,
        generatedCount: book.generatedCount,
        expiresAt: book.expiresAt ?? undefined,
        isExpired: book.isExpired,
        isActive: book.isActive,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Update coupon book
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateCouponBookDTO = req.body;
      const book = await this.service.update(id, dto);

      const response: CouponBookResponseDTO = {
        id: book.id,
        businessId: book.businessId,
        name: book.name,
        description: book.description ?? undefined,
        status: book.status,
        maxRedeemsPerUser: book.maxRedeemsPerUser,
        maxCodesPerUser: book.maxCodesPerUser,
        totalCodesExpected: book.totalCodesExpected,
        generatedCount: book.generatedCount,
        expiresAt: book.expiresAt ?? undefined,
        isExpired: book.isExpired,
        isActive: book.isActive,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}
