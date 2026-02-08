# 🔌 Endpoints API

## Base URL
```
http://localhost:3000/api/v1
```

---

## 📚 COUPON BOOKS

### 1. Create Coupon Book
```
POST /coupon-books
Content-Type: application/json

REQUEST:
{
  "businessId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Verano 2026",
  "description": "Cupones de descuento verano",
  "maxRedeemsPerUser": 1,
  "maxCodesPerUser": 2,
  "totalCodesExpected": 1000,
  "expiresAt": "2026-12-31T23:59:59Z"
}

RESPONSE (201 Created):
{
  "id": "76fafd1e-332b-47bf-a345-a60ef2e65b23",
  "businessId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Verano 2026",
  "description": "Cupones de descuento verano",
  "status": "DRAFT",
  "maxRedeemsPerUser": 1,
  "maxCodesPerUser": 2,
  "totalCodesExpected": 1000,
  "generatedCount": 0,
  "expiresAt": "2026-12-31T23:59:59Z",
  "isExpired": false,
  "isActive": false,
  "createdAt": "2026-02-05T20:54:10Z",
  "updatedAt": "2026-02-05T20:54:10Z"
}

VALIDACIONES (Zod):
- businessId: UUID válido
- name: string no vacío
- description: optional
- maxRedeemsPerUser: optional, int > 0
- maxCodesPerUser: optional, int > 0
- expiresAt: optional, fecha válida

ERRORS:
- 400: Validación fallida
- 500: Error interno
```

### 2. Get All Coupon Books
```
GET /coupon-books
GET /coupon-books?businessId=xxx&status=ACTIVE

RESPONSE (200 OK):
[
  {
    "id": "76fafd1e-332b-47bf-a345-a60ef2e65b23",
    "businessId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Verano 2026",
    "status": "ACTIVE",
    ...
  },
  ...
]

PARÁMETROS (Query):
- businessId: UUID opcional (filtra por negocio)
- status: enum opcional (DRAFT, ACTIVE, PAUSED, CLOSED)

LÓGICA:
1. Repository.findAll(filters)
2. TypeORM QueryBuilder aplica filtros
3. ORDER BY created_at DESC
4. Retorna array
```

### 3. Get Coupon Book by ID
```
GET /coupon-books/:id

RESPONSE (200 OK):
{
  "id": "76fafd1e-332b-47bf-a345-a60ef2e65b23",
  "businessId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Verano 2026",
  ...
}

ERRORS:
- 404: Book no encontrado
```

### 4. Update Coupon Book
```
PATCH /coupon-books/:id
Content-Type: application/json

REQUEST:
{
  "status": "ACTIVE",
  "name": "Verano 2026 - Updated",
  "expiresAt": "2026-12-31T23:59:59Z"
}

RESPONSE (200 OK):
{
  "id": "76fafd1e-332b-47bf-a345-a60ef2e65b23",
  "name": "Verano 2026 - Updated",
  "status": "ACTIVE",
  ...
}

VALIDACIONES:
- Todos los campos son opcionales
- Si status: debe ser enum válido

LÓGICA:
1. Obtener book existente (throw NotFoundError)
2. Actualizar campos proporcionados
3. Repository.save()
4. Retornar actualizado

ERRORS:
- 400: Validación fallida
- 404: Book no encontrado
- 500: Error al actualizar
```

---

## 💳 COUPON CODES

### 1. Generate Random Coupon Codes
```
POST /coupon-codes/generate
Content-Type: application/json

REQUEST:
{
  "bookId": "76fafd1e-332b-47bf-a345-a60ef2e65b23",
  "quantity": 100,
  "prefix": "SUMMER2026",
  "length": 6
}

RESPONSE (201 Created):
{
  "codesGenerated": 100,
  "codesSkipped": 0,
  "duplicateCodes": [],
  "totalCodes": 100,
  "message": "Successfully generated 100 coupon codes"
}

VALIDACIONES:
- bookId: UUID válido
- quantity: int > 0, <= 10000
- prefix: string opcional
- length: int opcional, default 8, range [4, 16]

LÓGICA:
1. Verificar book existe
2. Generar 100 códigos: "SUMMER2026ABC123"
   a. Random alphanumeric
   b. Validar NO exista en DB
3. Bulk insert en coupon_codes (1 query, no 100)
4. Actualizar book.generatedCount += 100
5. Retornar estadísticas

GENERACIÓN ALGORITMO:
- Alphabet: A-Z + 0-9 (36 caracteres)
- Random selection para cada posición
- Verificación de duplicados antes de insertar

STATUS: Todos AVAILABLE

ERRORS:
- 400: Validación fallida
- 404: Book no encontrado
- 500: Error en generación
```

