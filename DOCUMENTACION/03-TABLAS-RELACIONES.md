# 📊 Tablas y Relaciones

## Diagrama ER (Entity-Relationship)

```
┌────────────────────┐
│   coupon_books     │
├────────────────────┤
│ id (UUID) [PK]     │
│ business_id (UUID) │
│ name               │
│ description        │
│ status (ENUM)      │◄─────┐
│ max_redeems        │      │
│ max_codes_per_user │      │ 1:N
│ total_expected     │      │
│ generated_count    │      │
│ expires_at         │      │
│ created_at         │      │
│ updated_at         │      │
└────────────────────┘      │
                            │
                   ┌────────▼──────────────┐
                   │   coupon_codes       │
                   ├─────────────────────┤
                   │ id (UUID) [PK]      │
                   │ book_id (UUID) [FK] │
                   │ code (VARCHAR)      │
                   │ status (ENUM)       │◄─────┐
                   │ created_at          │      │
                   │ updated_at          │      │ 1:N
                   │                     │      │
                   │ [INDEX]             │      │
                   │ (book_id, status)   │      │
                   │ (code) UNIQUE       │      │
                   └────────┬────────────┘      │
                            │           ┌──────▼──────────────────┐
                            │           │ coupon_assignments      │
                            └─────────────│ id (UUID) [PK]         │
                                        │ code_id (UUID) [FK]    │
                                        │ user_id (UUID)         │
                                        │ assigned_at            │
                                        │                        │
                                        │ [INDEX]                │
                                        │ (user_id, code_id)     │
                                        └────────┬───────────────┘
                                                 │
                                          1:N    │
                                                 │
                                        ┌────────▼──────────────┐
                                        │ redemption_audit      │
                                        ├──────────────────────┤
                                        │ id (UUID) [PK]       │
                                        │ code_id (UUID) [FK]  │
                                        │ user_id (UUID)       │
                                        │ action (ENUM)        │
                                        │ status_before (VARCHAR)
                                        │ status_after (VARCHAR)
                                        │ metadata (JSONB)     │
                                        │ created_at           │
                                        └──────────────────────┘
```

---

## 1. COUPON_BOOKS

### Propósito
Define una campaña de cupones (ej: "Verano 2026", "Black Friday 2026")

### Esquema
```sql
CREATE TABLE coupon_books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Negocio dueño de la campaña
  business_id UUID NOT NULL,
  
  -- Metadatos
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Control de campaña
  status coupon_books_status_enum NOT NULL DEFAULT 'DRAFT',
  
  -- Límites por usuario
  max_redeems_per_user INT,      -- NULL = sin límite
  max_codes_per_user INT,        -- NULL = sin límite
  
  -- Capacidad
  total_codes_expected INT,
  generated_count INT DEFAULT 0,
  
  -- Expiración
  expires_at TIMESTAMP,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Estados (ENUM)
```
DRAFT    → En creación, no se puede usar
ACTIVE   → Disponible para asignación
PAUSED   → Pausada temporalmente
CLOSED   → Cerrada permanentemente
```

### Ejemplos de Datos
```sql
INSERT INTO coupon_books (business_id, name, status, max_codes_per_user, max_redeems_per_user)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Verano 2026', 'ACTIVE', 2, 1),
  ('550e8400-e29b-41d4-a716-446655440001', 'Black Friday', 'DRAFT', 5, 3);
```

### Consultas Típicas
```sql
-- Obtener todas las campañas activas
SELECT * FROM coupon_books WHERE status = 'ACTIVE';

-- Contar cupones generados vs esperados
SELECT name, generated_count, total_codes_expected 
FROM coupon_books 
WHERE id = '...';

