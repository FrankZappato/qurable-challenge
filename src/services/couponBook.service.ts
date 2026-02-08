import { NotFoundError } from '../utils/errors';
import { CreateCouponBookDTO, UpdateCouponBookDTO } from '../dto/couponBook.dto';
import { CouponBookStatus } from '../types/enums';
import { CouponBookRepository } from '../repositories/couponBook.repository';
import { CouponCodeRepository } from '../repositories/couponCode.repository';
import { CouponBook } from '../entities/CouponBook.entity';

export class CouponBookService {
  private bookRepo: CouponBookRepository;
  private codeRepo: CouponCodeRepository;

  constructor() {
    this.bookRepo = new CouponBookRepository();
    this.codeRepo = new CouponCodeRepository();
  }

  async create(dto: CreateCouponBookDTO): Promise<CouponBook> {
    const bookData = {
      businessId: dto.businessId,
      name: dto.name,
      description: dto.description,
      maxRedeemsPerUser: dto.maxRedeemsPerUser ?? null,
      maxCodesPerUser: dto.maxCodesPerUser ?? null,
      totalCodesExpected: dto.totalCodesExpected ?? null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      status: CouponBookStatus.DRAFT,
    };

    return await this.bookRepo.create(bookData);
  }

  async getAll(filters?: { businessId?: string; status?: CouponBookStatus }): Promise<CouponBook[]> {
    return await this.bookRepo.findAll(filters);
  }

  async getById(id: string): Promise<CouponBook> {
    const book = await this.bookRepo.findById(id);

    if (!book) {
      throw new NotFoundError(`Coupon book with ID ${id} not found`);
    }

    return book;
  }

  async update(id: string, dto: UpdateCouponBookDTO): Promise<CouponBook> {
    const book = await this.getById(id);

    // Update fields
    if (dto.name) book.name = dto.name;
    if (dto.description !== undefined) book.description = dto.description;
    if (dto.status) book.status = dto.status;
    if (dto.expiresAt) book.expiresAt = new Date(dto.expiresAt);

    return await this.bookRepo.save(book);
  }

  async getStatistics(id: string) {
    const book = await this.getById(id);
    
    const stats = await this.codeRepo.getBookStatistics(id);

    return {
      book,
      codeStatistics: stats.reduce((acc: any, row: any) => {
        acc[row.status] = parseInt(row.count.toString());
        return acc;
      }, {}),
    };
  }
}
