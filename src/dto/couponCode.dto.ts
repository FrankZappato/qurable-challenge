import { z } from 'zod';

// Generate random codes
export const generateCodesSchema = z.object({
  bookId: z.string().uuid('Book ID must be a valid UUID'),
  quantity: z.number().int().positive().min(1).max(10000),
  prefix: z.string().max(10).optional(),
  length: z.number().int().min(6).max(20).optional().default(8),
});

export type GenerateCodesDTO = z.infer<typeof generateCodesSchema>;

// Upload codes (bulk)
export const uploadCodesSchema = z.object({
  bookId: z.string().uuid('Book ID must be a valid UUID'),
  codes: z.array(z.string().min(1).max(50)).min(1).max(10000),
});

export type UploadCodesDTO = z.infer<typeof uploadCodesSchema>;

// Response DTOs
export interface CodeGeneratedResponseDTO {
  id: string;
  code: string;
  status: string;
  bookId: string;
  createdAt: Date;
}

export interface BulkCodeResponseDTO {
  codesGenerated: number;
  codesSkipped: number;
  duplicateCodes: string[];
  totalCodes: number;
  message: string;
}
