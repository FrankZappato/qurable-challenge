import { AppDataSource } from '../config/database';
import { CacheService } from '../config/redis';
import { config } from '../config/environment';
import { CouponAssignmentRepository } from '../repositories/couponAssignment.repository';
import { CouponCodeRepository } from '../repositories/couponCode.repository';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  CouponAlreadyLockedError,
  CouponAlreadyRedeemedError,
  CouponRedeemLimitReachedError,
} from '../utils/errors';
import { AuditAction, CouponCodeStatus } from '../types/enums';
import { RedemptionAudit } from '../entities/RedemptionAudit.entity';

interface LockData {
  codeId: string;
  userId: string;
  lockedAt: string;
  expiresAt: string;
}

export class RedemptionService {
  private assignmentRepo: CouponAssignmentRepository;
  private codeRepo: CouponCodeRepository;
  private cache: CacheService;
  private lockTtlSeconds: number;

  constructor() {
    this.assignmentRepo = new CouponAssignmentRepository();
    this.codeRepo = new CouponCodeRepository();
    this.cache = new CacheService();
    this.lockTtlSeconds = config.coupon.lockDurationSeconds;
  }

  private getLockKey(codeId: string): string {
    return `coupon:lock:${codeId}`;
  }

  private getRetryAfterSeconds(expiresAt: string): number {
    const expires = new Date(expiresAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.ceil((expires - now) / 1000));
  }

