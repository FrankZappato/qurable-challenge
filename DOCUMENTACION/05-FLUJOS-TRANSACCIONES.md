# 🔄 Flujos y Transacciones

## Flujo 1: Crear Campaña y Generar Códigos

```
Timeline: Minutos

[NEGOCIO]
   │
   ├─► POST /coupon-books
   │   {
   │     "name": "Verano 2026",
   │     "maxCodesPerUser": 2,
   │     "maxRedeemsPerUser": 1
   │   }
   │
   ├─ CONTROLLER: CouponBookController.create()
   │  └─ SERVICE: CouponBookService.create(dto)
   │     └─ REPO: CouponBookRepository.create(data)
   │        └─ DB: INSERT coupon_books
   │           → id: "76fafd1e..."
   │           → status: "DRAFT"
   │
   └─◄ 201 Created
       {
         "id": "76fafd1e...",
         "status": "DRAFT",
         "generatedCount": 0
       }

[NEGOCIO ACTIVA LA CAMPAÑA]
   │
   ├─► PATCH /coupon-books/:id
   │   { "status": "ACTIVE" }
   │
   ├─ CONTROLLER: update()
   │  └─ SERVICE: update(id, dto)
   │     └─ REPO: save(book)
   │        └─ DB: UPDATE coupon_books SET status = 'ACTIVE'
   │
   └─◄ 200 OK
       { "status": "ACTIVE" }

[NEGOCIO GENERA 1000 CÓDIGOS]
   │
   ├─► POST /coupon-codes/generate
   │   {
   │     "bookId": "76fafd1e...",
   │     "quantity": 1000,
   │     "prefix": "SUMMER2026",
   │     "length": 6
   │   }
   │
   ├─ CONTROLLER: generateCodes()
   │  └─ SERVICE: generateCodes(bookId, 1000, "SUMMER2026", 6)
   │     │
   │     ├─ Verificar: book existe ✓
   │     ├─ Generar: 1000 códigos aleatorios
   │     │  "SUMMER2026ABC123"
   │     │  "SUMMER2026XYZ789"
   │     │  ... (998 más)
   │     │
   │     └─ REPO: bulkCreate(codesArray)
   │        └─ DB: INSERT coupon_codes (1 query, no 1000)
   │           SET status = 'AVAILABLE'
   │
   │     ├─ REPO: incrementGeneratedCount("76fafd1e...", 1000)
   │     │  └─ DB: UPDATE coupon_books
   │     │         SET generated_count = generated_count + 1000
   │     │
   │     └─ Return stats
   │
   └─◄ 201 Created
       {
         "codesGenerated": 1000,
         "codesSkipped": 0,
         "message": "Successfully generated 1000 coupon codes"
       }

[BASE DE DATOS AHORA TIENE]
   coupon_books:
   ├─ id: "76fafd1e..."
   ├─ name: "Verano 2026"
   ├─ status: "ACTIVE"
   └─ generated_count: 1000

   coupon_codes: (1000 rows)
   ├─ id: "aaaaaaaa..."
   ├─ book_id: "76fafd1e..."
   ├─ code: "SUMMER2026ABC123"
   ├─ status: "AVAILABLE"
   └─ ... (999 más)
```

---

## Flujo 2: Asignar Código a Usuario (CON Race Conditions)

