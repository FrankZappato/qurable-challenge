export enum CouponBookStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export enum CouponCodeStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  LOCKED = 'LOCKED',
  REDEEMED = 'REDEEMED',
  EXPIRED = 'EXPIRED',
}

export enum AuditAction {
  ASSIGN = 'ASSIGN',
  LOCK = 'LOCK',
  UNLOCK = 'UNLOCK',
  REDEEM = 'REDEEM',
  EXPIRE = 'EXPIRE',
}
