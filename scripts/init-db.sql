-- PostgreSQL Initialization Script
-- This runs automatically when the container is first created

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for encryption (if needed for GDPR compliance)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types (enums will be created by TypeORM migrations)
-- But we can add any initial setup here

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE coupon_service TO qurable;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Database initialized successfully for Qurable Coupon Service';
END $$;