```
Timeline: Milisegundos

SCENARIO: Dos usuarios (A, B) intentan asignar el MISMO código simultáneamente

[USUARIO A]                          [USUARIO B]
   │                                    │
   ├─► POST /assignments/random         │
   │   { userId: "A", bookId: "..." }   │
   │                                    ├─► POST /assignments/random
   │   GetAvailableCodes()              │   { userId: "B", bookId: "..." }
   │   → ["SUMMER2026ABC123", ...]      │
   │                                    │   GetAvailableCodes()
   │   PickRandom()                     │   → ["SUMMER2026ABC123", ...]
   │   → "SUMMER2026ABC123"             │
   │                                    │   PickRandom()
   │   BEGIN TRANSACTION                │   → "SUMMER2026ABC123"
   │   ├─ SELECT ... FOR UPDATE ✓       │
   │   │ (lock obtenido, A lo tiene)    │   BEGIN TRANSACTION
   │   │                                │   ├─ SELECT ... FOR UPDATE (espera lock)
   │   ├─ Verificar status=AVAILABLE ✓ │   │
   │   │ (sigue siendo AVAILABLE)       │   │
   │   │                                │   │ ◄─ (A liberó lock, comienza B)
   │   ├─ UPDATE status='ASSIGNED' ✓   │   │
   │   │                                │   ├─ SELECT ... FOR UPDATE ✓
   │   ├─ INSERT coupon_assignment ✓   │   │ (lock obtenido)
   │   │                                │   │
   │   └─ COMMIT                        │   ├─ Verificar status=AVAILABLE ✗
   │      ✓ (transacción completa)      │   │ (ahora es ASSIGNED!)
   │                                    │   │
   └─◄ 201 Created                      │   └─ ROLLBACK
       {                                │      ✗ (transacción falló)
         "code": "SUMMER2026ABC123",    │
         "userId": "A",                 │   └─◄ 400 Bad Request
         "status": "ASSIGNED"           │       {
       }                                │         "message": "Selected code is
                                        │                    no longer available"
                                        │       }
```

### Sin Pessimistic Locking (Race Condition!)
```
[USUARIO A]                          [USUARIO B]
   │                                    │
   ├─ SELECT code WHERE id='...'        │
   │  → { status: 'AVAILABLE' }         │
   │                                    ├─ SELECT code WHERE id='...'
   │  (momento: status aún AVAILABLE)   │  → { status: 'AVAILABLE' }
   │                                    │  (mismo momento)
   │  UPDATE status='ASSIGNED'          │
   │  ✓ A actualiza                     │
   │                                    │  UPDATE status='ASSIGNED'
   │  INSERT assignment (A, code123)    │  ✓ B TAMBIÉN actualiza
   │  ✓                                 │  (SOBRESCRIBE la de A)
   │                                    │
   └─ ✓ A cree que asignó               │  INSERT assignment (B, code123)
                                        │  ✓ (código asignado a B)
   
   PROBLEMA: ¡Código asignado a DOS usuarios!
   Base de datos corrupta 🔴
```

---

## Flujo 3: Asignar Código (Flujo Exitoso Completo)

