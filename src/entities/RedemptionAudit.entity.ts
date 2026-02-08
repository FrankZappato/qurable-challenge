import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { AuditAction } from '../types/enums';

@Entity('redemption_audit')
@Index(['codeId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class RedemptionAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'code_id', type: 'uuid' })
  codeId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({ name: 'status_before', type: 'varchar', length: 50, nullable: true })
  statusBefore?: string;

  @Column({ name: 'status_after', type: 'varchar', length: 50 })
  statusAfter: string;

  // Metadata
  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
