-- Fix PostgreSQL User for ThyroRAG
-- This script will drop and recreate the user with the correct password

-- Drop the user if it exists (this will also revoke all permissions)
DROP USER IF EXISTS thyrorag_user;

-- Create the user with the correct password
CREATE USER thyrorag_user WITH PASSWORD 'thyro2026secure';

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON DATABASE thyrorag TO thyrorag_user;

-- Connect to thyrorag database (you'll need to run the commands below separately)
\c thyrorag

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO thyrorag_user;

-- Grant permissions on all existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO thyrorag_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO thyrorag_user;

-- Grant permissions on future tables (so new tables will automatically be accessible)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO thyrorag_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO thyrorag_user;

-- Verify the user was created
SELECT usename, usecreatedb, usesuper FROM pg_user WHERE usename = 'thyrorag_user';