```
USER REQUEST
   │
   ├─► POST /assignments/random
   │   {
   │     "userId": "550e8400-e29b-41d4-a716-446655440000",
   │     "bookId": "76fafd1e-332b-47bf-a345-a60ef2e65b23"
   │   }
   │
   ├─ MIDDLEWARE: Validation
   │  └─ Zod.parse(body) ✓
   │
   ├─ CONTROLLER: AssignmentController.assignRandomCode()
   │
   ├─ SERVICE: AssignmentService.assignRandomCode(userId, bookId)
   │  │
   │  ├─ Validate: book exists
   │  │  └─ CouponBookRepository.findById(bookId)
   │  │     └─ DB: SELECT * FROM coupon_books WHERE id='...'
   │  │     ✓ Found
   │  │
   │  ├─ Validate: book is ACTIVE
   │  │  └─ Checks: book.isActive == true ✓
   │  │
   │  ├─ Validate: book not expired
   │  │  └─ Checks: book.isExpired == false ✓
   │  │
   │  ├─ Validate: user quota not exceeded
   │  │  └─ CouponAssignmentRepository.countByUserAndBook(userId, bookId)
   │  │     └─ DB: SELECT COUNT(*) FROM coupon_assignments
   │  │            WHERE user_id='...' AND code_id IN (...)
   │  │     Count: 0 < maxCodesPerUser (2) ✓
   │  │
   │  ├─ Get available codes
   │  │  └─ CouponCodeRepository.findAvailableByBook(bookId)
   │  │     └─ DB: SELECT * FROM coupon_codes
   │  │            WHERE book_id='...' AND status='AVAILABLE'
   │  │     Found: 987 códigos disponibles
   │  │
   │  ├─ Pick random
   │  │  └─ RandomIndex = 523
   │  │     Code = "SUMMER2026MNO456"
   │  │
   │  ├─ TRANSACTION
   │  │  └─ AppDataSource.createQueryRunner()
   │  │     ├─ queryRunner.connect()
   │  │     ├─ queryRunner.startTransaction()
   │  │     │
   │  │     ├─ Lock code row
   │  │     │  └─ SELECT code FOR UPDATE
   │  │     │     WHERE id='...' AND status='AVAILABLE'
   │  │     │     → { id: '...', code: 'SUMMER2026MNO456', status: 'AVAILABLE' }
   │  │     │     ✓ Locked (otras transacciones esperan)
   │  │     │
   │  │     ├─ Update code status
   │  │     │  └─ UPDATE coupon_codes
   │  │     │     SET status='ASSIGNED'
   │  │     │     WHERE id='...'
   │  │     │     ✓ 1 row updated
   │  │     │
   │  │     ├─ Create assignment
   │  │     │  └─ INSERT coupon_assignments
   │  │     │     (code_id, user_id, assigned_at)
   │  │     │     VALUES (..., ..., NOW())
   │  │     │     ✓ Inserted
   │  │     │
   │  │     ├─ queryRunner.commitTransaction()
   │  │     │  ✓ Commit
   │  │     │
   │  │     └─ queryRunner.release()
   │  │        ✓ Release connection
   │  │
   │  └─ Return assignment
   │     {
   │       id: "11111111-2222-3333-4444-555555555555",
   │       code: "SUMMER2026MNO456",
   │       userId: "550e8400-e29b-41d4-a716-446655440000",
   │       bookId: "76fafd1e-332b-47bf-a345-a60ef2e65b23",
   │       assignedAt: "2026-02-05T20:54:10Z"
   │     }
   │
   ├─ MIDDLEWARE: ErrorHandler
   │  └─ No errors, continue
   │
   └─◄ 201 Created
       {
         "id": "11111111-2222-3333-4444-555555555555",
         "code": "SUMMER2026MNO456",
         "userId": "550e8400-e29b-41d4-a716-446655440000",
         "bookId": "76fafd1e-332b-47bf-a345-a60ef2e65b23",
         "bookName": "Verano 2026",
         "assignedAt": "2026-02-05T20:54:10Z"
       }

DATABASE FINAL STATE
   coupon_codes:
   - id: "..."
     code: "SUMMER2026MNO456"
     status: "ASSIGNED"  ← CAMBIÓ
     book_id: "76fafd1e..."

   coupon_assignments:
   + NEW ROW
     id: "11111111-2222-3333-4444-555555555555"
     code_id: "..."
     user_id: "550e8400-e29b-41d4-a716-446655440000"
     assigned_at: "2026-02-05T20:54:10Z"
```

---

## Flujo 4: Error Handling

```
[USUARIO A]
   │
   ├─► POST /coupon-codes/generate
   │   {
   │     "bookId": "invalid-uuid",  ← INVÁLIDO
   │     "quantity": 100
   │   }
   │
   ├─ MIDDLEWARE: Validation
   │  └─ Zod.parse(body) ✗
   │     Error: "bookId must be a valid UUID"
   │
   ├─ ValidationError caught
   │
   ├─ MIDDLEWARE: ErrorHandler
   │  └─ errorHandler(err, req, res, next)
   │     ├─ Checks error type
   │     ├─ Serializes error
   │     └─ res.status(400).json(...)
   │
   └─◄ 400 Bad Request
       {
         "statusCode": 400,
         "message": "Invalid UUID format for bookId",
         "error": "ValidationError",
         "timestamp": "2026-02-05T20:54:10Z"
       }

[USUARIO B]
   │
   ├─► POST /assignments/random
   │   {
   │     "userId": "550e8400-e29b-41d4-a716-446655440000",
   │     "bookId": "76fafd1e-332b-47bf-a345-a60ef2e65b23"
   │   }
   │
   ├─ Validations all pass ✓
   │
   ├─ SERVICE: assignRandomCode()
   │  ├─ CouponBookRepository.findById(bookId)
   │  │  └─ NULL (no existe)
   │  │
   │  └─ throw new NotFoundError(...)
   │
   ├─ CONTROLLER: catch error → next(error)
   │
   ├─ MIDDLEWARE: ErrorHandler
   │  └─ NotFoundError → 404
   │
   └─◄ 404 Not Found
       {
         "statusCode": 404,
         "message": "Coupon book with ID 76fafd1e... not found",
         "error": "NotFoundError"
       }

[USUARIO C]
   │
   ├─► POST /assignments/random
   │   {
   │     "userId": "550e8400-e29b-41d4-a716-446655440000",
   │     "bookId": "76fafd1e-332b-47bf-a345-a60ef2e65b23"
   │   }
   │
   ├─ SERVICE: assignRandomCode()
   │  │
   │  ├─ Book exists ✓
   │  ├─ Book is ACTIVE ✓
   │  ├─ Book not expired ✓
   │  │
   │  ├─ countByUserAndBook()
   │  │  → count = 2
   │  │  → maxCodesPerUser = 2
   │  │  → 2 >= 2 ✗
   │  │
   │  └─ throw new BadRequestError(...)
   │     "User has reached the maximum limit of 2 codes"
   │
   └─◄ 400 Bad Request
       {
         "statusCode": 400,
         "message": "User has reached the maximum limit of 2 codes",
         "error": "BadRequestError"
       }
```

