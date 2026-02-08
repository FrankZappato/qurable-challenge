import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CouponCode } from './CouponCode.entity';
import { CouponBookStatus } from '../types/enums';

@Entity('coupon_books')
export class CouponBook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Configuration (flexible parameters)
  @Column({
    name: 'max_redeems_per_user',
    type: 'int',
    nullable: true,
    comment: 'null = unlimited, 1 = single use, N = reusable N times',
  })
  maxRedeemsPerUser: number | null;

  @Column({
    name: 'max_codes_per_user',
    type: 'int',
    nullable: true,
    comment: 'null = unlimited, N = max codes per user',
  })
  maxCodesPerUser: number | null;

  // State
  @Column({
    type: 'enum',
    enum: CouponBookStatus,
    default: CouponBookStatus.DRAFT,
  })
  status: CouponBookStatus;

  @Column({ name: 'total_codes_expected', type: 'int', nullable: true })
  totalCodesExpected: number | null;

  @Column({ name: 'generated_count', type: 'int', default: 0 })
  generatedCount: number;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  // Relations
  @OneToMany(() => CouponCode, (code) => code.book)
  codes: CouponCode[];

  // Computed properties
  get isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  get isActive(): boolean {
    return this.status === CouponBookStatus.ACTIVE && !this.isExpired;
  }
}
