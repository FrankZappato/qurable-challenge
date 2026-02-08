/**
 * Custom Error Classes for the Coupon Service
 */

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 400 Bad Request
export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, 'BAD_REQUEST', details);
  }
}

// 401 Unauthorized
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: unknown) {
    super(401, message, 'UNAUTHORIZED', details);
  }
}

// 403 Forbidden
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: unknown) {
    super(403, message, 'FORBIDDEN', details);
  }
}

// 404 Not Found
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: unknown) {
    super(404, message, 'NOT_FOUND', details);
  }
}

// 409 Conflict
export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(409, message, 'CONFLICT', details);
  }
}

// 410 Gone
export class GoneError extends AppError {
  constructor(message: string, details?: unknown) {
    super(410, message, 'GONE', details);
  }
}

// 429 Too Many Requests
export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests', details?: unknown) {
    super(429, message, 'TOO_MANY_REQUESTS', details);
  }
}

// 500 Internal Server Error
export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', details?: unknown) {
    super(500, message, 'INTERNAL_SERVER_ERROR', details);
  }
}

// Specific Coupon Errors
export class CouponAlreadyLockedError extends ConflictError {
  constructor(details?: { lockedUntil?: Date; retryAfterSeconds?: number }) {
    super('This coupon is temporarily locked by another user', details);
    this.code = 'COUPON_ALREADY_LOCKED';
  }
}

export class CouponAlreadyRedeemedError extends ConflictError {
  constructor(details?: { redeemedAt?: Date; redeemCount?: number }) {
    super('This coupon has already been redeemed', details);
    this.code = 'COUPON_ALREADY_REDEEMED';
  }
}

export class CouponQuotaExceededError extends ConflictError {
  constructor(details?: { currentCount?: number; maxAllowed?: number }) {
    super('User has reached maximum coupons limit', details);
    this.code = 'COUPON_QUOTA_EXCEEDED';
  }
}

export class CouponRedeemLimitReachedError extends ConflictError {
  constructor(details?: { currentRedeems?: number; maxRedeems?: number }) {
    super('Maximum redemptions reached for this coupon', details);
    this.code = 'COUPON_REDEEM_LIMIT_REACHED';
  }
}

export class NoAvailableCodesError extends NotFoundError {
  constructor(details?: { bookId?: string }) {
    super('No available coupon codes in this book', details);
    this.code = 'NO_AVAILABLE_CODES';
  }
}

export class LockExpiredError extends GoneError {
  constructor(details?: { lockedUntil?: Date }) {
    super('Lock has expired. Please re-lock the coupon.', details);
    this.code = 'LOCK_EXPIRED';
  }
}
