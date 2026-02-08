import { Request, Response, NextFunction } from 'express';
import { AssignmentService } from '../services/assignment.service';
import { AssignRandomCodeDTO, AssignSpecificCodeDTO } from '../dto/assignment.dto';

export class AssignmentController {
  private service: AssignmentService;

  constructor() {
    this.service = new AssignmentService();
  }

  // Assign random code from a book
  async assignRandomCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: AssignRandomCodeDTO = req.body;
      const result = await this.service.assignRandomCode(dto.userId, dto.bookId);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Assign specific code to user
  async assignSpecificCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.params;
      const dto: AssignSpecificCodeDTO = req.body;
      const result = await this.service.assignSpecificCode(code, dto.userId);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get user's assignments
  async getUserAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const result = await this.service.getUserAssignments(userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