-- Campañas por expirar
SELECT * FROM coupon_books 
WHERE expires_at < NOW() AND status != 'CLOSED';
```

---

## 2. COUPON_CODES

### Propósito
Códigos individuales que se asignan a usuarios (ej: "SUMMER2026ABC123")

### Esquema
```sql
CREATE TABLE coupon_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relación
  book_id UUID NOT NULL REFERENCES coupon_books(id) ON DELETE CASCADE,
  
  -- Código actual
  code VARCHAR(255) NOT NULL UNIQUE,
  
  -- Estado actual
  status coupon_codes_status_enum NOT NULL DEFAULT 'AVAILABLE',
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices para performance
  INDEX idx_book_status (book_id, status),
  INDEX idx_code_unique (code)
);
```

### Estados (ENUM)
```
AVAILABLE  → No asignado a nadie
ASSIGNED   → Asignado a usuario (pero no redimido)
LOCKED     → Bloqueado temporalmente (usuario lo está usando)
REDEEMED   → Redimido permanentemente (usado)
EXPIRED    → Expiró sin redimir
```

### Relaciones
```
coupon_codes.book_id → coupon_books.id
  - N:1 relationship
  - CASCADE on delete (si borro book, borro codes)
```

### Índices
```sql
-- Para queries rápidas por status
CREATE INDEX idx_book_status ON coupon_codes(book_id, status);

-- UNIQUE CONSTRAINT en código (no puede haber duplicados)
UNIQUE(code)
```

### Ejemplos de Datos
```sql
INSERT INTO coupon_codes (book_id, code, status)
VALUES
  ('76fafd1e-332b-47bf-a345-a60ef2e65b23', 'SUMMER2026ABC123', 'AVAILABLE'),
  ('76fafd1e-332b-47bf-a345-a60ef2e65b23', 'SUMMER2026XYZ789', 'AVAILABLE'),
  ('76fafd1e-332b-47bf-a345-a60ef2e65b23', 'SUMMER2026DEF456', 'ASSIGNED');
```

### Consultas Típicas
```sql
-- Obtener X códigos AVAILABLE aleatorios
SELECT * FROM coupon_codes 
WHERE book_id = '...' AND status = 'AVAILABLE'
ORDER BY RANDOM() 
LIMIT 10;

-- Contar códigos por status
SELECT status, COUNT(*) as count
FROM coupon_codes
WHERE book_id = '...'
GROUP BY status;

-- Códigos redimidos (con auditoría)
SELECT c.code, c.created_at, r.created_at as redeemed_at
FROM coupon_codes c
LEFT JOIN redemption_audit r ON r.code_id = c.id AND r.action = 'REDEEMED'
WHERE c.book_id = '...' AND c.status = 'REDEEMED';
```

---

## 3. COUPON_ASSIGNMENTS

### Propósito
Registro de "quién recibió qué código y cuándo"

### Esquema
```sql
CREATE TABLE coupon_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relaciones
  code_id UUID NOT NULL REFERENCES coupon_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Timestamp
  assigned_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices
  INDEX idx_user_code (user_id, code_id),
  INDEX idx_code_id (code_id)
);
```

### Relaciones
```
coupon_assignments.code_id → coupon_codes.id
  - N:1 relationship
  - CASCADE on delete
```

### ¿Por qué esta tabla?
En vez de guardar `user_id` en `coupon_codes`, usamos tabla separada porque:
1. Un código solo puede asignarse a UN usuario
2. Pero queremos historial de cambios
3. Permite auditoría: quién lo tenía, cuándo

### Ejemplos de Datos
```sql
INSERT INTO coupon_assignments (code_id, user_id)
VALUES
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '550e8400-e29b-41d4-a716-446655440000'),
  ('ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj', '550e8400-e29b-41d4-a716-446655440001');
```

### Consultas Típicas
```sql
-- Todos los códigos de un usuario
SELECT c.code, b.name as book_name, a.assigned_at
FROM coupon_assignments a
JOIN coupon_codes c ON c.id = a.code_id
JOIN coupon_books b ON b.id = c.book_id
WHERE a.user_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY a.assigned_at DESC;

-- Contar asignaciones por usuario en un libro
SELECT user_id, COUNT(*) as count
FROM coupon_assignments a
JOIN coupon_codes c ON c.id = a.code_id
WHERE c.book_id = '...'
GROUP BY user_id;