---

## Estados y Transiciones

### CouponBook States
```
         DRAFT
           │
           ▼
    CREATE CAMPAIGN
           │
           ├─ ACTIVE ◄──┐
           │            │
           ├─ PAUSED ────┤
           │            │
           ├─ CLOSED ────┤
           │            │
           └─────────────┘
         
Transiciones válidas:
✓ DRAFT → ACTIVE
✓ ACTIVE → PAUSED
✓ ACTIVE → CLOSED
✓ PAUSED → ACTIVE
✓ PAUSED → CLOSED
✗ Cualquier estado → DRAFT (irreversible)
```

### CouponCode States
```
      AVAILABLE
         │ (assign)
         ▼
      ASSIGNED
         │ (lock)
         ▼
      LOCKED
         │ (redeem)
         ▼
      REDEEMED

      │ (unlock)
      ▼
      ASSIGNED

Flujo alternativo:
      AVAILABLE / ASSIGNED / LOCKED
         │ (time passed)
         ▼
      EXPIRED

Transiciones válidas:
✓ AVAILABLE → ASSIGNED (asignación)
✓ ASSIGNED → LOCKED (usuario comienza a usar)
✓ LOCKED → REDEEMED (usuario completa transacción)
✓ LOCKED → ASSIGNED (usuario cancela - unlock)
✓ ASSIGNED → LOCKED (usuario bloquea nuevamente)
✓ Cualquiera → EXPIRED (si date.now() > expires_at)

Transiciones NO válidas:
✗ ASSIGNED → AVAILABLE (no se puede desasignar)
✗ REDEEMED → (cualquier estado) (irreversible)
✗ AVAILABLE → (LOCKED, REDEEMED) (debe pasar por ASSIGNED)
```

USER FLOW:
1. Usuario tiene código ASSIGNED
2. Comienza checkout
3. POST /coupons/:code/lock
4. Sistema bloquea código (ASSIGNED → LOCKED)
5. Redis almacena lock con TTL
6. Usuario completa/cancela compra
7. POST /coupons/:code/unlock (o redeem)

LOCK FLOW (paso a paso):
[USER]
  ├─► POST /coupons/SUMMER2026ABC123/lock
  │   { userId: "550e8400...", metadata: { orderId: "ORDER-1001" } }
  │
  ├─ SERVICE: lockCoupon()
  │  ├─ Buscar código en DB
  │  ├─ Obtener asignación
  │  ├─ Verificar: pertenece a usuario ✓
  │  ├─ Verificar: libro activo ✓
  │  │
  │  ├─ BEGIN TRANSACTION
  │  │  ├─ SELECT code FOR UPDATE
  │  │  │  → Bloquea fila
  │  │  │
  │  │  ├─ UPDATE status = 'LOCKED'
  │  │  │
  │  │  ├─ INSERT redemption_audit
  │  │  │  { action: 'LOCK', statusBefore: 'ASSIGNED', statusAfter: 'LOCKED' }
  │  │  │
  │  │  └─ COMMIT
  │  │
  │  ├─ REDIS: SET coupon:lock:{codeId}
  │  │  Key: "coupon:lock:aaaaaaaa-bbbb..."
  │  │  Value: { codeId, userId, lockedAt, expiresAt }
  │  │  TTL: 300 segundos
  │  │
  │  └─ Return response
  │
  └─◄ 200 OK
      {
        "status": "LOCKED",
        "lockedUntil": "2026-02-06T00:21:51Z",
        "lockTtlSeconds": 300
      }

