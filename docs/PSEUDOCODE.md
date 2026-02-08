# Pseudocódigo - Operaciones Críticas

Este documento presenta el pseudocódigo educativo de las tres operaciones más críticas del sistema de gestión de cupones, diseñado para facilitar la comprensión de la lógica de negocio y los mecanismos de concurrencia.

---

## 📋 Tabla de Contenidos

- [1. Asignación Aleatoria de Cupones](#1-asignación-aleatoria-de-cupones)
- [2. Bloqueo de Cupón (Lock)](#2-bloqueo-de-cupón-lock)
- [3. Redención de Cupón](#3-redención-de-cupón)

---

## 1. Asignación Aleatoria de Cupones

### Descripción
Asigna un cupón no utilizado de forma aleatoria a un usuario, respetando el límite de cupones por usuario (`maxCodesPerUser`) y manejando condiciones de carrera mediante locking pesimista.

### Pseudocódigo

```
FUNCTION assignRandomCoupon(bookId: UUID, userId: UUID, metadata?: Object)
  BEGIN TRANSACTION
  
  TRY
    // 1. Obtener el libro de cupones con bloqueo pesimista
    couponBook ← SELECT * FROM coupon_books 
                 WHERE id = bookId 
                 FOR UPDATE  // Bloqueo de fila para prevenir race conditions
    
    IF couponBook IS NULL THEN
      THROW Error("Coupon book not found")
    END IF
    
    IF couponBook.isActive = FALSE THEN
      THROW Error("Coupon book is not active")
    END IF
    
    // 2. Validar cuota del usuario
    existingAssignmentsCount ← COUNT(*) FROM coupon_assignments
                                WHERE couponBookId = bookId
                                AND userId = userId
    
    IF existingAssignmentsCount >= couponBook.maxCodesPerUser THEN
      THROW Error("User has reached maximum coupons for this book")
    END IF
    
    // 3. Buscar cupón disponible de forma aleatoria
    availableCode ← SELECT * FROM coupon_codes
                    WHERE couponBookId = bookId
                    AND isAssigned = FALSE
                    ORDER BY RANDOM()  // PostgreSQL randomization
                    LIMIT 1
                    FOR UPDATE SKIP LOCKED  // Evitar bloqueos en lecturas concurrentes
    
    IF availableCode IS NULL THEN
      THROW Error("No available coupons in this book")
    END IF
    
    // 4. Marcar código como asignado
    UPDATE coupon_codes
    SET isAssigned = TRUE,
        updatedAt = CURRENT_TIMESTAMP
    WHERE id = availableCode.id
    
    // 5. Crear registro de asignación
    assignment ← INSERT INTO coupon_assignments (
      id: GENERATE_UUID(),
      couponCodeId: availableCode.id,
      couponBookId: bookId,
      userId: userId,
      code: availableCode.code,
      status: "ASSIGNED",
      assignedAt: CURRENT_TIMESTAMP,
      metadata: metadata || {},
      redeemCount: 0
    )
    
    COMMIT TRANSACTION
    
    RETURN {
      assignmentId: assignment.id,
      code: availableCode.code,
      status: "ASSIGNED",
      assignedAt: assignment.assignedAt
    }
    
  CATCH error
    ROLLBACK TRANSACTION
    THROW error
  END TRY
END FUNCTION
```

### Complejidad
- **Temporal**: O(1) - Acceso directo con índices
- **Espacial**: O(1) - Operación atómica

### Mecanismos de Concurrencia
1. **FOR UPDATE**: Bloqueo pesimista en `coupon_books`
2. **FOR UPDATE SKIP LOCKED**: Evita esperas innecesarias en códigos ya bloqueados
3. **Transaction Isolation**: REPEATABLE READ garantiza consistencia

---

## 2. Bloqueo de Cupón (Lock)

### Descripción
Transiciona un cupón asignado al estado LOCKED con TTL en Redis para reservas temporales (ej: carritos de compra, procesos de pago).

### Pseudocódigo

```
FUNCTION lockCoupon(code: String, userId: UUID, metadata?: Object, ttl: Number = 300, ipAddress?: String, userAgent?: String)
  BEGIN TRANSACTION
  
  TRY
    // 1. Buscar asignación existente con bloqueo
    assignment ← SELECT * FROM coupon_assignments
                 WHERE code = code
                 FOR UPDATE  // Bloqueo para modificación
    
    IF assignment IS NULL THEN
      THROW Error("Coupon assignment not found")
    END IF
    
    // 2. Validar propiedad del cupón
    IF assignment.userId ≠ userId THEN
      THROW Error("Coupon does not belong to this user")
    END IF
    
    // 3. Validar estado permitido
    IF assignment.status NOT IN ["ASSIGNED", "LOCKED"] THEN
      THROW Error("Cannot lock coupon in status: " + assignment.status)
    END IF
    
    // 4. Actualizar estado en base de datos
    UPDATE coupon_assignments
    SET status = "LOCKED",
        lockedAt = CURRENT_TIMESTAMP,
        lockedUntil = CURRENT_TIMESTAMP + ttl SECONDS,
        metadata = MERGE(assignment.metadata, metadata || {}),
        updatedAt = CURRENT_TIMESTAMP
    WHERE id = assignment.id
    
    // 5. Crear entrada de caché con TTL
    lockKey ← "coupon:lock:" + code
    lockData ← {
      userId: userId,
      lockedAt: CURRENT_TIMESTAMP,
      expiresAt: CURRENT_TIMESTAMP + ttl SECONDS,
      metadata: metadata
    }
    
    REDIS.SETEX(lockKey, ttl, JSON.stringify(lockData))
    
    // 6. Registrar auditoría
    INSERT INTO redemption_audit (
      id: GENERATE_UUID(),
      assignmentId: assignment.id,
      action: "LOCK",
      userId: userId,
      previousStatus: assignment.status,
      newStatus: "LOCKED",
      ipAddress: ipAddress,
      userAgent: userAgent,
      metadata: metadata || {},
      createdAt: CURRENT_TIMESTAMP
    )
    
    COMMIT TRANSACTION
    
    // 7. Programar auto-unlock (background job)
    SCHEDULE_JOB("auto-unlock-" + code, ttl SECONDS, unlockCoupon(code, userId))
    
    RETURN {
      code: code,
      status: "LOCKED",
      lockedAt: CURRENT_TIMESTAMP,
      lockedUntil: CURRENT_TIMESTAMP + ttl SECONDS
    }
    
  CATCH error
    ROLLBACK TRANSACTION
    THROW error
  END TRY
END FUNCTION
```

### Complejidad
- **Temporal**: O(1) - Acceso directo por índice único en `code`
- **Espacial**: O(1) - Entrada de caché fija

### Mecanismos de Concurrencia
1. **Database Lock**: `FOR UPDATE` previene modificaciones simultáneas
2. **Redis Atomic**: `SETEX` es operación atómica
3. **TTL Expiration**: Auto-limpieza de locks huérfanos

---

## 3. Redención de Cupón

### Descripción
Procesa la redención de un cupón bloqueado o asignado, soportando múltiples redenciones (`maxRedeemsPerUser`) y transicionando a REDEEMED solo en la última redención.

### Pseudocódigo

```
FUNCTION redeemCoupon(code: String, userId: UUID, metadata?: Object, ipAddress?: String, userAgent?: String)
  BEGIN TRANSACTION
  
  TRY
    // 1. Buscar asignación con bloqueo pesimista
    assignment ← SELECT ca.*, cc.*, cb.maxRedeemsPerUser 
                 FROM coupon_assignments ca
                 JOIN coupon_codes cc ON ca.couponCodeId = cc.id
                 JOIN coupon_books cb ON ca.couponBookId = cb.id
                 WHERE ca.code = code
                 FOR UPDATE OF ca  // Bloqueo solo en assignments
    
    IF assignment IS NULL THEN
      THROW Error("Coupon not found")
    END IF
    
    // 2. Validar propiedad
    IF assignment.userId ≠ userId THEN
      THROW Error("Coupon does not belong to this user")
    END IF
    
    // 3. Validar estado
    IF assignment.status NOT IN ["ASSIGNED", "LOCKED"] THEN
      THROW Error("Coupon already redeemed or expired")
    END IF
    
    // 4. Validar cuota de redenciones
    currentRedeemCount ← assignment.redeemCount || 0
    maxRedeems ← assignment.maxRedeemsPerUser || 1  // Default: un solo uso
    
    IF currentRedeemCount >= maxRedeems THEN
      THROW Error("Coupon has reached maximum redemption limit")
    END IF
    
    // 5. Incrementar contador de redenciones
    newRedeemCount ← currentRedeemCount + 1
    isFinalRedeem ← (newRedeemCount >= maxRedeems)
    
    // 6. Determinar nuevo estado
    newStatus ← IF isFinalRedeem THEN "REDEEMED" ELSE "ASSIGNED"
    
    // 7. Actualizar asignación
    UPDATE coupon_assignments
    SET status = newStatus,
        redeemCount = newRedeemCount,
        redeemedAt = IF isFinalRedeem THEN CURRENT_TIMESTAMP ELSE assignment.redeemedAt,
        metadata = MERGE(assignment.metadata, metadata || {}),
        updatedAt = CURRENT_TIMESTAMP
    WHERE id = assignment.id
    
    // 8. Limpiar caché de Redis (si estaba bloqueado)
    IF assignment.status = "LOCKED" THEN
      lockKey ← "coupon:lock:" + code
      REDIS.DEL(lockKey)
    END IF
    
    // 9. Registrar auditoría
    INSERT INTO redemption_audit (
      id: GENERATE_UUID(),
      assignmentId: assignment.id,
      action: "REDEEM",
      userId: userId,
      previousStatus: assignment.status,
      newStatus: newStatus,
      ipAddress: ipAddress,
      userAgent: userAgent,
      metadata: MERGE(metadata || {}, {
        redeemCount: newRedeemCount,
        maxRedeems: maxRedeems,
        isFinalRedeem: isFinalRedeem
      }),
      createdAt: CURRENT_TIMESTAMP
    )
    
    COMMIT TRANSACTION
    
    RETURN {
      code: code,
      status: newStatus,
      redeemCount: newRedeemCount,
      maxRedeems: maxRedeems,
      isFinalRedeem: isFinalRedeem,
      redeemedAt: IF isFinalRedeem THEN CURRENT_TIMESTAMP ELSE NULL
    }
    
  CATCH error
    ROLLBACK TRANSACTION
    THROW error
  END TRY
END FUNCTION
```

### Complejidad
- **Temporal**: O(1) - Acceso indexado + JOIN optimizado
- **Espacial**: O(1) - Operación atómica

### Mecanismos de Concurrencia
1. **FOR UPDATE OF**: Bloqueo granular solo en `coupon_assignments`
2. **Transaction Isolation**: Garantiza consistencia en multi-redeem
3. **Audit Trail**: Trazabilidad completa de cada redención

---

## 🔐 Estrategias de Locking

### Bloqueo Pesimista (Pessimistic Locking)
```sql
-- PostgreSQL
SELECT * FROM coupon_assignments 
WHERE code = 'ABC123' 
FOR UPDATE;  -- Bloquea la fila hasta COMMIT/ROLLBACK
```

**Ventajas**:
- Previene race conditions al 100%
- Ideal para operaciones de escritura frecuentes
- Garantiza consistencia ACID

**Desventajas**:
- Mayor latencia en alta concurrencia
- Posibles deadlocks si no se ordenan locks

### Bloqueo Optimista (No usado en este sistema)
```sql
-- Alternativa con version column
UPDATE coupon_assignments 
SET status = 'REDEEMED', version = version + 1
WHERE code = 'ABC123' AND version = 42;
-- Si version ≠ 42, otro proceso modificó la fila
```

**Razón por no usar**: Alta contención esperada en cupones populares (Black Friday, campañas virales).

---

## 📊 Consideraciones de Rendimiento

### Índices Críticos
```sql
-- coupon_assignments.code (unique index)
CREATE UNIQUE INDEX idx_assignments_code ON coupon_assignments(code);

-- coupon_codes.couponBookId + isAssigned (composite index)
CREATE INDEX idx_codes_book_assigned ON coupon_codes(couponBookId, isAssigned);

-- redemption_audit.assignmentId (foreign key index)
CREATE INDEX idx_audit_assignment ON redemption_audit(assignmentId);
```

### Optimizaciones de Redis
```javascript
// Pipeline para operaciones batch
const pipeline = redis.pipeline();
pipeline.setex(`coupon:lock:${code1}`, 300, data1);
pipeline.setex(`coupon:lock:${code2}`, 300, data2);
await pipeline.exec();
```

### Connection Pooling
```typescript
// TypeORM connection pool
{
  max: 20,              // Máximo 20 conexiones concurrentes
  min: 5,               // Mínimo 5 conexiones activas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
}
```

---

## 🧪 Casos de Prueba

### Test: Asignación Concurrente
```
GIVEN: 
  - Libro con 1 cupón disponible
  - 2 usuarios (User A, User B) solicitan simultáneamente

WHEN:
  - assignRandomCoupon(bookId, userA) || assignRandomCoupon(bookId, userB)

THEN:
  - User A recibe cupón exitosamente
  - User B recibe error "No available coupons"
  - isAssigned = TRUE en base de datos
```

### Test: Multi-Redeem
```
GIVEN:
  - Cupón con maxRedeems = 3
  - redeemCount = 0

WHEN:
  - redeemCoupon(code, userId) (1ra vez)
  - redeemCoupon(code, userId) (2da vez)
  - redeemCoupon(code, userId) (3ra vez)

THEN:
  - 1ra: status = "ASSIGNED", redeemCount = 1
  - 2da: status = "ASSIGNED", redeemCount = 2
  - 3ra: status = "REDEEMED", redeemCount = 3, isFinalRedeem = true
```

### Test: Lock Expiration
```
GIVEN:
  - Cupón bloqueado con TTL = 5 segundos

WHEN:
  - WAIT 6 segundos
  - CHECK Redis key

THEN:
  - Redis key no existe (auto-expirado)
  - Database status = "LOCKED" (requiere job de limpieza)
```

---

## 📖 Referencias

- [PostgreSQL Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Redis SETEX Command](https://redis.io/commands/setex/)
- [ACID Transactions](https://en.wikipedia.org/wiki/ACID)
- [TypeORM Query Builder](https://typeorm.io/select-query-builder)
- [Race Condition Prevention](https://martinfowler.com/articles/patterns-of-distributed-systems/versioned-value.html)

---

**Última actualización**: 6 de febrero de 2026  
**Versión**: 1.0.0  
**Autor**: Qurable Challenge - Sistema de Gestión de Cupones