-- Usuarios que alcanzaron límite
SELECT user_id, COUNT(*) as count
FROM coupon_assignments a
JOIN coupon_codes c ON c.id = a.code_id
WHERE c.book_id = '...' AND c.status IN ('ASSIGNED', 'LOCKED', 'REDEEMED')
GROUP BY user_id
HAVING COUNT(*) >= (SELECT max_codes_per_user FROM coupon_books WHERE id = '...');
```

---

## 4. REDEMPTION_AUDIT

### Propósito
Historial completo de cambios de estado (auditoría legal)

### Esquema
```sql
CREATE TABLE redemption_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relaciones
  code_id UUID NOT NULL REFERENCES coupon_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Acción
  action redemption_audit_action_enum NOT NULL,
  
  -- Estado antes/después
  status_before VARCHAR(50),
  status_after VARCHAR(50),
  
  -- Metadatos flexible
  metadata JSONB,  -- {"ip": "...", "device": "...", "reason": "..."}
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Estados de Action (ENUM)
```
LOCKED    → Código bloqueado (usuario comenzó a usar)
UNLOCKED  → Desbloqueado (usuario no usó)
REDEEMED  → Redimido (usuario completó la transacción)
```

### Ejemplos de Metadata
```json
{
  "ip": "192.168.1.100",
  "device": "mobile",
  "browser": "chrome",
  "transaction_id": "txn_123abc",
  "amount": 50.00,
  "reason": "Purchase at store #42"
}
```

### Ejemplos de Datos
```sql
INSERT INTO redemption_audit (code_id, user_id, action, status_before, status_after, metadata)
VALUES
  (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    '550e8400-e29b-41d4-a716-446655440000',
    'LOCKED',
    'ASSIGNED',
    'LOCKED',
    '{"ip": "192.168.1.100", "reason": "Started payment"}'::jsonb
  ),
  (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    '550e8400-e29b-41d4-a716-446655440000',
    'REDEEMED',
    'LOCKED',
    'REDEEMED',
    '{"ip": "192.168.1.100", "reason": "Payment completed", "amount": 50.00}'::jsonb
  );
```

### Consultas Típicas
```sql
-- Auditoría completa de un código
SELECT * FROM redemption_audit
WHERE code_id = '...'
ORDER BY created_at;

-- Códigos redimidos en rango de fechas
SELECT c.code, a.user_id, a.metadata
FROM redemption_audit a
JOIN coupon_codes c ON c.id = a.code_id
WHERE a.action = 'REDEEMED' 
  AND a.created_at BETWEEN '2026-01-01' AND '2026-12-31'
ORDER BY a.created_at DESC;

-- Usuarios con más redenciones
SELECT user_id, COUNT(*) as redemptions
FROM redemption_audit
WHERE action = 'REDEEMED'
GROUP BY user_id
ORDER BY redemptions DESC
LIMIT 10;
```

---

## Integridad Referencial

### Cascadas en Deletes
```
DELETE coupon_book
  └─ CASCADE DELETE coupon_codes (todos los códigos se borran)
    └─ CASCADE DELETE coupon_assignments (todas las asignaciones)
    └─ CASCADE DELETE redemption_audit (todo el historial)

DELETE coupon_code
  └─ CASCADE DELETE coupon_assignments
  └─ CASCADE DELETE redemption_audit
```

### Constraints
```sql
-- Primary Keys
PRIMARY KEY (id)

-- Foreign Keys con referential integrity
FOREIGN KEY (code_id) REFERENCES coupon_codes(id) ON DELETE CASCADE

-- Unique Constraints
UNIQUE (code)  -- En coupon_codes

-- Not Null
NOT NULL (name, status, etc.)

-- Enum Constraints
status IN ('AVAILABLE', 'ASSIGNED', 'LOCKED', 'REDEEMED', 'EXPIRED')
```

---

## Índices (Performance)

```sql
-- En coupon_codes (critical path)
CREATE INDEX idx_book_status ON coupon_codes(book_id, status);
  → Para queries: WHERE book_id = X AND status = 'AVAILABLE'
  → Evita full table scan en 1M+ rows

CREATE UNIQUE INDEX idx_code ON coupon_codes(code);
  → Para queries: WHERE code = 'SUMMER2026...'
  → Garantiza unicidad

-- En coupon_assignments (querys frecuentes)
CREATE INDEX idx_user_code ON coupon_assignments(user_id, code_id);
  → Para queries: WHERE user_id = X AND book_id = Y

-- En redemption_audit (análisis histórico)
CREATE INDEX idx_code_created ON redemption_audit(code_id, created_at);
  → Para queries: range queries por fecha
```

