# 4-Day Development Roadmap

Complete implementation plan for the Qurable Coupon Service challenge.

## Overview

Deliver a production-ready Coupon Book Service in 4 days with:
- Core features fully functional
- Race condition handling implemented
- Professional documentation
- Demo-ready code

## Day Breakdown

### Day 1: Foundation + API Design (8 hours)
**Morning:**
- [x] Setup project (TypeScript, Express, Docker)
- [x] Database schema design (TypeORM entities)
- [x] Configuration & environment setup
- [x] Infrastructure setup (Docker Compose)

**Afternoon:**
- [ ] API endpoints specification
- [ ] DTOs with Zod validation
- [ ] Project structure finalization

### Day 2: Core Features Part 1 (8 hours)
- [ ] Coupon Book Creation
- [ ] Code Generation (pattern-based)
- [ ] Code Upload (CSV/JSON)
- [ ] Unit tests

### Day 3: Core Features Part 2 - CRITICAL (8 hours)
- [ ] Assignment (random + specific)
- [ ] Lock Temporal (race-condition safe)
- [ ] Redeem Permanent (with auditing)
- [ ] Integration tests

### Day 4: Polish + Demo (8 hours)
- [ ] Get User Coupons endpoint
- [ ] Statistics & reporting
- [ ] Cleanup jobs
- [ ] Documentation finalization
- [ ] Demo preparation

## Scope Management

### MUST HAVE (Core)
- ✅ Create coupon books
- ✅ Generate/upload codes
- ✅ Assign coupons
- ✅ Lock temporal
- ✅ Redeem permanent
- ✅ Audit trail

### SHOULD HAVE (Quality)
- ✅ API documentation (Swagger)
- ✅ Unit tests
- ✅ Error handling
- ✅ Logging

### NICE TO HAVE (If time)
- ⬜ Redis caching
- ⬜ Rate limiting
- ⬜ Idempotency keys
- ⬜ Load testing

## Key Success Factors

1. **Priorize Demostrability** → Working features > Perfect code
2. **Stick to Scope** → No feature creep
3. **Timeboxing Strict** → Max 2-3h per feature
4. **Documentation While Coding** → Not at the end

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Lock implementation complex | Implement Day 3 AM with buffer time |
| Concurrency testing difficult | 1 simple test, not exhaustive |
| Scope creep | Strict feature list |
| Docker issues | Cloud alternatives ready |

---

**Status:** Roadmap ready, Day 1 morning complete, awaiting infrastructure setup.

See [NEXT_STEPS.md](./NEXT_STEPS.md) for immediate actions.