### 2. Upload Bulk Coupon Codes
```
POST /coupon-codes/upload
Content-Type: application/json

REQUEST:
{
  "bookId": "76fafd1e-332b-47bf-a345-a60ef2e65b23",
  "codes": ["CODE001", "CODE002", "CODE003", "CODE001"]
}

RESPONSE (201 Created):
{
  "codesGenerated": 2,
  "codesSkipped": 2,
  "duplicateCodes": ["CODE001"],
  "totalCodes": 3,
  "message": "Successfully uploaded 2 coupon codes. 2 codes were skipped (duplicates or already exist)."
}

VALIDACIONES:
- bookId: UUID válido
- codes: array de strings, cada uno [1, 255] chars

LÓGICA:
1. Detectar duplicados en INPUT
   - Ej: ["CODE001", "CODE001"] → 1 duplicado
2. Deduplicar
3. Consultar DB: ¿Cuáles codes ya existen?
4. Filtrar solo nuevos
5. Bulk insert
6. Actualizar counter
7. Retornar:
   - codesGenerated: 2 (insertados)
   - codesSkipped: 2 (ignorados)
   - duplicateCodes: ["CODE001"] (ya existían)

FORMATO:
- Códigos se normalizan a UPPERCASE
- Espacios en blanco ignorados

STATUS: Todos AVAILABLE

ERRORS:
- 400: Validación fallida
- 404: Book no encontrado
- 500: Error en upload
```

### 3. Get Codes for Coupon Book
```
GET /coupon-codes/book/:bookId
GET /coupon-codes/book/:bookId?status=AVAILABLE&limit=50&offset=0

RESPONSE (200 OK):
{
  "data": [
    {
      "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "code": "SUMMER2026ABC123",
      "status": "AVAILABLE",
      "bookId": "76fafd1e-332b-47bf-a345-a60ef2e65b23",
      "createdAt": "2026-02-05T20:50:00Z",
      "updatedAt": "2026-02-05T20:50:00Z"
    },
    ...
  ],
  "pagination": {
    "total": 500,
    "limit": 50,
    "offset": 0
  }
}

PARÁMETROS (Query):
- status: enum opcional (AVAILABLE, ASSIGNED, LOCKED, REDEEMED, EXPIRED)
- limit: int optional, default 100, range [1, 1000]
- offset: int optional, default 0

LÓGICA:
1. Verificar book existe
2. QueryBuilder:
   a. WHERE book_id = :bookId
   b. [AND status = :status] (si proporcionado)
   c. ORDER BY created_at DESC
   d. LIMIT :limit OFFSET :offset
   e. getManyAndCount() (retorna data + total)
3. Mapear a DTOs
4. Retornar con metadata de paginación

PAGINACIÓN:
- total: total de códigos en DB (no solo la página)
- limit: cuántos por página
- offset: desde qué índice comienza

ERRORS:
- 404: Book no encontrado
- 400: Parámetros inválidos
```

---

## 👤 ASSIGNMENTS

### 1. Assign Random Code from Book
```
POST /assignments/random
Content-Type: application/json

REQUEST:
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "bookId": "76fafd1e-332b-47bf-a345-a60ef2e65b23"
}

RESPONSE (201 Created):
{
  "id": "11111111-2222-3333-4444-555555555555",
  "codeId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "code": "SUMMER2026ABC123",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "bookId": "76fafd1e-332b-47bf-a345-a60ef2e65b23",
  "bookName": "Verano 2026",
  "assignedAt": "2026-02-05T20:54:10Z"
}

VALIDACIONES:
- userId: UUID válido
- bookId: UUID válido

LÓGICA:
1. Verificar book existe
2. Verificar book está ACTIVE
3. Verificar book NO expirado
4. Contar asignaciones del usuario en este book
5. Si user alcanzó maxCodesPerUser → 400 Bad Request
6. TRANSACCIÓN POSTGRESQL:
   a. SELECT code FOR UPDATE
      → Bloquea fila hasta commit/rollback
   b. Verificar code sigue siendo AVAILABLE
   c. UPDATE code.status = 'ASSIGNED'
   d. INSERT coupon_assignment
   e. COMMIT
7. Si otro thread asignó ese código → ROLLBACK y error

PESSIMISTIC LOCKING:
Problema: 2 clientes asignan mismo código simultáneamente
Solución: FOR UPDATE bloquea fila
- Thread A: SELECT FOR UPDATE → obtiene lock
- Thread B: SELECT FOR UPDATE → espera lock
- Thread A: COMMIT → libera lock
- Thread B: SELECT FOR UPDATE → obtiene lock, pero status != AVAILABLE
- Thread B: ROLLBACK → error "code no longer available"

STATUS: AVAILABLE → ASSIGNED

ERRORS:
- 400: Book no activo / expirado / usuario alcanzó quota / no hay códigos
- 404: Book no encontrado
- 409: Código ya asignado (race condition)
- 500: Error en transacción
```

