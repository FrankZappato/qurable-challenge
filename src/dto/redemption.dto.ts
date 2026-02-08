import { z } from 'zod';

// Lock coupon code
export const lockCouponSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
  metadata: z.record(z.any()).optional(),
});

export type LockCouponDTO = z.infer<typeof lockCouponSchema>;

// Unlock coupon code
export const unlockCouponSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
  metadata: z.record(z.any()).optional(),
});

export type UnlockCouponDTO = z.infer<typeof unlockCouponSchema>;

export interface LockCouponResponseDTO {
  codeId: string;
  code: string;
  userId: string;
  status: string;
  lockedUntil: string;
  lockTtlSeconds: number;
}

export interface UnlockCouponResponseDTO {
  codeId: string;
  code: string;
  userId: string;
  status: string;
  unlockedAt: string;
}
