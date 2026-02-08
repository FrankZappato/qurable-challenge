import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { CouponAssignment } from '../entities/CouponAssignment.entity';

export class CouponAssignmentRepository {
  private ormRepo: Repository<CouponAssignment>;

  constructor() {
    this.ormRepo = AppDataSource.getRepository(CouponAssignment);
  }

  async create(data: Partial<CouponAssignment>): Promise<CouponAssignment> {
    const entity = this.ormRepo.create(data);
    return this.ormRepo.save(entity);
  }

  async findById(id: string): Promise<CouponAssignment | null> {
    return this.ormRepo.findOne({ 
      where: { id },
      relations: ['code', 'code.book']
    });
  }

  async findByCodeId(codeId: string): Promise<CouponAssignment | null> {
    return this.ormRepo.findOne({ 
      where: { codeId },
      relations: ['code', 'code.book']
    });
  }

  async findByUserAndBook(userId: string, bookId: string): Promise<CouponAssignment[]> {
    return this.ormRepo
      .createQueryBuilder('assignment')
      .innerJoin('assignment.code', 'code')
      .where('assignment.user_id = :userId', { userId })
      .andWhere('code.book_id = :bookId', { bookId })
      .getMany();
  }

  async countByUserAndBook(userId: string, bookId: string): Promise<number> {
    return this.ormRepo
      .createQueryBuilder('assignment')
      .innerJoin('assignment.code', 'code')
      .where('assignment.user_id = :userId', { userId })
      .andWhere('code.book_id = :bookId', { bookId })
      .getCount();
  }

  async findUserAssignments(userId: string): Promise<CouponAssignment[]> {
    return this.ormRepo.find({
      where: { userId },
      relations: ['code', 'code.book'],
      order: { assignedAt: 'DESC' }
    });
  }

  async delete(id: string): Promise<void> {
    await this.ormRepo.delete(id);
  }

  async save(assignment: CouponAssignment): Promise<CouponAssignment> {
    return this.ormRepo.save(assignment);
  }
}
