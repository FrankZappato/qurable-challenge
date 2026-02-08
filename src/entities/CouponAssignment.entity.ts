import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { CouponCode } from './CouponCode.entity';

@Entity('coupon_assignments')
@Index(['userId', 'bookId']) // User's coupons lookup
@Index(['codeId', 'userId'])
@Index(['lockedUntil']) // For cleanup job
export class CouponAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'code_id', type: 'uuid' })
  codeId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'book_id', type: 'uuid' })
  bookId: string;

  // Timestamps for state machine
  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;

  @Column({ name: 'locked_at', type: 'timestamp', nullable: true })
  lockedAt: Date | null;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'redeemed_at', type: 'timestamp', nullable: true })
  redeemedAt: Date | null;

  // Multi-redeem support
  @Column({ name: 'redeem_count', type: 'int', default: 0 })
  redeemCount: number;

  // Relations
  @ManyToOne(() => CouponCode, (code) => code.assignments)
  @JoinColumn({ name: 'code_id' })
  code: CouponCode;

  // Computed properties
  get isLocked(): boolean {
    return (
      this.lockedAt !== null && this.lockedUntil !== null && new Date() < this.lockedUntil
    );
  }

  get isRedeemed(): boolean {
    return this.redeemedAt !== null;
  }
}
