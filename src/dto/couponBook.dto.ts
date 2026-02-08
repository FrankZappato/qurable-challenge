import { z } from 'zod';
import { CouponBookStatus } from '../types/enums';

// Create Coupon Book
export const createCouponBookSchema = z.object({
  businessId: z.string().uuid('Business ID must be a valid UUID'),
  name: z.string().min(3, 'Name must be at least 3 characters').max(255),
  description: z.string().optional(),
  maxRedeemsPerUser: z.number().int().positive().nullable().optional(),
  maxCodesPerUser: z.number().int().positive().nullable().optional(),
  totalCodesExpected: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

export type CreateCouponBookDTO = z.infer<typeof createCouponBookSchema>;

// Update Coupon Book
export const updateCouponBookSchema = z.object({
  name: z.string().min(3).max(255).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(CouponBookStatus).optional(),
  expiresAt: z.string().datetime().optional(),
});

export type UpdateCouponBookDTO = z.infer<typeof updateCouponBookSchema>;

// Response DTO
export interface CouponBookResponseDTO {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  status: CouponBookStatus;
  maxRedeemsPerUser: number | null;
  maxCodesPerUser: number | null;
  totalCodesExpected: number | null;
  generatedCount: number;
  availableCount?: number;
  expiresAt?: Date;
  isExpired: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
