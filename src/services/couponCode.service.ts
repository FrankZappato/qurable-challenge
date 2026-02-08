import { NotFoundError } from '../utils/errors';
import { CouponCodeStatus } from '../types/enums';
import { generateUniqueCodes, findDuplicates, removeDuplicates } from '../utils/codeGenerator';
import { CouponCodeRepository } from '../repositories/couponCode.repository';
import { CouponBookRepository } from '../repositories/couponBook.repository';

export class CouponCodeService {
  private codeRepo: CouponCodeRepository;
  private bookRepo: CouponBookRepository;

  constructor() {
    this.codeRepo = new CouponCodeRepository();
    this.bookRepo = new CouponBookRepository();
  }

  /**
   * Generate random coupon codes for a book
   */
  async generateCodes(
    bookId: string,
    quantity: number,
    prefix: string = '',
    length: number = 8
  ): Promise<{ codes: any[]; skipped: number }> {
    // Verify book exists
    const book = await this.bookRepo.findById(bookId);
    if (!book) {
      throw new NotFoundError(`Coupon book with ID ${bookId} not found`);
    }

    // Generate unique codes
    const codeStrings = generateUniqueCodes(quantity, length, prefix);

    // Check for existing codes in DB
    const existingCodes = await this.codeRepo.findExistingCodes(codeStrings, bookId);
    const existingCodeSet = new Set(existingCodes.map(c => c.code));

    // Filter out existing codes
    const newCodeStrings = codeStrings.filter(code => !existingCodeSet.has(code));
    const skipped = codeStrings.length - newCodeStrings.length;

    // Create entities
    const codesData = newCodeStrings.map(code => ({
      code,
      bookId,
      status: CouponCodeStatus.AVAILABLE,
    }));

    // Save codes
    let codes: any[] = [];
    if (codesData.length > 0) {
      codes = await this.codeRepo.bulkCreate(codesData);
      
      // Update book count
      await this.bookRepo.incrementGeneratedCount(bookId, codes.length);
    }

    return { codes, skipped };
  }

  /**
   * Upload bulk codes
   */
  async uploadCodes(
    bookId: string,
    codes: string[]
  ): Promise<{ created: any[]; skipped: string[]; duplicatesInInput: string[] }> {
    // Verify book exists
    const book = await this.bookRepo.findById(bookId);
    if (!book) {
      throw new NotFoundError(`Coupon book with ID ${bookId} not found`);
    }

    // Find duplicates in input
    const duplicatesInInput = findDuplicates(codes);
    const uniqueCodes = removeDuplicates(codes);

    // Get existing codes in DB
    const existingCodes = await this.codeRepo.findExistingCodes(uniqueCodes, bookId);
    const existingCodeSet = new Set(existingCodes.map(c => c.code));

    // Separate new codes from existing
    const newCodesData: any[] = [];
    const skipped: string[] = [];

    for (const code of uniqueCodes) {
      const normalizedCode = code.toUpperCase();
      
      if (existingCodeSet.has(normalizedCode)) {
        skipped.push(code);
      } else {
        newCodesData.push({
          code: normalizedCode,
          bookId,
          status: CouponCodeStatus.AVAILABLE,
        });
      }
    }

    // Save new codes
    let created: any[] = [];
    if (newCodesData.length > 0) {
      created = await this.codeRepo.bulkCreate(newCodesData);
      
      // Update book count
      await this.bookRepo.incrementGeneratedCount(bookId, created.length);
    }

    return {
      created,
      skipped,
      duplicatesInInput,
    };
  }

  /**
   * Get codes for a specific book with pagination and filtering
   */
  async getCodesByBook(
    bookId: string,
    status?: CouponCodeStatus,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ codes: any[]; total: number }> {
    // Verify book exists
    const book = await this.bookRepo.findById(bookId);
    if (!book) {
      throw new NotFoundError(`Coupon book with ID ${bookId} not found`);
    }

    const [codes, total] = await this.codeRepo.findByBookWithPagination(
      bookId,
      status,
      limit,
      offset
    );

    return { codes, total };
  }

  /**
   * Get statistics for a coupon book
   */
  async getBookStatistics(bookId: string): Promise<{
    total: number;
    available: number;
    assigned: number;
    locked: number;
    redeemed: number;
    expired: number;
  }> {
    const stats = await this.codeRepo.getBookStatistics(bookId);

    const result = {
      total: 0,
      available: 0,
      assigned: 0,
      locked: 0,
      redeemed: 0,
      expired: 0,
    };

    stats.forEach(({ status, count }) => {
      const countNum = parseInt(count.toString(), 10);
      result.total += countNum;
      
      switch (status) {
        case CouponCodeStatus.AVAILABLE:
          result.available = countNum;
          break;
        case CouponCodeStatus.ASSIGNED:
          result.assigned = countNum;
          break;
        case CouponCodeStatus.LOCKED:
          result.locked = countNum;
          break;
        case CouponCodeStatus.REDEEMED:
          result.redeemed = countNum;
          break;
        case CouponCodeStatus.EXPIRED:
          result.expired = countNum;
          break;
      }
    });

    return result;
  }
}
