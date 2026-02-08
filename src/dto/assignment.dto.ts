import { z } from 'zod';

// Assign random code
export const assignRandomCodeSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
  bookId: z.string().uuid('Book ID must be a valid UUID'),
});

export type AssignRandomCodeDTO = z.infer<typeof assignRandomCodeSchema>;

// Assign specific code
export const assignSpecificCodeSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
});

export type AssignSpecificCodeDTO = z.infer<typeof assignSpecificCodeSchema>;

// Assignment response
export interface AssignmentResponseDTO {
  id: string;
  codeId: string;
  code: string;
  userId: string;
  bookId: string;
  bookName: string;
  assignedAt: Date;
}
