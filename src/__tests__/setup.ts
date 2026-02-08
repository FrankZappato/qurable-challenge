// Jest setup file for tests
import 'reflect-metadata';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USERNAME = 'qurable_test';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_password';
process.env.DB_DATABASE = 'coupon_service_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = process.env.REDIS_PASSWORD || 'test_redis_password';

// Set timeout for all tests
jest.setTimeout(10000);
