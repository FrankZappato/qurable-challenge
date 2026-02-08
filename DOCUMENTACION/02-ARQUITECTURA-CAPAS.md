# 🏗️ Arquitectura en Capas

## Diagrama Visual

```
┌──────────────────────────────────────────────────────────┐
│ HTTP Client (REST Client / Postman / Browser)            │
└─────────────────────────┬────────────────────────────────┘
                          │
                   HTTP Request/Response
                          │
┌─────────────────────────▼────────────────────────────────┐
│ Express Router                                            │
│ • couponBook.routes.ts                                   │
│ • couponCode.routes.ts                                   │
│ • assignment.routes.ts                                   │
│                                                           │
│ ├─ POST /api/v1/coupon-books                             │
│ ├─ GET /api/v1/coupon-books                              │
│ ├─ GET /api/v1/coupon-books/:id                          │
│ ├─ PATCH /api/v1/coupon-books/:id                        │
│ ├─ POST /api/v1/coupon-codes/generate                    │
│ ├─ POST /api/v1/coupon-codes/upload                      │
│ ├─ GET /api/v1/coupon-codes/book/:bookId                 │
│ ├─ POST /api/v1/assignments/random                       │
│ ├─ POST /api/v1/assignments/:code                        │
│ ├─ GET /api/v1/assignments/user/:userId                  │
│ ├─ POST /api/v1/coupons/:code/lock                       │
│ ├─ POST /api/v1/coupons/:code/unlock                     │
│ └─ POST /api/v1/coupons/:code/redeem                     │
└─────────────────────────┬────────────────────────────────┘
                          │
                    Validación (Zod)
                          │
┌─────────────────────────▼────────────────────────────────┐
│ Controllers (HTTP Request/Response Handling)             │
│ • couponBook.controller.ts                               │
│   - create()                                              │
│   - getAll()                                              │
│   - getById()                                             │
│   - update()                                              │
│                                                           │
│ • couponCode.controller.ts                               │
│   - generateCodes()                                       │
│   - uploadCodes()                                         │
│   - getCodesByBook()                                      │
│                                                           │
│ • assignment.controller.ts                               │
│   - assignRandomCode()                                    │
│   - assignSpecificCode()                                  │
│   - getUserAssignments()                                  │
│                                                           │
│ • redemption.controller.ts                                │
│   - lockCoupon()                                           │
│   - unlockCoupon()                                         │
│   - redeemCoupon()                                  │
└─────────────────────────┬────────────────────────────────┘
                          │
              Delegar lógica de negocio
                          │
┌─────────────────────────▼────────────────────────────────┐
│ Services (Business Logic & Validation)                   │
│                                                           │
│ • couponBook.service.ts                                  │
│   - create(dto) → Valida y crea book                     │
│   - getAll(filters) → Lista con filtros                  │
│   - getById(id) → Obtiene o lanza NotFoundError          │
│   - update(id, dto) → Actualiza y valida                 │
│                                                           │
│ • couponCode.service.ts                                  │
│   - generateCodes() → Algoritmo de generación            │
│   - uploadCodes() → Detección de duplicados              │
│   - getCodesByBook() → Paginación + filtros              │
│   - getBookStatistics() → Agregaciones                   │
│                                                           │
│ • assignment.service.ts                                  │
│   - assignRandomCode()                                   │
│     * Valida book (exists, active, not expired)          │
│     * Verifica quota (maxCodesPerUser)                   │
│     * Transacción ACID con FOR UPDATE                    │
│   - assignSpecificCode()                                 │
│     * Same validations                                   │
│   - getUserAssignments()                                 │
│     * Lista con relations eager-loaded                   │
│                                                           │
│ • redemption.service.ts                                  │
│   - lockCoupon()                                          │
│     * Valida dueño del código                            │
│     * Status: ASSIGNED → LOCKED + audit                  │
│     * Redis lock con TTL (300s)                          │
│   - unlockCoupon()                                        │
│     * Status: LOCKED → ASSIGNED + audit                  │
│     * Limpia cache Redis                                 │
│   - redeemCoupon()                                        │
│     * Verifica maxRedeemsPerUser                         │
│     * Calcula: isFinalRedeem                             │
│     * Status final: ASSIGNED/LOCKED → REDEEMED           │
│     * Incrementa redeemCount                             │
│     * Audita transacción con metadata                    │
│                                                           │
│ • utils/codeGenerator.ts                                 │
│   - generateRandomCode()                                 │
│   - generateUniqueCodes()                                │
│   - findDuplicates()                                     │
│   - removeDuplicates()                                   │
└─────────────────────────┬────────────────────────────────┘
                          │
          Inyectar y ejecutar queries
                          │
┌─────────────────────────▼────────────────────────────────┐
│ Repositories (Data Access Abstraction)                   │
│                                                           │
│ • couponBook.repository.ts                               │
│   - create(data)                                          │
│   - findById(id)                                          │
│   - findAll(filters)                                     │
│   - findActiveByBusiness(businessId)                     │
│   - findExpiredBooks()                                   │
│   - incrementGeneratedCount(id, amount)                  │
│   - save(book)                                            │
│   - update(id, data)                                     │
│   - delete(id)                                            │
│                                                           │
│ • couponCode.repository.ts                               │
│   - create(data)                                          │
│   - bulkCreate(codes[])                                  │
│   - findById(id)                                          │
│   - findByCode(code)                                     │
│   - findByCodeAndBook(code, bookId)                      │
│   - findAvailableByBook(bookId)                          │
│   - findByBookWithPagination(bookId, status, limit, off) │
│   - findExistingCodes(codes[], bookId)                   │
│   - countByBookAndStatus(bookId, status)                 │
│   - getBookStatistics(bookId)                            │
│   - updateStatus(id, status)                             │
│   - save(code)                                            │
│   - delete(id)                                            │
│                                                           │
│ • couponAssignment.repository.ts                         │
│   - create(data)                                          │
│   - findById(id)                                          │
│   - findByCodeId(codeId)                                 │
│   - findByUserAndBook(userId, bookId)                    │
│   - countByUserAndBook(userId, bookId)                   │
│   - findUserAssignments(userId)                          │
│   - delete(id)                                            │
│   - save(assignment)                                      │
│                                                           │
│ • redemptionAudit.repository.ts                          │
│   - create(data)  (Para INSERT en audit table)           │
└─────────────────────────┬────────────────────────────────┘
                          │
           Construir queries SQL
                          │
┌─────────────────────────▼────────────────────────────────┐
│ TypeORM + Entities                                       │
│                                                           │
│ • CouponBook.entity.ts                                   │
│   - Mapeo a tabla coupon_books                           │
│   - Relación 1:N con CouponCode                          │
│                                                           │
│ • CouponCode.entity.ts                                   │
│   - Mapeo a tabla coupon_codes                           │
│   - Relación N:1 con CouponBook                          │
│   - Índices para performance                             │
│                                                           │
│ • CouponAssignment.entity.ts                             │
│   - Mapeo a tabla coupon_assignments                     │
│   - Relación N:1 con CouponCode                          │
│                                                           │
│ • RedemptionAudit.entity.ts                              │
│   - Mapeo a tabla redemption_audit                       │
│   - Relación N:1 con CouponCode                          │
└─────────────────────────┬────────────────────────────────┘
                          │
                 SQL Queries
                          │
┌─────────────────────────▼────────────────────────────────┐
│ PostgreSQL Database                                      │
│                                                           │
│ Tables:                                                  │
│ ├─ coupon_books (UUID PK, constraints, enums)            │
│ ├─ coupon_codes (UUID PK, FK, status enum, indices)      │
│ ├─ coupon_assignments (UUID PK, FKs)                     │
│ └─ redemption_audit (UUID PK, JSONB metadata)            │
│                                                           │
│ Features:                                                │
│ ├─ Transactions (BEGIN, COMMIT, ROLLBACK)                │
│ ├─ Pessimistic Locking (FOR UPDATE)                      │
│ ├─ Indexes (performance on FK, status)                   │
│ └─ Constraints (PK, FK, NOT NULL)                        │
└──────────────────────────────────────────────────────────┘
```

