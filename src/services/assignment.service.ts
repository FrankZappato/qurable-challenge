import { CouponAssignmentRepository } from '../repositories/couponAssignment.repository';
import { CouponCodeRepository } from '../repositories/couponCode.repository';
import { CouponBookRepository } from '../repositories/couponBook.repository';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { CouponCodeStatus } from '../types/enums';
import { AppDataSource } from '../config/database';

export class AssignmentService {
  private assignmentRepo: CouponAssignmentRepository;
  private codeRepo: CouponCodeRepository;
  private bookRepo: CouponBookRepository;

  constructor() {
    this.assignmentRepo = new CouponAssignmentRepository();
    this.codeRepo = new CouponCodeRepository();
    this.bookRepo = new CouponBookRepository();
  }

  /**
   * Assign a random available code from a book to a user
   */
  async assignRandomCode(userId: string, bookId: string) {
    // Verify book exists and is active
    const book = await this.bookRepo.findById(bookId);
    if (!book) {
      throw new NotFoundError(`Coupon book with ID ${bookId} not found`);
    }

    if (!book.isActive) {
      throw new BadRequestError('This coupon book is not active');
    }

    if (book.isExpired) {
      throw new BadRequestError('This coupon book has expired');
    }

    // Check user quota - maxCodesPerUser
    if (book.maxCodesPerUser !== null) {
      const userCodesCount = await this.assignmentRepo.countByUserAndBook(userId, bookId);
      if (userCodesCount >= book.maxCodesPerUser) {
        throw new BadRequestError(
          `User has reached the maximum limit of ${book.maxCodesPerUser} codes for this book`
        );
      }
    }

    // Find a random available code (with locking to prevent race conditions)
    const availableCodes = await this.codeRepo.findAvailableByBook(bookId);
    
    if (availableCodes.length === 0) {
      throw new BadRequestError('No available codes in this book');
    }

    // Pick random code
    const randomIndex = Math.floor(Math.random() * availableCodes.length);
    const selectedCode = availableCodes[randomIndex];

    // Use transaction to ensure atomicity
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock the code row for update (pessimistic locking)
      const lockedCode = await queryRunner.manager
        .createQueryBuilder()
        .select('code')
        .from('coupon_codes', 'code')
        .where('code.id = :id', { id: selectedCode.id })
        .andWhere('code.status = :status', { status: CouponCodeStatus.AVAILABLE })
        .setLock('pessimistic_write')
        .getRawOne();

      if (!lockedCode) {
        throw new BadRequestError('Selected code is no longer available');
      }

      // Update code status to ASSIGNED
      await queryRunner.manager.update(
        'coupon_codes',
        { id: selectedCode.id },
        { status: CouponCodeStatus.ASSIGNED }
      );

      // Create assignment record
      const assignmentData = {
        codeId: selectedCode.id,
        userId,
        bookId: book.id,
        assignedAt: new Date(),
      };
      
      const assignment = await queryRunner.manager
        .getRepository('coupon_assignments')
        .save(assignmentData);

      await queryRunner.commitTransaction();

      // Return with relations
      return {
        id: assignment.id,
        codeId: selectedCode.id,
        code: selectedCode.code,
        userId,
        bookId,
        bookName: book.name,
        assignedAt: assignment.assignedAt,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Assign a specific code to a user
   */
  async assignSpecificCode(code: string, userId: string) {
    // Find the code
    const couponCode = await this.codeRepo.findByCode(code);
    if (!couponCode) {
      throw new NotFoundError(`Coupon code '${code}' not found`);
    }

    // Check if already assigned
    if (couponCode.status !== CouponCodeStatus.AVAILABLE) {
      throw new BadRequestError(`Coupon code '${code}' is not available (status: ${couponCode.status})`);
    }

    // Get book to validate
    const book = await this.bookRepo.findById(couponCode.bookId);
    if (!book) {
      throw new NotFoundError('Associated coupon book not found');
    }

    if (!book.isActive) {
      throw new BadRequestError('The coupon book is not active');
    }

    if (book.isExpired) {
      throw new BadRequestError('The coupon book has expired');
    }

    // Check user quota
    if (book.maxCodesPerUser !== null) {
      const userCodesCount = await this.assignmentRepo.countByUserAndBook(userId, couponCode.bookId);
      if (userCodesCount >= book.maxCodesPerUser) {
        throw new BadRequestError(
          `User has reached the maximum limit of ${book.maxCodesPerUser} codes for this book`
        );
      }
    }

    // Use transaction
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock the code row
      const lockedCode = await queryRunner.manager
        .createQueryBuilder()
        .select('code')
        .from('coupon_codes', 'code')
        .where('code.id = :id', { id: couponCode.id })
        .andWhere('code.status = :status', { status: CouponCodeStatus.AVAILABLE })
        .setLock('pessimistic_write')
        .getRawOne();

      if (!lockedCode) {
        throw new BadRequestError('Code is no longer available');
      }

      // Update code status
      await queryRunner.manager.update(
        'coupon_codes',
        { id: couponCode.id },
        { status: CouponCodeStatus.ASSIGNED }
      );

      // Create assignment
      const assignmentData = {
        codeId: couponCode.id,
        userId,
        bookId: couponCode.bookId,
        assignedAt: new Date(),
      };
      
      const assignment = await queryRunner.manager
        .getRepository('coupon_assignments')
        .save(assignmentData);

      await queryRunner.commitTransaction();

      return {
        id: assignment.id,
        codeId: couponCode.id,
        code: couponCode.code,
        userId,
        bookId: couponCode.bookId,
        bookName: book.name,
        assignedAt: assignment.assignedAt,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get all assignments for a user
   */
  async getUserAssignments(userId: string) {
    const assignments = await this.assignmentRepo.findUserAssignments(userId);
    
    return assignments.map(assignment => ({
      id: assignment.id,
      codeId: assignment.codeId,
      code: assignment.code.code,
      userId: assignment.userId,
      bookId: assignment.code.bookId,
      bookName: assignment.code.book.name,
      assignedAt: assignment.assignedAt,
    }));
  }
}
