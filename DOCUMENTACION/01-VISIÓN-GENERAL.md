# 📚 Qurable Coupon Service - Visión General

## 🎯 ¿Qué es?

**Qurable Coupon Service** es un sistema de gestión de cupones/códigos de descuento para empresas.

### Caso de Uso Real
Un negocio crea una campaña "Verano 2026" con 1000 cupones. 
1. Los clientes reciben asignaciones de códigos
2. Los bloquean temporalmente al empezar a usar
3. Los redimen finalmente
4. Sistema registra todo (auditoría)

---

## 🏗️ Stack Tecnológico Completo

### Backend & Runtime
- **Node.js 18+** - Runtime JavaScript asincrónico
  - ¿Por qué? Rápido, escalable, gran ecosistema npm
  
- **Express 4.18** - Framework HTTP minimalista
  - ¿Por qué? Ligero, flexible, estándar de la industria
  
- **TypeScript 5.3** - Type safety
  - ¿Por qué? Detecta errores en compilación, mejor DX
  - Configurado con tsconfig.json (strict mode)

- **ts-node-dev** - Desarrollo con hot-reload
  - ¿Por qué? Reinicia automáticamente cuando cambias código

### Base de Datos
- **PostgreSQL 15** - RDBMS relacional
  - ¿Por qué? 
    - ACID transactions (garantiza consistencia)
    - Enums (status codes tipados)
    - FOR UPDATE (pessimistic locking)
    - Mejor que SQLite para producción

- **TypeORM 0.3** - ORM type-safe
  - ¿Por qué?
    - Queries tipadas (catch errors at compile time)
    - Migrations automáticas
    - QueryBuilder para queries complejas
    - Soporta relaciones (1:N, M:N)

- **Redis 7** - Cache en memoria
  - ¿Por qué? Preparado para:
    - Rate limiting
    - Session storage
    - Cache de códigos frecuentes

### Validación & Utilidades
- **Zod 3.22** - Validación de runtime
  - ¿Por qué? 
    - DTOs validados automáticamente
    - Mensajes de error personalizables
    - TypeScript inference de tipos

- **UUID** - Identificadores únicos
  - ¿Por qué? No secuenciales, distribuidos, seguros

### Infraestructura
- **Docker** - Containerización
  - ¿Por qué? Garantiza mismo ambiente: dev, staging, producción
  
- **Docker Compose** - Orquestación local
  - ¿Por qué? Levanta PostgreSQL + Redis con un comando

### Testing (Preparado)
- **REST Client** - Extensión VS Code
  - ¿Por qué? Pruebas rápidas sin Postman
  - Archivo: test.http

---

## � Estadísticas del Proyecto

```
Líneas de código: ~800 (sin tests)
Archivos:
  - Controllers: 4 (couponBook, couponCode, assignment, redemption)
  - Services: 4 (couponBook, couponCode, assignment, redemption)
  - Repositories: 4 (couponBook, couponCode, couponAssignment, redemptionAudit)
  - DTOs: 4 (couponBook, couponCode, assignment, redemption)
  - Routes: 5 (couponBook, couponCode, assignment, redemption, index)
  - Entities: 4 (CouponBook, CouponCode, CouponAssignment, RedemptionAudit)

Endpoints implementados: 13 (10 CRUD + 3 Lock/Unlock/Redeem)
Endpoints pendientes: 2 (Statistics)
```

---

## 🚀 Estados del Sistema

### Estados de CouponBook
```
DRAFT → ACTIVE → PAUSED ↘
                         → CLOSED
         ↓
      (no se puede usar)
```

### Estados de CouponCode
```
AVAILABLE ──┐
            ├─→ ASSIGNED ──┐
            │              ├─→ REDEEMED
            │         ┌────┘
            │         │
            │      LOCKED (temporal)
            │         │
            └─────────┴─→ EXPIRED
```

---

## 📈 Flujo de Transacciones Típico

