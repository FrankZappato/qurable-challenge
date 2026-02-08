import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { CouponBook } from '../entities/CouponBook.entity';
import { CouponBookStatus } from '../types/enums';

export class CouponBookRepository {
  private ormRepo: Repository<CouponBook>;

  constructor() {
    this.ormRepo = AppDataSource.getRepository(CouponBook);
  }

  async create(data: Partial<CouponBook>): Promise<CouponBook> {
    const entity = this.ormRepo.create(data);
    return this.ormRepo.save(entity);
  }

  async findById(id: string): Promise<CouponBook | null> {
    return this.ormRepo.findOne({ where: { id } });
  }

  async findAll(filters?: { businessId?: string; status?: CouponBookStatus }): Promise<CouponBook[]> {
    const queryBuilder = this.ormRepo.createQueryBuilder('book');

    if (filters?.businessId) {
      queryBuilder.andWhere('book.business_id = :businessId', { businessId: filters.businessId });
    }

    if (filters?.status) {
      queryBuilder.andWhere('book.status = :status', { status: filters.status });
    }

    return queryBuilder.orderBy('book.created_at', 'DESC').getMany();
  }

  async findActiveByBusiness(businessId: string): Promise<CouponBook[]> {
    return this.ormRepo.find({
      where: { 
        businessId, 
        status: CouponBookStatus.ACTIVE 
      },
    });
  }

  async findExpiredBooks(): Promise<CouponBook[]> {
    return this.ormRepo
      .createQueryBuilder('book')
      .where('book.expires_at IS NOT NULL')
      .andWhere('book.expires_at < NOW()')
      .getMany();
  }

  async incrementGeneratedCount(id: string, amount: number): Promise<void> {
    await this.ormRepo.increment({ id }, 'generatedCount', amount);
  }

  async save(book: CouponBook): Promise<CouponBook> {
    return this.ormRepo.save(book);
  }

  async update(id: string, data: Partial<CouponBook>): Promise<void> {
    await this.ormRepo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.ormRepo.delete(id);
  }
}
