import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { RedemptionAudit } from '../entities/RedemptionAudit.entity';

export class RedemptionAuditRepository {
  private ormRepo: Repository<RedemptionAudit>;

  constructor() {
    this.ormRepo = AppDataSource.getRepository(RedemptionAudit);
  }

  async create(data: Partial<RedemptionAudit>): Promise<RedemptionAudit> {
    const entity = this.ormRepo.create(data);
    return this.ormRepo.save(entity);
  }
}