---

## ¿Por qué esta arquitectura?

### 1. **Separación de Responsabilidades**
- **Controller**: ¿Qué llega por HTTP?
- **Service**: ¿Cómo procesamos esto?
- **Repository**: ¿Cómo accedemos a datos?

Cambio en una capa = No afecta las otras.

### 2. **Testeabilidad**
```typescript
// Para testear Service sin tocar DB
const mockRepository = {
  findAvailableByBook: jest.fn()
};

const service = new CouponCodeService();
service.codeRepo = mockRepository;

// Ahora testiamos lógica pura
```

### 3. **Mantenibilidad**
- Agregar un nuevo endpoint es predecible
- Buscar código es fácil (cada cosa en su sitio)
- Refactor sin riesgo de quebrar todo

### 4. **Escalabilidad**
- Puedo agregar caché en repository sin cambiar service
- Puedo cambiar DB sin cambiar service/controller
- Puedo agregar logs/metrics en cualquier capa

---

## Flujo de Data

### Request → Response

```
1. CLIENT
   POST /api/v1/assignments/random
   {
     "userId": "550e8400...",
     "bookId": "76fafd1e..."
   }
   │
   ├─ Headers: Content-Type: application/json
   └─ Body: JSON string

2. EXPRESS ROUTER
   Identifica:
   - Método: POST
   - Path: /api/v1/assignments/random
   - Middleware: validateRequest(assignRandomCodeSchema)

3. MIDDLEWARE (Validation)
   Zod.parse(body)
   ✓ Si válido → Next
   ✗ Si inválido → 400 Bad Request

4. CONTROLLER
   assignRandomCode(req: Request, res: Response)
   - Extrae: req.body (ya validado)
   - Llama: this.service.assignRandomCode(userId, bookId)
   - Maneja: error en catch → next(error)

5. SERVICE
   assignRandomCode(userId, bookId)
   a. Valida: book existe
   b. Valida: book activo
   c. Valida: libro no expirado
   d. Valida: usuario no alcanzó quota
   e. Obtiene: códigos disponibles
   f. Inyecta: transacción PostgreSQL
   g. Retorna: { id, code, userId, ... }

6. REPOSITORY (QueryRunner Transaction)
   BEGIN TRANSACTION
   │
   ├─ SELECT code FOR UPDATE
   │  → Bloquea fila hasta COMMIT/ROLLBACK
   │
   ├─ UPDATE code.status = 'ASSIGNED'
   │  → Actualiza estado
   │
   ├─ INSERT coupon_assignment
   │  → Crea registro de asignación
   │
   └─ COMMIT
      → Libera lock, confirma cambios

7. POSTGRESQL
   Ejecuta queries atómicamente
   ✓ Todas se aplican
   ✗ Una falla = ROLLBACK de todas

8. SERVICE (return)
   Transacción exitosa
   Retorna objeto con los datos

9. CONTROLLER (response)
   res.status(201).json(result)

10. MIDDLEWARE (ErrorHandler)
    Si hubo error:
    - Serializa error
    - Status code apropiado
    - Mensaje para cliente

11. CLIENT (Response)
    201 Created
    {
      "id": "a1b2c3d4...",
      "code": "SUMMER2026ABC123",
      "userId": "550e8400...",
      "bookId": "76fafd1e...",
      "assignedAt": "2026-02-05T20:54:10Z"
    }
```

---

## Inyección de Dependencias

### Patrón Simple (usado actualmente)

```typescript
// service.ts
export class AssignmentService {
  private codeRepo: CouponCodeRepository;
  private bookRepo: CouponBookRepository;
  private assignmentRepo: CouponAssignmentRepository;

  constructor() {
    // Inyección en constructor
    this.codeRepo = new CouponCodeRepository();
    this.bookRepo = new CouponBookRepository();
    this.assignmentRepo = new CouponAssignmentRepository();
  }
}

// controller.ts
export class AssignmentController {
  private service: AssignmentService;

  constructor() {
    this.service = new AssignmentService();
  }
}
```

### Ventajas
- Simple, fácil de entender
- No necesita framework extra
- Testeable con mocks manuales

### Si escalamos: DI Container
```typescript
// Usar inversify o tsyringe
@injectable()
export class AssignmentService {
  constructor(
    @inject(CouponCodeRepository) private codeRepo,
    @inject(CouponBookRepository) private bookRepo
  ) {}
}
```

