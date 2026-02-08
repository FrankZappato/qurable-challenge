# Explicación Sencilla: Infraestructura, Deploy y Endpoints

## 📚 TABLA DE CONTENIDOS

- [PARTE 1: Infraestructura AWS Explicada](#parte-1-infraestructura-aws-explicada)
- [PARTE 2: Estrategia de Deployment](#parte-2-estrategia-de-deployment)
- [PARTE 3: Endpoints Explicados](#parte-3-endpoints-explicados)

---

# PARTE 1: Infraestructura AWS Explicada

## ¿Qué es la Infraestructura?

Piensa en un restaurante:
- **Comida** = Los cupones (datos)
- **Mesero** = El servidor (backend)
- **Caja/Dinero** = La base de datos (almacenamiento)
- **Despensa** = La memoria caché (almacenamiento rápido)
- **Entrada** = El balanceador de carga (distribuidor de clientes)

## Los Componentes (De Afuera hacia Adentro)

### 1️⃣ **Application Load Balancer (ALB)** - El Recepcionista

**¿Qué es?**
- Es la puerta de entrada de tu aplicación
- Distribuye el tráfico entre múltiples servidores

**¿Por qué?**
- Si un servidor cae, no se caen todos
- Si hay mucho tráfico, lo distribuye entre varios
- Maneja HTTPS (encriptación) segura

**¿Cómo funciona?**
```
Usuario visita: https://qurable.com
       ↓
ALB recibe la petición
       ↓
ALB dice: "Te mando al Servidor 1"
       ↓
Servidor responde con los cupones
       ↓
ALB retorna respuesta al usuario
```

**Analogía**: Es como la recepcionista de un hotel que dice "ahorita te asigno una habitación (servidor)"

---

### 2️⃣ **ECS Fargate** - Los Servidores

**¿Qué es?**
- Es donde corre tu código Node.js
- AWS lo administra automáticamente (sin que hagas mantenimiento)

**¿Por qué este servicio?**
- NO tienes que parchear servidores (lo hace AWS)
- Escala automáticamente (si hay más usuarios, crea más servidores)
- Pagas solo por lo que usas

**¿Cómo funciona?**
```
Tu código Node.js
       ↓
Se mete en un "contenedor" (caja aislada)
       ↓
ECS ejecuta ese contenedor
       ↓
Escucha en puerto 3000
       ↓
ALB le manda peticiones
```

**Configuración:**
- 2-10 servidores (según demanda)
- Cada uno: 0.5 CPU y 1 GB RAM
- Auto-escalado: si CPU > 70%, crea otro servidor

**Analogía**: Son como camareros que aparecen y desaparecen según la cantidad de clientes

---

### 3️⃣ **RDS PostgreSQL** - La Base de Datos

**¿Qué es?**
- Almacena todos los datos: cupones, asignaciones, usuarios
- PostgreSQL es la marca de base de datos (muy confiable)

**¿Por qué PostgreSQL?**
- Muy segura (ACID = garantiza que tus datos no se pierdan)
- Soporta transacciones (operaciones que deben pasar juntas o nada)
- SELECT FOR UPDATE = bloqueo para evitar conflictos

**¿Cómo funciona?**

```
ECS (servidor) dice: "Dame el cupón XYZ"
       ↓
RDS busca en la base de datos
       ↓
RDS devuelve el cupón
       ↓
ECS responde al usuario
```

**Características:**
- **Multi-AZ**: Hay 2 copias en diferentes ubicaciones (si una cae, la otra está lista)
- **Automated Backups**: Cada noche hace una copia de seguridad
- **db.t4g.medium**: Servidor mediano con 4 GB RAM

**Analogía**: Es como el archivo de un banco, donde guardan todos los registros de manera muy segura

---

### 4️⃣ **ElastiCache Redis** - La Memoria Rápida

**¿Qué es?**
- Una base de datos MUY rápida solo en memoria
- Se usa para cosas que necesitan respuesta inmediata

**¿Por qué Redis?**
- BASE DE DATOS es lenta (busca en disco)
- REDIS es ultra rápida (busca en RAM)
- Perfecta para bloqueos temporales (lock + TTL)

**¿Cómo funciona en nuestro sistema?**

```
Usuario intenta redimir un cupón
       ↓
Preguntamos a REDIS: ¿Está este cupón bloqueado?
       ↓
REDIS responde INSTANTLY (en microsegundos)
       ↓
Si está bloqueado: RECHAZAMOS la redención
Si no: Continúa el proceso
```

**Casos de uso:**
- **Lock**: Un cupón está en carrito de otro usuario (bloquea por 5 min)
- **TTL (Time To Live)**: Auto-expira si no se usa
- **Redis Cluster**: 2 nodos (si uno cae, el otro responde)

**Analogía**: Es como una pizarra que todos ven en tiempo real, y si algo cambia, todos lo ven al instante

---

### 5️⃣ **VPC (Red Privada)** - La Red Segura

**¿Qué es?**
- Una red privada dentro de AWS donde vive tu aplicación
- Nadie de internet puede entrar directamente

**¿Cómo funciona?**
```
Internet → ALB (puerta de entrada)
              ↓
           VPC (red privada)
              ├→ ECS (servidores)
              ├→ RDS (base de datos)
              └→ Redis (caché)
```

**Security Groups** (reglas de firewall):
- ALB: Acepta HTTP/HTTPS de cualquiera
- ECS: Solo acepta del ALB
- RDS: Solo acepta de ECS
- Redis: Solo acepta de ECS

**Analogía**: Es como una casa con una entrada (ALB) y habitaciones interiores (ECS, RDS, Redis) que solo se comunican entre sí

---

## 📊 Diagrama Completo de Infraestructura

```
┌─────────────────────────────────────────────────────────────┐
│                     INTERNET (Usuarios)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
                       ▼
        ┌──────────────────────────────┐
        │  ALB (Balanceador de Carga)  │
        │  • Distribuye tráfico        │
        │  • Encripta (SSL/TLS)        │
        └──────────────┬───────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
    ┌────────────┐            ┌────────────┐
    │ ECS Task 1 │            │ ECS Task 2 │
    │ Node.js    │            │ Node.js    │
    │ Puerto 3000│            │ Puerto 3000│
    └────┬───────┘            └────┬───────┘
         │                         │
         └────────────┬────────────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
    ┌──────────────┐        ┌──────────────┐
    │ REDIS        │        │  RDS         │
    │ (Caché)      │        │  PostgreSQL  │
    │ Locks + TTL  │        │  (Datos)     │
    └──────────────┘        └──────────────┘
```

---

# PARTE 2: Estrategia de Deployment

## ¿Qué es Deployment?

**Deployment** = Llevar tu código del computador personal a producción (servidores reales)

Pasos:
1. Escribes código localmente
2. Haces push a GitHub
3. GitHub Actions ejecuta tests automáticamente
4. Si todo pasa, automáticamente se sube a AWS
5. AWS corre tu aplicación

## El Flujo Paso a Paso

### Paso 1: Desarrollador hace PUSH a GitHub

```
Tu computador local:
  - Cambias el código
  - git add .
  - git commit -m "Arreglé el endpoint de redención"
  - git push origin main
       ↓
GitHub recibe el push
```

### Paso 2: GitHub Actions (CI - Continuous Integration)

**¿Qué es CI?**
- Tests automáticos que verifican que tu código no rompió nada

```
GitHub Actions automáticamente:
  1. Descarga el código
  2. npm ci (instala dependencias)
  3. npm run lint (verifica si el código se ve bien)
  4. npm test (ejecuta tests)
  5. npm run build (compila TypeScript)
       ↓
Si todo OK → Continúa
Si algo falla → RECHAZA el deploy (no lo sube)
```

### Paso 3: Build Docker Image

```
GitHub Actions:
  1. Lee el archivo Dockerfile
  2. Crea "imagen" (foto del código + dependencias)
  3. La sube a ECR (almacén de AWS)
```

### Paso 4: Deploy a ECS (CD - Continuous Deployment)

**¿Qué es CD?**
- Automáticamente lanza el código a producción

```
Algoritmo de deployment:
  1. Crea 2 nuevas tareas ECS (servidores nuevos)
  2. Espera que levanten (healthy check)
  3. ALB empieza a mandar tráfico a los nuevos
  4. Los viejos servidores se apagan
       ↓
Transición suave = nadie ve el cambio
```

### Paso 5: Migraciones de Base de Datos

```
Después de deployment:
  1. Ejecuta npm run typeorm migration:run
  2. Actualiza las tablas de PostgreSQL
  3. Si falla → automático rollback
```

## Estrategia de Escalabilidad

### ¿Qué pasa si hay mucho tráfico?

```
Normal (10K users/día):
  ECS: 2 servidores

Black Friday (1M users/día):
  AWS ve que CPU > 70%
       ↓
  Automáticamente crea más servidores
       ↓
  ECS: 5-10 servidores
       ↓
  ALB distribuye a todos

Después (vuelve a normal):
  AWS ve que CPU < 50%
       ↓
  Baja los servidores extra
       ↓
  Ahorras dinero
```

### Reserva Anticipada (Black Friday)

```
Antes de Black Friday:
  Dices a AWS: "Quiero 20 servidores listos"
  AWS: "OK, pero ese día cierro carreteras si es necesario"
       ↓
  Más servidores = no hay lag
```

## Monitoreo (¿Cómo sabemos si todo está bien?)

```
CloudWatch (servicio de AWS) mira:
  ✓ CPU de ECS: ¿Está al 70%? → Normal
  ✓ Memoria: ¿Hay suficiente RAM? → Normal
  ✓ Errores de base de datos: ¿Hay timeouts? → ALERTA
  ✓ Latencia: ¿Las respuestas son rápidas? → Normal
       ↓
Si algo está mal:
  AWS envía email: "Oye, la CPU está al 95%"
```

## Rollback (¿Qué pasa si algo sale mal?)

```
Escenario: Nuevo deployment tiene bug

Opción 1 - Automático (Blue/Green):
  AWS detecta: "Hmm, 5% de requests fallan"
       ↓
  Automáticamente vuelve al deployment anterior
       ↓
  Bug solucionado (usuarios no notan nada)

Opción 2 - Manual:
  DevOps ve alerta
       ↓
  Ejecuta: aws ecs update-service ... --task-definition qurable-api:1
       ↓
  Vuelve a la versión que funcionaba
```

---

# PARTE 3: Endpoints Explicados

## Base URL
```
http://localhost:3000/api/v1
```

---

## 🏆 COUPON BOOKS (Libros de Cupones)

### 1. **POST /coupon-books** - Crear un libro de cupones

**¿Para qué?**
- Imagina que una tienda quiere hacer una promoción "Descuento de Verano"
- Primero crea un "libro" que agrupe todos esos cupones

**¿Qué envías?**
```json
{
  "businessId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Verano 2026",
  "description": "Saca 20% en toda la tienda",
  "maxCodesPerUser": 2,        // ¿Cuántos cupones puede tener cada usuario?
  "maxRedeemsPerUser": 1,      // ¿Cuántas veces puede usar cada cupón?
  "totalCodesExpected": 1000,  // ¿Cuántos cupones vamos a crear en total?
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

**¿Qué pasa internamente?**
```
1. Validar datos (¿UUIDs son válidos? ¿números positivos?)
2. Guardar en PostgreSQL
3. Estado = DRAFT (borrador, no activo aún)
4. Retornar el libro creado
```

**¿Qué recibes?**
```json
{
  "id": "76fafd1e-332b-47bf-a345-a60ef2e65b23",
  "businessId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Verano 2026",
  "status": "DRAFT",  // ← Aún no activo
  "generatedCount": 0,  // ← 0 cupones generados aún
  "isActive": false
}
```

**Analogía**: Es como crear un cartuchera vacía. El cartuchera existe, pero aún no tiene lápices (cupones)

---

### 2. **GET /coupon-books** - Ver todos los libros

**¿Para qué?**
- Ver qué promociones vigentes hay

**Ejemplo:**
```
GET /coupon-books?businessId=550e8400&status=ACTIVE
```

**Interno:**
```
1. QueryBuilder busca en PostgreSQL
2. WHERE businessId = ? AND status = 'ACTIVE'
3. ORDER BY createdAt DESC
4. Retorna lista
```

**Respuesta:**
```json
[
  {
    "id": "76fafd1e...",
    "name": "Verano 2026",
    "status": "ACTIVE",
    "generatedCount": 500  // Ya hay 500 cupones generados
  },
  {
    "id": "abc123...",
    "name": "Navidad 2025",
    "status": "CLOSED"  // Terminó
  }
]
```

---

### 3. **GET /coupon-books/:id** - Ver un libro específico

**¿Para qué?**
- Ver detalles de una promoción

```
GET /coupon-books/76fafd1e-332b-47bf-a345-a60ef2e65b23
```

**Respuesta:**
```json
{
  "id": "76fafd1e-332b-47bf-a345-a60ef2e65b23",
  "name": "Verano 2026",
  "description": "Saca 20% en toda la tienda",
  "generatedCount": 500,
  "totalCodesExpected": 1000,
  "maxCodesPerUser": 2,
  "maxRedeemsPerUser": 1
}
```

---

## 💳 COUPON CODES (Códigos de Cupones)

### 4. **POST /coupon-codes/generate** - Generar códigos

**¿Para qué?**
- Crear 1000 códigos para el libro "Verano 2026"
- Ejemplo: ABC123, DEF456, GHI789, etc.

**¿Qué envías?**
```json
{
  "couponBookId": "76fafd1e-332b-47bf-a345-a60ef2e65b23",
  "quantity": 1000,  // Quiero 1000 códigos
  "pattern": "SUMMER-{XXXX}"  // Formato: SUMMER-1234
}
```

**¿Qué pasa?**
```
1. Valida que el libro existe
2. Loop 1000 veces:
   - Genera código único
   - Lo inserta en PostgreSQL
3. Retorna: "Generados 1000 códigos"
```

**Respuesta:**
```json
{
  "generatedCount": 1000,
  "couponBookId": "76fafd1e-..."
}
```

**Analogía**: Es como imprimir 1000 boletos de rifa. Cada uno tiene un número único

---

### 5. **POST /coupon-codes/upload** - Subir códigos en CSV

**¿Para qué?**
- A veces tienes códigos de un proveedor
- Necesitas subirlos en lote

**¿Qué envías?**
```
Archivo CSV:
ABC123,valid
DEF456,valid
GHI789,valid
```

**¿Qué pasa?**
```
1. Lee el CSV
2. Detecta duplicados (si ABC123 aparece 2 veces, rechaza)
3. Inserta todos en PostgreSQL
4. Retorna resultados
```

**Respuesta:**
```json
{
  "uploadedCount": 3,
  "duplicatesCount": 0,
  "invalidRowsCount": 0
}
```

---

### 6. **GET /coupon-codes/book/:bookId** - Ver códigos de un libro

**¿Para qué?**
- Ver qué códigos hay disponibles

```
GET /coupon-codes/book/76fafd1e-...?status=AVAILABLE&limit=50
```

**Respuesta:**
```json
{
  "data": [
    {
      "id": "code-001",
      "code": "SUMMER-1234",
      "status": "AVAILABLE",  // Nadie lo tiene aún
      "isAssigned": false
    },
    {
      "id": "code-002",
      "code": "SUMMER-5678",
      "status": "AVAILABLE"
    }
  ],
  "total": 900  // 900 disponibles de 1000
}
```

---

## 👤 ASSIGNMENTS (Asignaciones)

### 7. **POST /assignments/random** - Regalar un cupón aleatorio

**Tipo: USE CASE #1**

**¿Para qué?**
- El usuario pide "Dame un cupón al azar del libro Verano"
- Se le da uno automáticamente

**¿Qué envías?**
```json
{
  "couponBookId": "76fafd1e-332b-47bf-a345-a60ef2e65b23",
  "userId": "user-001"
}
```

**¿Qué pasa internamente? (muy importante)**

```
1. Comienza transacción PostgreSQL
2. SELECT * FROM coupon_books WHERE id = ? FOR UPDATE
   ↳ Bloquea el libro (nadie más lo puede modificar)
   
3. Valida:
   - ¿El libro existe?
   - ¿El usuario ya tiene 2 cupones? (si maxCodesPerUser=2, rechaza)
   
4. Busca código disponible:
   SELECT * FROM coupon_codes 
   WHERE couponBookId = ? AND isAssigned = FALSE
   ORDER BY RANDOM()  ← ¡ALEATORIO!
   LIMIT 1
   FOR UPDATE SKIP LOCKED  ← Ayuda a evitar conflictos
   
5. Marca código como asignado:
   UPDATE coupon_codes SET isAssigned = TRUE WHERE id = ?
   
6. Crea asignación:
   INSERT INTO coupon_assignments (...)
   VALUES (userId, code, status='ASSIGNED', ...)
   
7. COMMIT → Guarda todo
8. Retorna cupón al usuario
```

**Diagrama de flujo:**

```
Usuario A: "Dame un cupón"
       ↓
System: "Bloqueo el libro"
       ↓
System: "¿Usuario A tiene < 2 cupones? SÍ"
       ↓
System: "Busco código aleatorio disponible"
       ↓
System: "Encontré SUMMER-4532"
       ↓
System: "Lo marco como asignado"
       ↓
System: "Creo registro de asignación"
       ↓
System: "COMMIT (guardo todo)"
       ↓
Sistema responde: {
  "code": "SUMMER-4532",
  "status": "ASSIGNED",
  "assignedAt": "2026-02-07T10:00:00Z"
}
```

**Respuesta:**
```json
{
  "id": "assignment-001",
  "code": "SUMMER-4532",
  "status": "ASSIGNED",  // Estado: asignado
  "assignedAt": "2026-02-07T10:00:00Z"
}
```

---

### 8. **POST /assignments/:code** - Regalar un cupón específico

**¿Para qué?**
- El usuario dice "Quiero específicamente el código SUMMER-4532"
- Se le da si está disponible

**¿Qué envías?**
```json
{
  "userId": "user-001"
}
```

**El flujo es igual a Random, pero:**
```
Diferencia:
  - Random: Busca ANY código disponible
  - Específico: Busca SOLO ese código
```

---

### 9. **GET /assignments/user/:userId** - Ver los cupones de un usuario

**¿Para qué?**
- Usuario quiere ver: "¿Qué cupones tengo?"

```
GET /assignments/user/user-001
```

**Respuesta:**
```json
[
  {
    "id": "assignment-001",
    "code": "SUMMER-4532",
    "status": "ASSIGNED",
    "assignedAt": "2026-02-07T10:00:00Z"
  },
  {
    "id": "assignment-002",
    "code": "SUMMER-7890",
    "status": "ASSIGNED"
  }
]
```

---

## 🔒 REDEMPTION (Redención - Usar cupones)

### 10. **POST /coupons/:code/lock** - Bloquear un cupón

**Tipo: USE CASE #4**

**¿Para qué?**
- Usuario añade un cupón a su carrito de compra
- Pero aún no compra (está "reservando" el cupón)
- Otros usuarios no pueden usarlo mientras está bloqueado

**¿Qué envías?**
```json
{
  "userId": "user-001"
}
```

**¿Qué pasa?**

```
1. Busca la asignación:
   SELECT * FROM coupon_assignments 
   WHERE code = ? FOR UPDATE
   ↳ Bloquea para que nadie más la modifique

2. Valida:
   - ¿El cupón le pertenece a este usuario?
   - ¿El cupón está en estado ASSIGNED o LOCKED?

3. Actualiza base de datos:
   UPDATE coupon_assignments 
   SET status = 'LOCKED'
   WHERE code = ?

4. Guarda en REDIS (memoria rápida):
   Redis.SETEX(
     key: "coupon:lock:SUMMER-4532",
     ttl: 300 segundos (5 minutos),
     value: {userId, metadata}
   )

5. Crea auditoría:
   INSERT INTO redemption_audit
   VALUES (action='LOCK', userId, status transition...)

6. COMMIT
```

**Diagrama:**

```
Usuario está comprando:
  - Mete cupón a carrito
  - Sistema bloquea cupón por 5 minutos
       ↓
Usuario está decidiendo:
  - Aún no paga
  - El cupón sigue bloqueado (otros no pueden usarlo)
       ↓
Si pasan 5 minutos sin comprar:
  - Redis TTL expira
  - Cupón se desbloquea automáticamente
  - Otro usuario puede usarlo
       ↓
Si usuario compra dentro de 5 min:
  - Llamamos a REDEEM
  - Cupón se usa
```

**Respuesta:**
```json
{
  "code": "SUMMER-4532",
  "status": "LOCKED",
  "lockedAt": "2026-02-07T10:05:00Z",
  "lockedUntil": "2026-02-07T10:10:00Z"  // 5 minutos después
}
```

**Analogía**: Es como reservar una venta en un restaurante. Hasta que no cierres el pedido, la mesa está reservada para ti

---

### 11. **POST /coupons/:code/unlock** - Desbloquear un cupón

**Tipo: USE CASE #5**

**¿Para qué?**
- Usuario sacó el cupón del carrito
- Lo devuelve sin usar
- Ahora otros pueden usarlo

**¿Qué envías?**
```json
{
  "userId": "user-001"
}
```

**¿Qué pasa?**

```
1. Busca asignación:
   SELECT * FROM coupon_assignments 
   WHERE code = ? FOR UPDATE

2. Valida:
   - ¿Le pertenece al usuario?
   - ¿Está bloqueado?

3. Actualiza base de datos:
   UPDATE coupon_assignments 
   SET status = 'ASSIGNED'

4. Limpia REDIS:
   Redis.DEL("coupon:lock:SUMMER-4532")

5. Crea auditoría:
   INSERT INTO redemption_audit
   VALUES (action='UNLOCK', ...)

6. COMMIT
```

**Respuesta:**
```json
{
  "code": "SUMMER-4532",
  "status": "ASSIGNED"  // ← Vuelve a estar disponible
}
```

---

### 12. **POST /coupons/:code/redeem** - Usar el cupón

**Tipo: USE CASE #3 + #6**

**¿Para qué?**
- Usuario confirmó la compra con el cupón
- Ahora se usa (se tira el cupón)

**¿Qué envías?**
```json
{
  "userId": "user-001"
}
```

**¿Qué pasa? (MUY IMPORTANTE)**

```
1. BEGIN TRANSACTION

2. Busca asignación con bloqueo:
   SELECT ca.*, cc.*, cb.maxRedeemsPerUser
   FROM coupon_assignments ca
   JOIN coupon_codes cc
   JOIN coupon_books cb
   WHERE ca.code = ?
   FOR UPDATE OF ca

3. Valida:
   - ¿Le pertenece al usuario?
   - ¿Está en estado ASSIGNED o LOCKED?
   - ¿Cuántas veces lo ha redimido? (redeemCount)
   - ¿Está dentro del límite? (maxRedeemsPerUser)

4. LÓGICA CRÍTICA - Multi-Redeem:
   
   Escenario A - Cupón de un solo uso (maxRedeemsPerUser=1):
   ├─ redeemCount = 0
   ├─ Usuario redime una vez
   ├─ redeemCount = 1
   ├─ Status = REDEEMED (¡TERMINADO!)
   
   Escenario B - Cupón de múltiple uso (maxRedeemsPerUser=3):
   ├─ redeemCount = 0
   ├─ Usuario redime (1ra vez)
   ├─ redeemCount = 1
   ├─ Status = ASSIGNED (sigue disponible)
   │
   ├─ Usuario redime (2da vez)
   ├─ redeemCount = 2
   ├─ Status = ASSIGNED (sigue disponible)
   │
   ├─ Usuario redime (3ra vez)
   ├─ redeemCount = 3
   ├─ Status = REDEEMED (¡TERMINADO!)

5. Incrementa contador:
   UPDATE coupon_assignments
   SET redeemCount = redeemCount + 1
   WHERE id = ?

6. Si fue la última redención:
   UPDATE coupon_assignments
   SET status = 'REDEEMED'

7. Limpia REDIS (si estaba bloqueado):
   Redis.DEL("coupon:lock:SUMMER-4532")

8. Crea auditoría completa:
   INSERT INTO redemption_audit
   VALUES (
     action='REDEEM',
     previousStatus=LOCKED,
     newStatus=REDEEMED,
     redeemCount=1,
     maxRedeems=1,
     isFinalRedeem=true,  ← ¿Es la última?
     userId,
     ipAddress,
     userAgent,
     metadata={}
   )

9. COMMIT
```

**Diagrama de máquina de estados:**

```
CUPÓN DE 1 USO:
AVAILABLE → ASSIGNED → LOCKED → REDEEMED ✓

CUPÓN DE 3 USOS:
AVAILABLE → ASSIGNED ─┐
                      ├→ LOCKED → REDEEM (1ra) → ASSIGNED
                      ├→ LOCKED → REDEEM (2da) → ASSIGNED
                      └→ LOCKED → REDEEM (3ra) → REDEEMED ✓
```

**Respuesta:**
```json
{
  "code": "SUMMER-4532",
  "status": "REDEEMED",  // ← ¡USADO!
  "redeemCount": 1,
  "maxRedeems": 1,
  "isFinalRedeem": true,  // ← ¿Era la última?
  "redeemedAt": "2026-02-07T10:08:00Z"
}
```

---

### 13. **GET /health** - Check de salud

**¿Para qué?**
- AWS/cloudwatch verifica que el servidor esté vivo

```
GET /health
```

**Respuesta:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-07T10:00:00Z",
  "database": "connected",
  "redis": "connected"
}
```

---

## 📊 Tabla Resumida de Endpoints

| # | Método | Ruta | Propósito | Use Case |
|----|--------|------|-----------|----------|
| 1 | POST | /coupon-books | Crear promo | Setup |
| 2 | GET | /coupon-books | Listar promos | Setup |
| 3 | GET | /coupon-books/:id | Ver promo | Setup |
| 4 | POST | /coupon-codes/generate | Generar códigos | Setup |
| 5 | POST | /coupon-codes/upload | Subir códigos CSV | Setup |
| 6 | GET | /coupon-codes/book/:bookId | Listar códigos | Setup |
| 7 | POST | /assignments/random | Asignar al azar | #1 |
| 8 | POST | /assignments/:code | Asignar específico | #2 |
| 9 | GET | /assignments/user/:userId | Ver mis cupones | #2 |
| 10 | POST | /coupons/:code/lock | Bloquear cupón | #4 |
| 11 | POST | /coupons/:code/unlock | Desbloquear cupón | #5 |
| 12 | POST | /coupons/:code/redeem | Usar cupón | #3 + #6 |
| 13 | GET | /health | Health check | Monitor |

---

## 🎯 Flujo Completo de Usuario

Paso a paso cómo un usuario interactúa con el sistema:

```
1. SETUP (Admin/Empresa)
   Admin: POST /coupon-books
   Admin: POST /coupon-codes/generate (1000 códigos)
   Admin: PUT /coupon-books/:id → status = ACTIVE
   ✓ Sistema listo

2. USUARIO RECIBE CUPÓN
   Usuario: POST /assignments/random
   Sistema: Busca código aleatorio, lo asigna
   Respuesta: {code: "SUMMER-4532", status: "ASSIGNED"}
   ✓ Usuario tiene cupón

3. USUARIO VE SUS CUPONES
   Usuario: GET /assignments/user/:userId
   Respuesta: [cupón1, cupón2]
   ✓ Usuario ve lista

4. USUARIO COMPRA (con cupón guardado)
   Usuario: Pone cupón en carrito
   Sistema: POST /coupons/SUMMER-4532/lock
   Respuesta: {status: "LOCKED", lockedUntil: "..."}
   ✓ Cupón bloqueado por 5 min

5. USUARIO SE ARREPIENTE
   Usuario: Remueve cupón del carrito
   Sistema: POST /coupons/SUMMER-4532/unlock
   Respuesta: {status: "ASSIGNED"}
   ✓ Cupón disponible nuevamente

6. O... USUARIO CONFIRMA COMPRA
   Usuario: Confirma pedido
   Sistema: POST /coupons/SUMMER-4532/redeem
   Respuesta: {status: "REDEEMED", redeemCount: 1}
   ✓ Cupón usado (¡no se puede volver a usar!)

7. REPORTES
   Admin: GET /coupon-codes/book/:bookId
   Respuesta: 
     - Totales: 1000
     - Disponibles: 500
     - Asignados: 300
     - Utilizados: 200
   ✓ Admin ve estadísticas
```

---

## 🔐 Mecanismos de Seguridad

### Problema #1: Race Condition (2 usuarios usan el mismo cupón)

```
SIN PROTECCIÓN:
Usuario A: Lee cupón SUMMER-4532
Usuario B: Lee cupón SUMMER-4532
Usuario A: Lo usa
Usuario B: Lo usa
❌ ¡Dos usuarios con el mismo cupón!

CON POSTGRESQL LOCK (SELECT FOR UPDATE):
Usuario A: SELECT * FOR UPDATE ← Bloquea
Usuario B: SELECT * FOR UPDATE ← ESPERA
Usuario A: Usa cupón, COMMIT
Usuario B: Ahora puede leer, pero ve que status=REDEEMED
Usuario B: Error "Ya fue usado"
✓ Seguro
```

### Problema #2: Alguien roba un cupón después de bloquearlo

```
Sin REDIS lock:
Usuario A: POST /lock
Usuario A: Se va (no compra)
Usuario A: Luego POST /redeem (¡después de horas!)
❌ Puede usar un cupón anejo

Con REDIS TTL (5 minutos):
Usuario A: POST /lock
Redis: "Este cupón está bloqueado hasta las 10:05"
Usuario B: "Quiero usarlo" → ERROR "Está bloqueado"
10:05: Redis auto-expira
Usuario B: Ahora sí puede usarlo
✓ Cupón reservado solo 5 minutos
```

---

## 💡 Resumen de Conceptos

| Concepto | Explicación Simple |
|----------|------------------|
| **UUID** | Identificador único (como número de serie de pasaporte) |
| **Status** | Estado actual (AVAILABLE, ASSIGNED, LOCKED, REDEEMED) |
| **TRANSACTION** | Operación "todo o nada" (si falla un step, se revierte todo) |
| **FOR UPDATE** | Bloqueo que dice "Nadie toque esto hasta que termine" |
| **TTL (Time To Live)** | Tiempo de vida (después expira automáticamente) |
| **Audit Trail** | Registro de quién hizo qué y cuándo |
| **Metadata** | Información extra (ej: IP, navegador, notas) |
| **Carrera De Datos** | 2+ procesos acceden al mismo dato al mismo tiempo |

---

## 📚 Ejemplo Completo: Un Usuario USA un Cupón de INICIO a FIN

```
Paso 1: Admin crea campaña "Verano 2026"
POST /coupon-books
{
  "name": "Verano 2026",
  "maxRedeemsPerUser": 1,
  "maxCodesPerUser": 2,
  "totalCodesExpected": 1000
}
Respuesta: {id: "book-001", status: "DRAFT"}

Paso 2: Admin genera códigos
POST /coupon-codes/generate
{
  "couponBookId": "book-001",
  "quantity": 1000
}
Respuesta: {generatedCount: 1000}

Paso 3: Admin activa la campaña
PUT /coupon-books/book-001
{status: "ACTIVE"}

═══════════════════════════════════════════════

Paso 4: Usuario Juan se entera de la promo
Juan: "Quiero un cupón"
POST /assignments/random
{
  "couponBookId": "book-001",
  "userId": "juan-001"
}
Respuesta:
{
  "code": "SUMMER-4532",
  "status": "ASSIGNED",
  "assignedAt": "2026-02-07 10:00 AM"
}
✓ Juan tiene cupón

Paso 5: Juan ve sus cupones
GET /assignments/user/juan-001
Respuesta:
[
  {
    "code": "SUMMER-4532",
    "status": "ASSIGNED"
  }
]
✓ Confirmado

Paso 6: Juan va de compras, mete el cupón en carrito
Juan: "Quiero usar este cupón"
POST /coupons/SUMMER-4532/lock
{
  "userId": "juan-001"
}
Respuesta:
{
  "code": "SUMMER-4532",
  "status": "LOCKED",
  "lockedUntil": "2026-02-07 10:05 AM"
}
✓ Cupón bloqueado (nadie más lo puede usar)

Paso 7: Juan se arrepiente, lo saca del carrito
Juan: "Quito el cupón del carrito"
POST /coupons/SUMMER-4532/unlock
{
  "userId": "juan-001"
}
Respuesta:
{
  "code": "SUMMER-4532",
  "status": "ASSIGNED"
}
✓ Cupón disponible nuevamente

[O si no se arrepiente...]

Paso 7B: Juan confirma compra
Juan: "Confirmo mi compra con el cupón"
POST /coupons/SUMMER-4532/redeem
{
  "userId": "juan-001"
}
Respuesta:
{
  "code": "SUMMER-4532",
  "status": "REDEEMED",
  "redeemCount": 1,
  "maxRedeems": 1,
  "isFinalRedeem": true
}
✓ Cupón USADO (¡No se puede volver a usar!)

Paso 8: Juan intenta usar el cupón de nuevo
Juan: "Quiero apagar este otro cupón"
POST /coupons/SUMMER-4532/redeem
Error: {
  "error": "Coupon already redeemed"
}
✓ Seguridad funcionando
```

---

**Última actualización**: 7 de febrero de 2026  
**Versión**: 1.0.0  
**Para**: Entender la arquitectura y endpoints de Qurable
