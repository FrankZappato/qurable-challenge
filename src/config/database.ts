import { DataSource } from 'typeorm';
import { config } from './environment';

// Import entities
import { CouponBook } from '../entities/CouponBook.entity';
import { CouponCode } from '../entities/CouponCode.entity';
import { CouponAssignment } from '../entities/CouponAssignment.entity';
import { RedemptionAudit } from '../entities/RedemptionAudit.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: config.database.synchronize, // NEVER true in production
  logging: config.database.logging,
  entities: [CouponBook, CouponCode, CouponAssignment, RedemptionAudit],
  migrations: ['src/migrations/**/*.ts'],
  subscribers: [],
  maxQueryExecutionTime: 1000, // Log slow queries (> 1s)
  extra: {
    max: config.database.maxConnections, // Connection pool size
    connectionTimeoutMillis: 5000,
  },
});

// Initialize database connection
export async function initializeDatabase(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
  }
}