### 2. Assign Specific Code
```
POST /assignments/:code
Content-Type: application/json

REQUEST:
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}

RESPONSE (201 Created):
{
  "id": "11111111-2222-3333-4444-555555555555",
  "codeId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "code": "SUMMER2026ABC123",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "bookId": "76fafd1e-332b-47bf-a345-a60ef2e65b23",
  "bookName": "Verano 2026",
  "assignedAt": "2026-02-05T20:54:10Z"
}

PARÁMETRO:
- code: string (path parameter, ej: "SUMMER2026ABC123")

VALIDACIONES:
- userId: UUID válido
- code: string no vacío

LÓGICA:
1. Buscar código en DB
2. Verificar está AVAILABLE
3. Obtener su libro
4. Validaciones: active, not expired, quota ok (same as random)
5. TRANSACCIÓN con FOR UPDATE (same as random)
6. Retornar assignment

STATUS: AVAILABLE → ASSIGNED

ERRORS:
- 400: Código no disponible / libro no activo / usuario alcanzó quota
- 404: Código no encontrado
- 409: Código ya asignado
- 500: Error en transacción
```

### 3. Get User Assignments
```
GET /assignments/user/:userId

RESPONSE (200 OK):
[
  {
    "id": "11111111-2222-3333-4444-555555555555",
    "codeId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "code": "SUMMER2026ABC123",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "bookId": "76fafd1e-332b-47bf-a345-a60ef2e65b23",
    "bookName": "Verano 2026",
    "assignedAt": "2026-02-05T20:54:10Z"
  },
  ...
]

PARÁMETRO:
- userId: UUID (path parameter)

LÓGICA:
1. Repository.findUserAssignments(userId)
2. QueryBuilder con JOINs:
   - coupon_assignments
   - coupon_codes
   - coupon_books
3. ORDER BY assignedAt DESC (más reciente primero)
4. Mapear a DTOs
5. Retornar array

DATOS EAGERLY LOADED:
- Código (c.code)
- Libro (b.name)

ERRORS:
- Ninguno (retorna array vacío si no hay asignaciones)
```

---

## 🔐 LOCK/UNLOCK/REDEEM

### 1. Lock Coupon Code
```
POST /coupons/:code/lock
Content-Type: application/json

REQUEST:
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "reason": "checkout_started",
    "orderId": "ORDER-1001"
  }
}

RESPONSE (200 OK):
{
  "codeId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "code": "SUMMER2026ABC123",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "LOCKED",
  "lockedUntil": "2026-02-06T00:16:51Z",
  "lockTtlSeconds": 300
}

VALIDACIONES:
- code: string no vacío
- userId: UUID válido

LÓGICA:
1. Buscar código y su asignación
2. Verificar que pertenece al usuario
3. Verificar libro activo y no expirado
4. BEGIN transaction + SELECT FOR UPDATE
5. Cambiar status a LOCKED
6. INSERT en redemption_audit (LOCK action)
7. COMMIT
8. Guardar lock en Redis con TTL

REDIS:
- Key: coupon:lock:{codeId}
- Valor: { codeId, userId, lockedAt, expiresAt }
- TTL: configurable (default 300s / 5 min)

ERRORS:
- 400: Código no asignado / usuario no coincide / libro no activo
- 404: Código no encontrado
- 409: Código ya bloqueado por otro usuario
- 410: Código expirado
```