  async lockCoupon(
    code: string,
    userId: string,
    metadata?: Record<string, any>,
    ipAddress?: string | null,
    userAgent?: string | null
  ) {
    const couponCode = await this.codeRepo.findByCode(code);
    if (!couponCode) {
      throw new NotFoundError(`Coupon code '${code}' not found`);
    }

    const assignment = await this.assignmentRepo.findByCodeId(couponCode.id);
    if (!assignment) {
      throw new BadRequestError('This coupon code is not assigned to any user');
    }

    if (assignment.userId !== userId) {
      throw new ForbiddenError('This coupon code is assigned to another user');
    }

    const book = assignment.code.book;
    if (!book) {
      throw new NotFoundError('Associated coupon book not found');
    }

    if (!book.isActive) {
      throw new BadRequestError('The coupon book is not active');
    }

    if (book.isExpired) {
      throw new BadRequestError('The coupon book has expired');
    }

    if (couponCode.status === CouponCodeStatus.REDEEMED) {
      throw new CouponAlreadyRedeemedError();
    }

    if (couponCode.status === CouponCodeStatus.EXPIRED) {
      throw new BadRequestError('This coupon code has expired');
    }

    if (couponCode.status === CouponCodeStatus.AVAILABLE) {
      throw new BadRequestError('This coupon code is not assigned yet');
    }

    const lockKey = this.getLockKey(couponCode.id);
    const lockData = config.features.redisCache ? await this.cache.get<LockData>(lockKey) : null;

    if (couponCode.status === CouponCodeStatus.LOCKED && lockData) {
      if (lockData.userId !== userId) {
        throw new CouponAlreadyLockedError({
          lockedUntil: new Date(lockData.expiresAt),
          retryAfterSeconds: this.getRetryAfterSeconds(lockData.expiresAt),
        });
      }

      return {
        codeId: couponCode.id,
        code: couponCode.code,
        userId,
        status: CouponCodeStatus.LOCKED,
        lockedUntil: lockData.expiresAt,
        lockTtlSeconds: this.lockTtlSeconds,
      };
    }

    if (couponCode.status === CouponCodeStatus.ASSIGNED && lockData) {
      await this.cache.del(lockKey);
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.lockTtlSeconds * 1000);

    try {
      const lockedRow = await queryRunner.manager
        .createQueryBuilder()
        .select('code.id', 'id')
        .addSelect('code.status', 'status')
        .from('coupon_codes', 'code')
        .where('code.id = :id', { id: couponCode.id })
        .setLock('pessimistic_write')
        .getRawOne<{ id: string; status: CouponCodeStatus }>();

      if (!lockedRow) {
        throw new BadRequestError('Coupon code is no longer available');
      }

      if (
        lockedRow.status !== CouponCodeStatus.ASSIGNED &&
        lockedRow.status !== CouponCodeStatus.LOCKED
      ) {
        throw new BadRequestError(
          `Coupon code cannot be locked from status: ${lockedRow.status}`
        );
      }

      await queryRunner.manager.update(
        'coupon_codes',
        { id: couponCode.id },
        { status: CouponCodeStatus.LOCKED }
      );

      if (config.features.auditLogging) {
        await queryRunner.manager.getRepository(RedemptionAudit).save({
          codeId: couponCode.id,
          userId,
          action: AuditAction.LOCK,
          statusBefore: lockedRow.status,
          statusAfter: CouponCodeStatus.LOCKED,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
          metadata: metadata ?? null,
        });
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    if (config.features.redisCache) {
      await this.cache.set<LockData>(lockKey, {
        codeId: couponCode.id,
        userId,
        lockedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      }, this.lockTtlSeconds);
    }

    return {
      codeId: couponCode.id,
      code: couponCode.code,
      userId,
      status: CouponCodeStatus.LOCKED,
      lockedUntil: expiresAt.toISOString(),
      lockTtlSeconds: this.lockTtlSeconds,
    };
  }

  async unlockCoupon(
    code: string,
    userId: string,
    metadata?: Record<string, any>,
    ipAddress?: string | null,
    userAgent?: string | null
  ) {
    const couponCode = await this.codeRepo.findByCode(code);
    if (!couponCode) {
      throw new NotFoundError(`Coupon code '${code}' not found`);
    }

    const assignment = await this.assignmentRepo.findByCodeId(couponCode.id);
    if (!assignment) {
      throw new BadRequestError('This coupon code is not assigned to any user');
    }

    if (assignment.userId !== userId) {
      throw new ForbiddenError('This coupon code is assigned to another user');
    }

    if (couponCode.status === CouponCodeStatus.REDEEMED) {
      throw new CouponAlreadyRedeemedError();
    }

    if (couponCode.status === CouponCodeStatus.EXPIRED) {
      throw new BadRequestError('This coupon code has expired');
    }

    const lockKey = this.getLockKey(couponCode.id);
    const lockData = config.features.redisCache ? await this.cache.get<LockData>(lockKey) : null;

    if (couponCode.status === CouponCodeStatus.ASSIGNED) {
      if (lockData) {
        await this.cache.del(lockKey);
      }

      return {
        codeId: couponCode.id,
        code: couponCode.code,
        userId,
        status: CouponCodeStatus.ASSIGNED,
        unlockedAt: new Date().toISOString(),
      };
    }

    if (couponCode.status !== CouponCodeStatus.LOCKED) {
      throw new BadRequestError(
        `Coupon code cannot be unlocked from status: ${couponCode.status}`
      );
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const now = new Date();

    try {
      const lockedRow = await queryRunner.manager
        .createQueryBuilder()
        .select('code.id', 'id')
        .addSelect('code.status', 'status')
        .from('coupon_codes', 'code')
        .where('code.id = :id', { id: couponCode.id })
        .setLock('pessimistic_write')
        .getRawOne<{ id: string; status: CouponCodeStatus }>();

      if (!lockedRow) {
        throw new BadRequestError('Coupon code is no longer available');
      }

      if (lockedRow.status !== CouponCodeStatus.LOCKED) {
        throw new BadRequestError(
          `Coupon code cannot be unlocked from status: ${lockedRow.status}`
        );
      }

      await queryRunner.manager.update(
        'coupon_codes',
        { id: couponCode.id },
        { status: CouponCodeStatus.ASSIGNED }
      );

      if (config.features.auditLogging) {
        await queryRunner.manager.getRepository(RedemptionAudit).save({
          codeId: couponCode.id,
          userId,
          action: AuditAction.UNLOCK,
          statusBefore: CouponCodeStatus.LOCKED,
          statusAfter: CouponCodeStatus.ASSIGNED,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
          metadata: metadata ?? null,
        });
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    if (config.features.redisCache) {
      await this.cache.del(lockKey);
    }

    return {
      codeId: couponCode.id,
      code: couponCode.code,
      userId,
      status: CouponCodeStatus.ASSIGNED,
      unlockedAt: now.toISOString(),
    };
  }

  async redeemCoupon(
    code: string,
    userId: string,
    metadata?: Record<string, any>,
    ipAddress?: string | null,
    userAgent?: string | null
  ) {
    const couponCode = await this.codeRepo.findByCode(code);
    if (!couponCode) {
      throw new NotFoundError(`Coupon code '${code}' not found`);
    }

    const assignment = await this.assignmentRepo.findByCodeId(couponCode.id);
    if (!assignment) {
      throw new BadRequestError('This coupon code is not assigned to any user');
    }

    if (assignment.userId !== userId) {
      throw new ForbiddenError('This coupon code is assigned to another user');
    }

    const book = assignment.code.book;
    if (!book) {
      throw new NotFoundError('Associated coupon book not found');
    }

    if (!book.isActive) {
      throw new BadRequestError('The coupon book is not active');
    }

    if (book.isExpired) {
      throw new BadRequestError('The coupon book has expired');
    }

    // Check if already fully redeemed
    if (couponCode.status === CouponCodeStatus.REDEEMED) {
      throw new CouponAlreadyRedeemedError({
        redeemedAt: assignment.redeemedAt ?? undefined,
        redeemCount: assignment.redeemCount,
      });
    }

    if (couponCode.status === CouponCodeStatus.EXPIRED) {
      throw new BadRequestError('This coupon code has expired');
    }

    if (couponCode.status === CouponCodeStatus.AVAILABLE) {
      throw new BadRequestError('This coupon code is not assigned yet');
    }

    // Check maxRedeemsPerUser quota
    if (book.maxRedeemsPerUser !== null && assignment.redeemCount >= book.maxRedeemsPerUser) {
      throw new CouponRedeemLimitReachedError({
        currentRedeems: assignment.redeemCount,
        maxRedeems: book.maxRedeemsPerUser,
      });
    }

    const lockKey = this.getLockKey(couponCode.id);
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const now = new Date();
    const statusBefore = couponCode.status;

    try {
      // Lock code row
      const lockedRow = await queryRunner.manager
        .createQueryBuilder()
        .select('code.id', 'id')
        .addSelect('code.status', 'status')
        .from('coupon_codes', 'code')
        .where('code.id = :id', { id: couponCode.id })
        .setLock('pessimistic_write')
        .getRawOne<{ id: string; status: CouponCodeStatus }>();

      if (!lockedRow) {
        throw new BadRequestError('Coupon code is no longer available');
      }

      // Determine final status
      const isFinalRedeem = book.maxRedeemsPerUser === null || assignment.redeemCount + 1 >= book.maxRedeemsPerUser;
      const newStatus = isFinalRedeem ? CouponCodeStatus.REDEEMED : statusBefore;

      // Update code status if final redeem
      if (isFinalRedeem) {
        await queryRunner.manager.update(
          'coupon_codes',
          { id: couponCode.id },
          { status: newStatus }
        );
      }

      // Update assignment with redeem info
      await queryRunner.manager.update(
        'coupon_assignments',
        { id: assignment.id },
        {
          redeemCount: assignment.redeemCount + 1,
          redeemedAt: isFinalRedeem ? now : null,
        }
      );

      if (config.features.auditLogging) {
        await queryRunner.manager.getRepository(RedemptionAudit).save({
          codeId: couponCode.id,
          userId,
          action: AuditAction.REDEEM,
          statusBefore,
          statusAfter: newStatus,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
          metadata: {
            ...metadata,
            redeemCount: assignment.redeemCount + 1,
            maxRedeems: book.maxRedeemsPerUser,
            isFinalRedeem,
          },
        });
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // Clean lock from cache if exists
    if (config.features.redisCache) {
      await this.cache.del(lockKey);
    }

    const isFinalRedeem = book.maxRedeemsPerUser === null || assignment.redeemCount + 1 >= book.maxRedeemsPerUser;

    return {
      codeId: couponCode.id,
      code: couponCode.code,
      userId,
      status: isFinalRedeem ? CouponCodeStatus.REDEEMED : statusBefore,
      redeemCount: assignment.redeemCount + 1,
      maxRedeems: book.maxRedeemsPerUser,
      isFinalRedeem,
      redeemedAt: now.toISOString(),
    };
  }
}