```
Usuario Negocio                Sistema                 PostgreSQL
─────────────────             ────────                ──────────
    │
    ├─────────────────────────────────────────────────────────►
    │  POST /coupon-books
    │  (crear campaña)
    │
    │  ◄─────────────────────────────────────────────────────
    │  { id: "book-uuid", status: "DRAFT" }
    │
    ├─────────────────────────────────────────────────────────►
    │  PATCH /coupon-books/:id
    │  { status: "ACTIVE" }
    │
    │  ◄─────────────────────────────────────────────────────
    │  { status: "ACTIVE" }
    │
    ├─────────────────────────────────────────────────────────►
    │  POST /coupon-codes/generate
    │  { quantity: 1000 }
    │
    │                           INSERT 1000 rows
    │                           ──────────────────►
    │                           ◄──────────────────
    │                           Creados
    │
    │  ◄─────────────────────────────────────────────────────
    │  { codesGenerated: 1000 }
    │
    │ (Cliente recibe código)
    │
    ├─────────────────────────────────────────────────────────►
    │  POST /assignments/random
    │  { userId: "user123", bookId: "book-uuid" }
    │
    │                           BEGIN TRANSACTION
    │                           SELECT code FOR UPDATE
    │                           ──────────────────►
    │                           ◄──────────────────
    │                           (código bloqueado)
    │
    │                           UPDATE code.status
    │                           INSERT assignment
    │                           ──────────────────►
    │                           COMMIT
    │                           ◄──────────────────
    │
    │  ◄─────────────────────────────────────────────────────
    │  { code: "SUMMER2026ABC123", status: "ASSIGNED" }
```

---

## 🔄 Ciclo de Vida de un Código

```
1. CREACIÓN
   POST /coupon-codes/generate
   → Status: AVAILABLE

2. ASIGNACIÓN
   POST /assignments/random
   → Status: ASSIGNED
   → Se crea coupon_assignment record

3. USO
   POST /coupons/:code/lock (por implementar)
   → Status: LOCKED (temporal)

4. REDENCIÓN
   POST /coupons/:code/redeem (por implementar)
   → Status: REDEEMED
   → Se audita en redemption_audit

5. EXPIRACIÓN (opcional)
   Si expiresAt < NOW()
   → Status: EXPIRED
```

---

## 🛡️ Seguridad Implementada

| Aspecto | Solución |
|---------|----------|
| **SQL Injection** | TypeORM parameterized queries |
| **Race Conditions** | PostgreSQL `FOR UPDATE` |
| **Type Safety** | TypeScript + Zod validation |
| **Data Consistency** | ACID transactions |
| **Error Handling** | Custom error classes |
| **Auditoría** | redemption_audit table |

---

## 📋 Convenciones del Código

### Nomenclatura
- **Archivos**: snake_case.ts
- **Clases**: PascalCase
- **Métodos**: camelCase
- **Constantes**: UPPER_SNAKE_CASE
- **Tipos/Interfaces**: PascalCase

### Estructura de Carpetas
```
src/
├── config/         # Configuración (DB, Redis)
├── controllers/    # HTTP handlers
├── services/       # Business logic
├── repositories/   # Data access
├── entities/       # TypeORM entities
├── dto/           # Data transfer objects
├── routes/        # Express routes
├── middlewares/   # Express middlewares
├── utils/         # Funciones reutilizables
├── types/         # Types & Enums globales
└── server.ts      # Entry point
```

### Estructura de DTOs
```typescript
// schemas.ts (para Zod)
export const createUserSchema = z.object({ ... });
export type CreateUserDTO = z.infer<typeof createUserSchema>;

// responses.ts (para responses)
export interface UserResponseDTO { ... }
```

---

## 🚀 Próximos Pasos

1. ✅ Lock Feature (pessimistic + temporal lock con Redis)
2. ✅ Redeem Feature (cambio de status + audit)
3. ⬜ Unit Tests (Jest + mocks)
4. ⬜ Integration Tests (Supertest)
5. ⬜ Statistics endpoints
6. ⬜ Deployment (Docker → Cloud)