### 2. Unlock Coupon Code
```
POST /coupons/:code/unlock
Content-Type: application/json

REQUEST:
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "reason": "checkout_cancelled",
    "orderId": "ORDER-1001"
  }
}

RESPONSE (200 OK):
{
  "codeId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "code": "SUMMER2026ABC123",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "ASSIGNED",
  "unlockedAt": "2026-02-06T00:18:51Z"
}

VALIDACIONES:
- code: string no vacío
- userId: UUID válido

LÓGICA:
1. Buscar código y asignación
2. Verificar dueño
3. Verificar estado no sea REDEEMED
4. Si ya está ASSIGNED (no LOCKED):
   - Solo limpiar cache
   - Retornar sin cambios
5. Si está LOCKED:
   - BEGIN transaction + SELECT FOR UPDATE
   - Cambiar status a ASSIGNED
   - INSERT en redemption_audit (UNLOCK action)
   - COMMIT
   - Limpiar lock de Redis

ERRORS:
- 400: Código no asignado / usuario no coincide / código expirado
- 404: Código no encontrado
- 403: Código asignado a otro usuario
```

### 3. Redeem Coupon Code
```
POST /coupons/:code/redeem
Content-Type: application/json

REQUEST:
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "reason": "checkout_completed",
    "orderId": "ORDER-1001",
    "amount": 50.00
  }
}

RESPONSE (200 OK):
{
  "codeId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "code": "SUMMER2026ABC123",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "REDEEMED",
  "redeemCount": 1,
  "maxRedeems": 1,
  "isFinalRedeem": true,
  "redeemedAt": "2026-02-06T00:18:51Z"
}

VALIDACIONES:
- code: string no vacío
- userId: UUID válido

LÓGICA:
1. Buscar código y asignación
2. Verificar dueño
3. Verificar libro activo y no expirado
4. Verificar quota: redeemCount < maxRedeemsPerUser
5. BEGIN transaction + SELECT FOR UPDATE
6. Calcular: isFinalRedeem = (redeemCount + 1 >= maxRedeems)
7. Si es final redeem:
   - Cambiar código status a REDEEMED
   - Actualizar assignment.redeemedAt = NOW()
8. Incrementar assignment.redeemCount
9. INSERT en redemption_audit (REDEEM action) con metadata
10. COMMIT
11. Limpiar lock de Redis

MULTI-REDEEM:
- Si maxRedeemsPerUser > 1: código se puede redimir varias veces
- Solo en última redención cambia status a REDEEMED
- Útil para: cupones reusables, cashback múltiple, etc.

ERRORS:
- 400: Código no asignado / libro no activo / código expirado
- 404: Código no encontrado
- 403: Código asignado a otro usuario
- 409: Código ya redimido (status = REDEEMED)
- 410: Quota de redenciones alcanzada
```

---

## Error Responses

### Formato Estándar
```
{
  "error": "Nombre del error",
  "message": "Descripción del problema",
  "statusCode": 400,
  "timestamp": "2026-02-05T20:54:10Z"
}
```

### Códigos HTTP Comunes
```
200 OK             → Lock/Unlock/Redeem exitoso
201 Created        → POST exitoso, recurso creado
400 Bad Request    → Validación fallida, lógica de negocio
403 Forbidden      → Recurso asignado a otro usuario
404 Not Found      → Recurso no existe
409 Conflict       → Race condition / código ya bloqueado
410 Gone           → Recurso expirado / cuota alcanzada
500 Internal Error → Error del servidor
```

### Custom Errors
```typescript
// NotFoundError
{
  "statusCode": 404,
  "message": "Coupon code 'CODE123' not found"
}

// BadRequestError
{
  "statusCode": 400,
  "message": "User has reached the maximum limit of 2 codes for this book"
}

// CouponAlreadyLockedError
{
  "statusCode": 409,
  "message": "This coupon is temporarily locked by another user",
  "details": {
    "lockedUntil": "2026-02-06T00:20:51Z",
    "retryAfterSeconds": 120
  }
}

// CouponAlreadyRedeemedError
{
  "statusCode": 409,
  "message": "This coupon has already been redeemed",
  "details": {
    "redeemedAt": "2026-02-05T20:54:10Z",
    "redeemCount": 1
  }
}

// CouponRedeemLimitReachedError
{
  "statusCode": 410,
  "message": "Maximum redemptions reached for this coupon",
  "details": {
    "currentRedeems": 1,
    "maxRedeems": 1
  }
}
```

---

## Rate Limiting (Próximo)

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1234567890
```