REDEEM FLOW (paso a paso):
[USER - después del lock]
  ├─► POST /coupons/SUMMER2026ABC123/redeem
  │   { userId: "550e8400...", metadata: { orderId: "ORDER-1001", amount: 50 } }
  │
  ├─ SERVICE: redeemCoupon()
  │  ├─ Buscar código
  │  ├─ Obtener asignación
  │  ├─ Verificar dueño ✓
  │  ├─ Verificar cuota maxRedeemsPerUser ✓
  │  │
  │  ├─ BEGIN TRANSACTION
  │  │  ├─ SELECT code FOR UPDATE
  │  │  │  → Bloquea fila
  │  │  │
  │  │  ├─ Calcular: isFinalRedeem = (redeemCount + 1 >= maxRedeems)
  │  │  │  → Si maxRedeems = 1 y redeemCount = 0
  │  │  │  → isFinalRedeem = true
  │  │  │
  │  │  ├─ Si isFinalRedeem:
  │  │  │  └─ UPDATE code.status = 'REDEEMED'
  │  │  │
  │  │  ├─ UPDATE assignment.redeemCount++
  │  │  ├─ UPDATE assignment.redeemedAt = NOW()
  │  │  │
  │  │  ├─ INSERT redemption_audit
  │  │  │  {
  │  │  │    action: 'REDEEM',
  │  │  │    statusBefore: 'LOCKED',
  │  │  │    statusAfter: 'REDEEMED',
  │  │  │    metadata: {
  │  │  │      redeemCount: 1,
  │  │  │      maxRedeems: 1,
  │  │  │      isFinalRedeem: true,
  │  │  │      amount: 50
  │  │  │    }
  │  │  │  }
  │  │  │
  │  │  └─ COMMIT
  │  │
  │  ├─ REDIS: DEL coupon:lock:{codeId}
  │  │  → Limpia lock temporal
  │  │
  │  └─ Return response
  │
  └─◄ 200 OK
      {
        "status": "REDEEMED",
        "redeemCount": 1,
        "maxRedeems": 1,
        "isFinalRedeem": true,
        "redeemedAt": "2026-02-06T00:21:51Z"
      }

DATABASE FINAL STATE:
coupon_codes:
- id: "aaaaaaaa..."
- status: "REDEEMED"  ← CAMBIÓ

coupon_assignments:
- id: "11111111..."
- redeemCount: 1  ← CAMBIÓ
- redeemedAt: "2026-02-06T00:21:51Z"  ← CAMBIÓ

redemption_audit: (2 registros)
1. { action: LOCK, statusBefore: ASSIGNED, statusAfter: LOCKED, ... }
2. { action: REDEEM, statusBefore: LOCKED, statusAfter: REDEEMED, ... }
```

---

## Flujo 6: Multi-Redeem (Cupones Reutilizables)

```
Escenario: maxRedeemsPerUser = 3 (cliente puede usar 3 veces)

1ª REDENCIÓN:
- redeemCount: 0 → 1
- isFinalRedeem = (1 >= 3) = false
- status: LOCKED (no cambia)

2ª REDENCIÓN:
- redeemCount: 1 → 2
- isFinalRedeem = (2 >= 3) = false
- status: LOCKED (no cambia)

3ª REDENCIÓN (FINAL):
- redeemCount: 2 → 3
- isFinalRedeem = (3 >= 3) = true
- status: LOCKED → REDEEMED (cambia)

redemption_audit tendrá 3 registros REDEEM
con progresión de redeemCount: 1, 2, 3
```

---

## Flujo 7: Lock Expiration

```
Timeline: T0 hasta T+301 segundos

T0:
- POST /coupons/:code/lock
- Redis: SET coupon:lock:{codeId} EX 300

T+5 min (T+300):
- Usuario aún puede redimir

T+5 min 1 sec (T+301):
- Redis evicta automáticamente el lock
- Próxima redención sin lock es válida
- Código sigue siendo LOCKED en DB (no auto-expires)

Limpieza de LOCKED codes expirados:
- Cron job (no implementado aún)
- Leer: WHERE status='LOCKED' AND locked_until < NOW()
- Update: status = 'EXPIRED'
```

