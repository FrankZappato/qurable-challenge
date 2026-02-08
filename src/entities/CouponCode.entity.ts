import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { CouponBook } from './CouponBook.entity';
import { CouponAssignment } from './CouponAssignment.entity';
import { CouponCodeStatus } from '../types/enums';

@Entity('coupon_codes')
@Index(['bookId', 'status']) // Critical for findAvailable queries
@Index(['code'], { unique: true })
export class CouponCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'book_id', type: 'uuid' })
  bookId: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({
    type: 'enum',
    enum: CouponCodeStatus,
    default: CouponCodeStatus.AVAILABLE,
  })
  @Index() // For status filtering
  status: CouponCodeStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => CouponBook, (book) => book.codes)
  @JoinColumn({ name: 'book_id' })
  book: CouponBook;

  @OneToMany(() => CouponAssignment, (assignment) => assignment.code)
  assignments: CouponAssignment[];
}
