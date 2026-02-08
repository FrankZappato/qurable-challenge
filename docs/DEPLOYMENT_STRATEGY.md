# Estrategia de Deployment - Arquitectura AWS

Este documento detalla la estrategia completa de deployment del sistema de gestión de cupones en AWS, incluyendo arquitectura, proceso de deployment, escalabilidad, monitoreo y estimación de costos.

---

## 📋 Tabla de Contenidos

- [1. Arquitectura de Infraestructura](#1-arquitectura-de-infraestructura)
- [2. Componentes AWS](#2-componentes-aws)
- [3. Proceso de Deployment](#3-proceso-de-deployment)
- [4. Estrategia de Escalabilidad](#4-estrategia-de-escalabilidad)
- [5. CI/CD Pipeline](#5-cicd-pipeline)
- [6. Seguridad](#6-seguridad)
- [7. Monitoreo y Observabilidad](#7-monitoreo-y-observabilidad)
- [8. Disaster Recovery](#8-disaster-recovery)
- [9. Estimación de Costos](#9-estimación-de-costos)

---

## 1. Arquitectura de Infraestructura

### Diagrama de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                        Internet Gateway                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Application Load Balancer (ALB)                 │
│              • SSL/TLS Termination (ACM Certificate)             │
│              • Health Checks: /health                            │
│              • Target Groups: Node.js ECS Tasks                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴──────────────┐
                ▼                            ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   VPC: 10.0.0.0/16       │  │   VPC: 10.0.0.0/16       │
│   AZ: us-east-1a         │  │   AZ: us-east-1b         │
│                          │  │                          │
│  ┌────────────────────┐  │  │  ┌────────────────────┐  │
│  │  ECS Fargate Task  │  │  │  │  ECS Fargate Task  │  │
│  │  Node.js 18 LTS    │  │  │  │  Node.js 18 LTS    │  │
│  │  • CPU: 0.5 vCPU   │  │  │  │  • CPU: 0.5 vCPU   │  │
│  │  • RAM: 1 GB       │  │  │  │  • RAM: 1 GB       │  │
│  │  • Port: 3000      │  │  │  │  • Port: 3000      │  │
│  └────────────────────┘  │  │  └────────────────────┘  │
│           │              │  │           │              │
│           ▼              │  │           ▼              │
│  ┌────────────────────┐  │  │  ┌────────────────────┐  │
│  │ ElastiCache Redis  │◄─┼──┼─►│ ElastiCache Redis  │  │
│  │ (Cluster Mode)     │  │  │  │ (Replica Node)     │  │
│  │ • r6g.large        │  │  │  │ • r6g.large        │  │
│  │ • 13.07 GB RAM     │  │  │  │ • Read Replica     │  │
│  └────────────────────┘  │  │  └────────────────────┘  │
└──────────────────────────┘  └──────────────────────────┘
                │                           │
                └───────────┬───────────────┘
                            ▼
        ┌──────────────────────────────────────────┐
        │    Amazon RDS PostgreSQL 15               │
        │    • db.t4g.medium (2 vCPU, 4 GB RAM)    │
        │    • Multi-AZ Deployment                  │
        │    • Automated Backups (7 days)           │
        │    • Read Replica (Optional)              │
        │    • Storage: 100 GB gp3 (Auto-scaling)   │
        └──────────────────────────────────────────┘
                            │
                            ▼
        ┌──────────────────────────────────────────┐
        │         Amazon S3 Buckets                 │
        │    • Logs: s3://qurable-logs/             │
        │    • Backups: s3://qurable-backups/       │
        │    • Static Assets (if needed)            │
        └──────────────────────────────────────────┘
```

---

## 2. Componentes AWS

### 2.1 Amazon ECS Fargate

**Configuración del Cluster**:
```json
{
  "cluster": "qurable-production",
  "launchType": "FARGATE",
  "platformVersion": "LATEST",
  "networkMode": "awsvpc"
}
```

**Task Definition**:
```json
{
  "family": "qurable-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "qurable-backend",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/qurable-api:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "3000" },
        { "name": "DB_HOST", "value": "qurable-db.cluster-xxxxx.us-east-1.rds.amazonaws.com" },
        { "name": "REDIS_HOST", "value": "qurable-redis.xxxxx.cache.amazonaws.com" }
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:qurable/db-password"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:qurable/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/qurable-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

**Auto Scaling Configuration**:
```json
{
  "targetTrackingScalingPolicies": [
    {
      "targetValue": 70.0,
      "predefinedMetricSpecification": {
        "predefinedMetricType": "ECSServiceAverageCPUUtilization"
      },
      "scaleOutCooldown": 60,
      "scaleInCooldown": 300
    },
    {
      "targetValue": 75.0,
      "predefinedMetricSpecification": {
        "predefinedMetricType": "ECSServiceAverageMemoryUtilization"
      }
    }
  ],
  "minCapacity": 2,
  "maxCapacity": 10
}
```

### 2.2 Amazon RDS PostgreSQL

**Configuración de Instancia**:
```yaml
Engine: postgres
EngineVersion: "15.4"
DBInstanceClass: db.t4g.medium
AllocatedStorage: 100
StorageType: gp3
IOPS: 3000
MultiAZ: true
BackupRetentionPeriod: 7
PreferredBackupWindow: "03:00-04:00"
PreferredMaintenanceWindow: "sun:04:00-sun:05:00"
EnablePerformanceInsights: true
PubliclyAccessible: false
VPCSecurityGroups:
  - sg-0123456789abcdef0  # Allow from ECS tasks only
```

**Parameter Group Optimizations**:
```sql
-- postgresql.conf optimizations
max_connections = 200
shared_buffers = 1GB
effective_cache_size = 3GB
maintenance_work_mem = 256MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1  # For SSD
work_mem = 5MB
```

### 2.3 Amazon ElastiCache Redis

**Configuración del Cluster**:
```yaml
CacheNodeType: cache.r6g.large
Engine: redis
EngineVersion: "7.0"
NumCacheClusters: 2  # Primary + 1 Replica
ReplicationGroupDescription: "Qurable coupon locks cache"
AutomaticFailoverEnabled: true
MultiAZEnabled: true
AtRestEncryptionEnabled: true
TransitEncryptionEnabled: true
SnapshotRetentionLimit: 5
SnapshotWindow: "03:00-05:00"
PreferredMaintenanceWindow: "sun:05:00-sun:07:00"
```

**Configuración de Redis**:
```redis
maxmemory-policy allkeys-lru
timeout 300
tcp-keepalive 300
maxmemory 10gb  # 80% of 13.07 GB
```

### 2.4 Application Load Balancer

**Listener Configuration**:
```json
{
  "listeners": [
    {
      "protocol": "HTTPS",
      "port": 443,
      "certificates": [
        {
          "certificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/xxxxx"
        }
      ],
      "defaultActions": [
        {
          "type": "forward",
          "targetGroupArn": "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/qurable-tg/xxxxx"
        }
      ],
      "sslPolicy": "ELBSecurityPolicy-TLS-1-2-2017-01"
    },
    {
      "protocol": "HTTP",
      "port": 80,
      "defaultActions": [
        {
          "type": "redirect",
          "redirectConfig": {
            "protocol": "HTTPS",
            "port": "443",
            "statusCode": "HTTP_301"
          }
        }
      ]
    }
  ]
}
```

**Target Group**:
```json
{
  "healthCheckEnabled": true,
  "healthCheckPath": "/health",
  "healthCheckIntervalSeconds": 30,
  "healthCheckTimeoutSeconds": 5,
  "healthyThresholdCount": 2,
  "unhealthyThresholdCount": 3,
  "matcher": {
    "httpCode": "200"
  },
  "targetType": "ip",
  "deregistrationDelay": 30
}
```

---

## 3. Proceso de Deployment

### 3.1 Preparación del Ambiente

**1. Crear VPC y Subnets**:
```bash
# VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=qurable-vpc}]'

# Public Subnets (para ALB)
aws ec2 create-subnet --vpc-id vpc-xxxxx --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id vpc-xxxxx --cidr-block 10.0.2.0/24 --availability-zone us-east-1b

# Private Subnets (para ECS + RDS + Redis)
aws ec2 create-subnet --vpc-id vpc-xxxxx --cidr-block 10.0.10.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id vpc-xxxxx --cidr-block 10.0.11.0/24 --availability-zone us-east-1b
```

**2. Configurar Security Groups**:
```bash
# ALB Security Group
aws ec2 create-security-group --group-name qurable-alb-sg --description "ALB security group" --vpc-id vpc-xxxxx
aws ec2 authorize-security-group-ingress --group-id sg-alb --protocol tcp --port 443 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id sg-alb --protocol tcp --port 80 --cidr 0.0.0.0/0

# ECS Tasks Security Group
aws ec2 create-security-group --group-name qurable-ecs-sg --description "ECS tasks security group" --vpc-id vpc-xxxxx
aws ec2 authorize-security-group-ingress --group-id sg-ecs --protocol tcp --port 3000 --source-group sg-alb

# RDS Security Group
aws ec2 create-security-group --group-name qurable-rds-sg --description "RDS security group" --vpc-id vpc-xxxxx
aws ec2 authorize-security-group-ingress --group-id sg-rds --protocol tcp --port 5432 --source-group sg-ecs

# Redis Security Group
aws ec2 create-security-group --group-name qurable-redis-sg --description "Redis security group" --vpc-id vpc-xxxxx
aws ec2 authorize-security-group-ingress --group-id sg-redis --protocol tcp --port 6379 --source-group sg-ecs
```

### 3.2 Deployment Step-by-Step

**Paso 1: Build y Push de Docker Image**
```bash
# Build
docker build -t qurable-api:latest .

# Tag
docker tag qurable-api:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/qurable-api:latest

# Login ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Push
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/qurable-api:latest
```

**Paso 2: Deployment de RDS**
```bash
# Crear DB Subnet Group
aws rds create-db-subnet-group \
  --db-subnet-group-name qurable-db-subnet \
  --db-subnet-group-description "Qurable DB subnet group" \
  --subnet-ids subnet-xxxxx subnet-yyyyy

# Crear RDS Instance
aws rds create-db-instance \
  --db-instance-identifier qurable-db \
  --db-instance-class db.t4g.medium \
  --engine postgres \
  --engine-version 15.4 \
  --master-username qurable_admin \
  --master-user-password $(aws secretsmanager get-secret-value --secret-id qurable/db-password --query SecretString --output text) \
  --allocated-storage 100 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-rds \
  --db-subnet-group-name qurable-db-subnet \
  --multi-az \
  --backup-retention-period 7 \
  --no-publicly-accessible
```

**Paso 3: Deployment de ElastiCache**
```bash
# Crear Subnet Group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name qurable-redis-subnet \
  --cache-subnet-group-description "Qurable Redis subnet group" \
  --subnet-ids subnet-xxxxx subnet-yyyyy

# Crear Replication Group
aws elasticache create-replication-group \
  --replication-group-id qurable-redis \
  --replication-group-description "Qurable Redis cluster" \
  --engine redis \
  --cache-node-type cache.r6g.large \
  --num-cache-clusters 2 \
  --automatic-failover-enabled \
  --multi-az-enabled \
  --cache-subnet-group-name qurable-redis-subnet \
  --security-group-ids sg-redis \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled
```

**Paso 4: Ejecutar Migraciones de Base de Datos**
```bash
# Desde una ECS Task temporal o bastion host
npm run typeorm migration:run
```

**Paso 5: Deployment de ECS Service**
```bash
# Registrar Task Definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Crear Service
aws ecs create-service \
  --cluster qurable-production \
  --service-name qurable-api-service \
  --task-definition qurable-api:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx,subnet-yyyyy],securityGroups=[sg-ecs],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=qurable-backend,containerPort=3000" \
  --health-check-grace-period-seconds 60
```

### 3.3 Rollback Strategy

**Blue/Green Deployment**:
```bash
# Crear nueva Task Definition (versión 2)
aws ecs register-task-definition --cli-input-json file://task-definition-v2.json

# Actualizar Service con deployment config
aws ecs update-service \
  --cluster qurable-production \
  --service qurable-api-service \
  --task-definition qurable-api:2 \
  --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100,deploymentCircuitBreaker={enable=true,rollback=true}"

# Si falla, auto-rollback a versión 1
# O rollback manual:
aws ecs update-service \
  --cluster qurable-production \
  --service qurable-api-service \
  --task-definition qurable-api:1 \
  --force-new-deployment
```

---

## 4. Estrategia de Escalabilidad

### 4.1 Escalado Horizontal (ECS Tasks)

**Auto Scaling basado en métricas**:
```json
{
  "policies": [
    {
      "name": "cpu-scaling",
      "targetTrackingScaling": {
        "targetValue": 70,
        "predefinedMetricType": "ECSServiceAverageCPUUtilization",
        "scaleOutCooldown": 60,
        "scaleInCooldown": 300
      }
    },
    {
      "name": "request-count-scaling",
      "targetTrackingScaling": {
        "targetValue": 1000,
        "customMetricSpecification": {
          "metricName": "RequestCountPerTarget",
          "namespace": "AWS/ApplicationELB",
          "statistic": "Sum"
        },
        "scaleOutCooldown": 60,
        "scaleInCooldown": 180
      }
    }
  ]
}
```

**Scheduled Scaling (previsión de picos)**:
```bash
# Black Friday: 8 AM - 11 PM
aws application-autoscaling put-scheduled-action \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/qurable-production/qurable-api-service \
  --scheduled-action-name black-friday-scale-up \
  --schedule "cron(0 8 * 11 FRI *)" \
  --scalable-target-action MinCapacity=10,MaxCapacity=50
```

### 4.2 Escalado de Base de Datos

**Read Replicas**:
```bash
# Crear Read Replica para queries de solo lectura
aws rds create-db-instance-read-replica \
  --db-instance-identifier qurable-db-replica \
  --source-db-instance-identifier qurable-db \
  --db-instance-class db.t4g.medium
```

**Connection Pooling**:
```typescript
// src/config/database.ts
export const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  replication: {
    master: {
      host: process.env.DB_MASTER_HOST,
      port: 5432,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },
    slaves: [
      {
        host: process.env.DB_REPLICA_HOST,
        port: 5432,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      },
    ],
  },
  extra: {
    max: 20,  // Connection pool size
    min: 5,
    idleTimeoutMillis: 30000,
  },
});
```

### 4.3 Escalado de Redis

**Cluster Mode para distribución de carga**:
```bash
aws elasticache modify-replication-group \
  --replication-group-id qurable-redis \
  --apply-immediately \
  --cache-node-type cache.r6g.xlarge  # Upgrade de large a xlarge
```

---

## 5. CI/CD Pipeline

### 5.1 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS ECS

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: qurable-api
  ECS_CLUSTER: qurable-production
  ECS_SERVICE: qurable-api-service
  CONTAINER_NAME: qurable-backend

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm test
      
      - name: Build TypeScript
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build, tag, and push image to Amazon ECR
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT
      
      - name: Download task definition
        run: |
          aws ecs describe-task-definition \
            --task-definition qurable-api \
            --query taskDefinition > task-definition.json
      
      - name: Fill in the new image ID in the Amazon ECS task definition
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-definition.json
          container-name: ${{ env.CONTAINER_NAME }}
          image: ${{ steps.build-image.outputs.image }}
      
      - name: Deploy Amazon ECS task definition
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.task-def.outputs.task-definition }}
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true
      
      - name: Run database migrations
        run: |
          # Ejecutar migraciones mediante ECS Run Task
          aws ecs run-task \
            --cluster ${{ env.ECS_CLUSTER }} \
            --task-definition qurable-migration-runner \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx],securityGroups=[sg-ecs],assignPublicIp=DISABLED}" \
            --overrides '{"containerOverrides":[{"name":"migration","command":["npm","run","typeorm","migration:run"]}]}'
```

---

## 6. Seguridad

### 6.1 Secrets Management

**AWS Secrets Manager**:
```bash
# Crear secrets
aws secretsmanager create-secret \
  --name qurable/db-password \
  --secret-string "$(openssl rand -base64 32)"

aws secretsmanager create-secret \
  --name qurable/jwt-secret \
  --secret-string "$(openssl rand -base64 64)"

aws secretsmanager create-secret \
  --name qurable/redis-auth-token \
  --secret-string "$(openssl rand -base64 32)"
```

**IAM Roles para ECS Tasks**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:qurable/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:123456789012:log-group:/ecs/qurable-api:*"
    }
  ]
}
```

### 6.2 Network Security

**WAF Rules**:
```bash
# Rate limiting
aws wafv2 create-web-acl \
  --name qurable-waf \
  --scope REGIONAL \
  --default-action Allow={} \
  --rules file://waf-rules.json

# waf-rules.json
{
  "Name": "RateLimitRule",
  "Priority": 1,
  "Statement": {
    "RateBasedStatement": {
      "Limit": 2000,
      "AggregateKeyType": "IP"
    }
  },
  "Action": { "Block": {} },
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "RateLimitRule"
  }
}
```

---

## 7. Monitoreo y Observabilidad

### 7.1 CloudWatch Dashboards

**Métricas Clave**:
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", {"stat": "Average"}],
          [".", "MemoryUtilization", {"stat": "Average"}],
          ["AWS/ApplicationELB", "TargetResponseTime", {"stat": "Average"}],
          [".", "RequestCount", {"stat": "Sum"}],
          [".", "HTTPCode_Target_5XX_Count", {"stat": "Sum"}],
          ["AWS/RDS", "DatabaseConnections", {"stat": "Average"}],
          ["AWS/ElastiCache", "CacheHits", {"stat": "Sum"}],
          ["AWS/ElastiCache", "CacheMisses", {"stat": "Sum"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Qurable System Health"
      }
    }
  ]
}
```

### 7.2 CloudWatch Alarms

```bash
# High CPU Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name qurable-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:qurable-alerts

# Database Connection Saturation
aws cloudwatch put-metric-alarm \
  --alarm-name qurable-db-connections-high \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --statistic Average \
  --period 60 \
  --threshold 180 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:qurable-alerts
```

### 7.3 Application Performance Monitoring

**AWS X-Ray Integration**:
```typescript
// src/app.ts
import AWSXRay from 'aws-xray-sdk-core';
import AWS from 'aws-sdk';

AWSXRay.captureAWS(AWS);
AWSXRay.captureHTTPsGlobal(require('http'));
AWSXRay.captureHTTPsGlobal(require('https'));

app.use(AWSXRay.express.openSegment('QurableAPI'));

// ... routes ...

app.use(AWSXRay.express.closeSegment());
```

---

## 8. Disaster Recovery

### 8.1 Backup Strategy

**RDS Automated Backups**:
- Retention: 7 días
- Backup Window: 03:00-04:00 UTC
- Point-in-Time Recovery: Últimos 7 días

**Manual Snapshots**:
```bash
# Crear snapshot antes de deployment crítico
aws rds create-db-snapshot \
  --db-instance-identifier qurable-db \
  --db-snapshot-identifier qurable-db-pre-deploy-$(date +%Y%m%d)
```

**ElastiCache Snapshots**:
```bash
aws elasticache create-snapshot \
  --replication-group-id qurable-redis \
  --snapshot-name qurable-redis-$(date +%Y%m%d)
```

### 8.2 Recovery Procedures

**RDS Recovery (RTO: ~15 min)**:
```bash
# Restaurar desde snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier qurable-db-restored \
  --db-snapshot-identifier qurable-db-pre-deploy-20260206

# Actualizar DNS/endpoint en ECS task definition
```

**Redis Recovery (RTO: ~5 min)**:
```bash
aws elasticache create-replication-group \
  --replication-group-id qurable-redis-restored \
  --snapshot-name qurable-redis-20260206
```

---

## 9. Estimación de Costos

### 9.1 Costos Mensuales (Producción - Región us-east-1)

| Servicio | Configuración | Costo Mensual (USD) |
|----------|---------------|---------------------|
| **ECS Fargate** | 2 tasks (0.5 vCPU, 1 GB) x 730 hrs | $35.04 |
| **RDS PostgreSQL** | db.t4g.medium Multi-AZ, 100 GB gp3 | $123.87 |
| **ElastiCache Redis** | cache.r6g.large (2 nodes) | $275.20 |
| **Application Load Balancer** | 1 ALB + 730 hrs | $22.27 |
| **Data Transfer** | 100 GB salida estimada | $9.00 |
| **CloudWatch Logs** | 10 GB ingesta + retención | $5.03 |
| **Secrets Manager** | 3 secrets | $1.20 |
| **ECR** | 5 GB almacenamiento | $0.50 |
| **S3** | 50 GB (logs + backups) | $1.15 |
| **Route 53** | 1 hosted zone + 1M queries | $0.90 |
| **ACM Certificate** | SSL/TLS | $0.00 (gratis) |
| **TOTAL BASE** | | **~$474/mes** |

### 9.2 Costos por Escenarios de Tráfico

**Escenario 1: Tráfico Bajo (10K requests/día)**
```
ECS Tasks: 2 tasks = $35.04
Total: ~$474/mes
```

**Escenario 2: Tráfico Medio (1M requests/día)**
```
ECS Tasks: 5 tasks (auto-scaled) = $87.60
RDS: Upgrade a db.r6g.large = $245.00
Total: ~$740/mes
```

**Escenario 3: Tráfico Alto - Black Friday (10M requests/día)**
```
ECS Tasks: 20 tasks (spike) = $350.40
RDS: db.r6g.xlarge + Read Replica = $650.00
ElastiCache: cache.r6g.xlarge (6 nodes) = $990.00
Data Transfer: 1 TB salida = $90.00
Total: ~$2,200/mes (durante pico)
```

### 9.3 Optimizaciones de Costo

1. **Reserved Instances** (ahorro ~40%):
   - RDS: $75/mes → Ahorro: $590/año
   - ElastiCache: $165/mes → Ahorro: $1,322/año

2. **Compute Savings Plans** (ahorro ~20%):
   - ECS Fargate: $28/mes → Ahorro: $84/año

3. **S3 Lifecycle Policies**:
   - Mover logs > 30 días a S3 Glacier: Ahorro 80%

4. **CloudWatch Logs Retention**:
   - 7 días para logs de debug, 30 días para errores

**Costo Optimizado Anual**: ~$4,700/año (vs $5,688 sin optimización)

---

## 10. Checklist de Deployment

### Pre-Deployment
- [ ] Backup de RDS creado
- [ ] Snapshot de ElastiCache creado
- [ ] Variables de entorno validadas en Secrets Manager
- [ ] Health checks configurados en ALB
- [ ] CloudWatch Alarms activas
- [ ] Rollback plan documentado
- [ ] Equipo de soporte notificado

### Deployment
- [ ] Build y push de imagen Docker a ECR
- [ ] Actualización de Task Definition
- [ ] Deployment de nuevo ECS Service
- [ ] Ejecución de migraciones de base de datos
- [ ] Validación de health checks (2/2 tasks healthy)
- [ ] Smoke tests ejecutados exitosamente

### Post-Deployment
- [ ] Monitoreo de métricas por 30 minutos
- [ ] Validación de logs sin errores críticos
- [ ] Test de endpoints críticos (POST /assign, POST /redeem)
- [ ] Verificación de tasas de error < 0.1%
- [ ] Documentación actualizada
- [ ] Rollback plan descartado si todo OK

---

**Última actualización**: 6 de febrero de 2026  
**Versión**: 1.0.0  
**Contacto**: DevOps Team - Qurable Challenge
