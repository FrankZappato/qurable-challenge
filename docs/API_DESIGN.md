# API Design & Implementation Specification

Complete specification for all API endpoints, TypeScript schemas, and critical operations.

## 1. API ENDPOINTS SPECIFICATION

See the full [API_DESIGN_DETAILED.md in the root](../API_DESIGN_DETAILED.md) for:
- Base URL & authentication
- All endpoint specifications
- Request/response examples
- Error handling

### Core Endpoints Summary

**Coupon Books:**
```
POST   /api/v1/coupon-books              Create book
GET    /api/v1/coupon-books/{id}         Get details
PATCH  /api/v1/coupon-books/{id}         Update
```

**Code Management:**
```
POST   /api/v1/coupon-books/{id}/generate    Generate codes
POST   /api/v1/coupon-books/{id}/codes       Upload codes
GET    /api/v1/coupon-books/{id}/codes       List codes
```

**Coupon Operations:**
```
POST   /api/v1/coupons/assign               Assign random
POST   /api/v1/coupons/assign/{code}        Assign specific
POST   /api/v1/coupons/{code}/lock          Lock temporal
POST   /api/v1/coupons/{code}/redeem        Redeem permanent
POST   /api/v1/coupons/{code}/unlock        Unlock
```

**User Management:**
```
GET    /api/v1/users/{userId}/coupons      Get user coupons
```

## 2. TypeScript Schemas & DTOs

All Zod validation schemas with runtime type safety.

## 3. TypeORM Entities

Four core entities:
- `CouponBook` - Book metadata
- `CouponCode` - Individual codes
- `CouponAssignment` - User-code relationships
- `RedemptionAudit` - Audit trail

## 4. Pseudocode - Critical Operations

Three critical operations with detailed pseudocode:

1. **Assign Random Coupon**
   - Business rules validation
   - Fairness & randomness
   - Atomic transaction

2. **Lock Coupon (Temporal)**
   - Pessimistic locking
   - Concurrency prevention
   - Race condition handling

3. **Redeem Coupon (Permanent)**
   - Multi-redeem support
   - Idempotency handling
   - Audit trail

## 5. Load Testing Scenarios

Artillery and K6 configurations for:
- Happy path testing
- Race condition testing
- Load testing (50-200 req/s)
- Sustained load (5 min)

---

**Full specification:** See [../API_DESIGN_DETAILED.md](../API_DESIGN_DETAILED.md)
