import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { CouponCode } from '../entities/CouponCode.entity';
import { CouponCodeStatus } from '../types/enums';

export class CouponCodeRepository {
  private ormRepo: Repository<CouponCode>;

  constructor() {
    this.ormRepo = AppDataSource.getRepository(CouponCode);
  }

  async create(data: Partial<CouponCode>): Promise<CouponCode> {
    const entity = this.ormRepo.create(data);
    return this.ormRepo.save(entity);
  }

  async bulkCreate(data: Partial<CouponCode>[]): Promise<CouponCode[]> {
    const entities = this.ormRepo.create(data);
    return this.ormRepo.save(entities);
  }

  async findById(id: string): Promise<CouponCode | null> {
    return this.ormRepo.findOne({ where: { id } });
  }

  async findByCode(code: string): Promise<CouponCode | null> {
    return this.ormRepo.findOne({ where: { code } });
  }

  async findByCodeAndBook(code: string, bookId: string): Promise<CouponCode | null> {
    return this.ormRepo.findOne({ where: { code, bookId } });
  }

  async findAvailableByBook(bookId: string): Promise<CouponCode[]> {
    return this.ormRepo.find({
      where: { bookId, status: CouponCodeStatus.AVAILABLE },
    });
  }

  async findByBookWithPagination(
    bookId: string,
    status?: CouponCodeStatus,
    limit: number = 100,
    offset: number = 0
  ): Promise<[CouponCode[], number]> {
    const queryBuilder = this.ormRepo
      .createQueryBuilder('code')
      .where('code.book_id = :bookId', { bookId });

    if (status) {
      queryBuilder.andWhere('code.status = :status', { status });
    }

    return queryBuilder
      .orderBy('code.created_at', 'DESC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();
  }

  async findExistingCodes(codes: string[], bookId: string): Promise<CouponCode[]> {
    if (codes.length === 0) return [];
    
    return this.ormRepo
      .createQueryBuilder('code')
      .where('code.book_id = :bookId', { bookId })
      .andWhere('code.code IN (:...codes)', { codes })
      .select(['code.code'])
      .getMany();
  }

  async countByBookAndStatus(bookId: string, status: CouponCodeStatus): Promise<number> {
    return this.ormRepo.count({
      where: { bookId, status },
    });
  }

  async getBookStatistics(bookId: string): Promise<{ status: string; count: number }[]> {
    return this.ormRepo
      .createQueryBuilder('code')
      .select('code.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('code.book_id = :bookId', { bookId })
      .groupBy('code.status')
      .getRawMany();
  }

  async updateStatus(id: string, status: CouponCodeStatus): Promise<void> {
    await this.ormRepo.update(id, { status });
  }

  async save(code: CouponCode): Promise<CouponCode> {
    return this.ormRepo.save(code);
  }

  async delete(id: string): Promise<void> {
    await this.ormRepo.delete(id);
  }
}
