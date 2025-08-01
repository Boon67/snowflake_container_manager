-- =====================================================
-- Snowflake Role Setup for Slack Agent Server Application
-- =====================================================
-- This script creates the necessary role and grants permissions
-- for all operations performed by the Slack Agent Server application
-- =====================================================

-- Set context (replace with your actual account details)
USE ROLE ACCOUNTADMIN;

-- =====================================================
-- 1. CREATE APPLICATION ROLE
-- =====================================================
CREATE ROLE IF NOT EXISTS SLACK_AGENT_APP_ROLE
  COMMENT = 'Role for Slack Agent Server application with permissions for compute pools, container services, and monitoring';

-- =====================================================
-- 2. ACCOUNT-LEVEL PRIVILEGES
-- =====================================================

-- Compute Pool Management
GRANT CREATE COMPUTE POOL ON ACCOUNT TO ROLE SLACK_AGENT_APP_ROLE;
GRANT MONITOR USAGE ON ACCOUNT TO ROLE SLACK_AGENT_APP_ROLE;

-- Container Services and Image Repository Management
GRANT CREATE SERVICE ON ACCOUNT TO ROLE SLACK_AGENT_APP_ROLE;
GRANT CREATE IMAGE REPOSITORY ON ACCOUNT TO ROLE SLACK_AGENT_APP_ROLE;

-- Database and Schema Management
GRANT CREATE DATABASE ON ACCOUNT TO ROLE SLACK_AGENT_APP_ROLE;

-- Account Usage Views Access (for monitoring and analytics)
GRANT IMPORTED PRIVILEGES ON DATABASE SNOWFLAKE TO ROLE SLACK_AGENT_APP_ROLE;

-- =====================================================
-- 3. WAREHOUSE PRIVILEGES
-- =====================================================

-- Grant usage on all existing warehouses (replace WAREHOUSE_NAME with your warehouse)
-- You may need to customize this section based on your warehouse setup
GRANT USAGE ON WAREHOUSE COMPUTE_WH TO ROLE SLACK_AGENT_APP_ROLE;
GRANT OPERATE ON WAREHOUSE COMPUTE_WH TO ROLE SLACK_AGENT_APP_ROLE;

-- Alternative: Grant on all warehouses (uncomment if needed)
-- GRANT USAGE ON ALL WAREHOUSES IN ACCOUNT TO ROLE SLACK_AGENT_APP_ROLE;
-- GRANT OPERATE ON ALL WAREHOUSES IN ACCOUNT TO ROLE SLACK_AGENT_APP_ROLE;

-- =====================================================
-- 4. DATABASE-LEVEL PRIVILEGES
-- =====================================================

-- Application Database (replace APP_DATABASE with your actual database name)
GRANT ALL PRIVILEGES ON DATABASE APP TO ROLE SLACK_AGENT_APP_ROLE;
GRANT ALL PRIVILEGES ON SCHEMA APP.PUBLIC TO ROLE SLACK_AGENT_APP_ROLE;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA APP.PUBLIC TO ROLE SLACK_AGENT_APP_ROLE;
GRANT ALL PRIVILEGES ON ALL VIEWS IN SCHEMA APP.PUBLIC TO ROLE SLACK_AGENT_APP_ROLE;
GRANT ALL PRIVILEGES ON FUTURE TABLES IN SCHEMA APP.PUBLIC TO ROLE SLACK_AGENT_APP_ROLE;
GRANT ALL PRIVILEGES ON FUTURE VIEWS IN SCHEMA APP.PUBLIC TO ROLE SLACK_AGENT_APP_ROLE;

-- Grant access to all databases for schema and database listing
GRANT USAGE ON ALL DATABASES IN ACCOUNT TO ROLE SLACK_AGENT_APP_ROLE;
GRANT USAGE ON ALL SCHEMAS IN ACCOUNT TO ROLE SLACK_AGENT_APP_ROLE;

-- =====================================================
-- 5. COMPUTE POOL MANAGEMENT PRIVILEGES
-- =====================================================

-- Grant privileges on all existing compute pools
GRANT ALL PRIVILEGES ON ALL COMPUTE POOLS IN ACCOUNT TO ROLE SLACK_AGENT_APP_ROLE;

-- Grant privileges on future compute pools
GRANT ALL PRIVILEGES ON FUTURE COMPUTE POOLS IN ACCOUNT TO ROLE SLACK_AGENT_APP_ROLE;

-- =====================================================
-- 6. CONTAINER SERVICE MANAGEMENT PRIVILEGES
-- =====================================================

-- Grant privileges on all existing services
GRANT ALL PRIVILEGES ON ALL SERVICES IN ACCOUNT TO ROLE SLACK_AGENT_APP_ROLE;

-- Grant privileges on future services
GRANT ALL PRIVILEGES ON FUTURE SERVICES IN ACCOUNT TO ROLE SLACK_AGENT_APP_ROLE;

-- =====================================================
-- 7. IMAGE REPOSITORY MANAGEMENT PRIVILEGES
-- =====================================================

-- Grant privileges on all existing image repositories
GRANT ALL PRIVILEGES ON ALL IMAGE REPOSITORIES IN ACCOUNT TO ROLE SLACK_AGENT_APP_ROLE;

-- Grant privileges on future image repositories
GRANT ALL PRIVILEGES ON FUTURE IMAGE REPOSITORIES IN ACCOUNT TO ROLE SLACK_AGENT_APP_ROLE;

-- =====================================================
-- 8. CREATE APPLICATION USER (Optional)
-- =====================================================

-- Create a dedicated user for the application (optional)
-- Replace with your desired username and password
/*
CREATE USER IF NOT EXISTS SLACK_AGENT_APP_USER
  PASSWORD = 'SecurePassword123!'
  DEFAULT_ROLE = 'SLACK_AGENT_APP_ROLE'
  DEFAULT_WAREHOUSE = 'COMPUTE_WH'
  DEFAULT_DATABASE = 'APP'
  DEFAULT_SCHEMA = 'PUBLIC'
  COMMENT = 'Application user for Slack Agent Server';

-- Grant the role to the user
GRANT ROLE SLACK_AGENT_APP_ROLE TO USER SLACK_AGENT_APP_USER;
*/

-- =====================================================
-- 9. ALTERNATIVE: GRANT ROLE TO EXISTING USER
-- =====================================================

-- If using an existing user, grant the role (replace YOUR_USERNAME)
-- GRANT ROLE SLACK_AGENT_APP_ROLE TO USER YOUR_USERNAME;

-- =====================================================
-- 10. VERIFICATION QUERIES
-- =====================================================

-- Uncomment these queries to verify the role setup
/*
-- Show all privileges granted to the role
SHOW GRANTS TO ROLE SLACK_AGENT_APP_ROLE;

-- Show role details
DESCRIBE ROLE SLACK_AGENT_APP_ROLE;

-- Test queries the application user should be able to run
USE ROLE SLACK_AGENT_APP_ROLE;
SHOW COMPUTE POOLS;
SHOW SERVICES;
SHOW IMAGE REPOSITORIES IN ACCOUNT;
SHOW DATABASES;
SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.SNOWPARK_CONTAINER_SERVICES_HISTORY LIMIT 1;
*/

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Instructions for next steps:
-- 1. Replace placeholder values (warehouse names, database names, etc.) with your actual values
-- 2. Uncomment and customize the user creation section if needed
-- 3. Run the verification queries to ensure everything is working
-- 4. Update your application's environment variables:
--    - SNOWFLAKE_USER: your application user
--    - SNOWFLAKE_ROLE: SLACK_AGENT_APP_ROLE (if using role-based auth)
--    - Other connection parameters as needed

PRINT('✅ Slack Agent Server role setup complete!');
PRINT('📝 Remember to update your application environment variables');
PRINT('🔧 Run the verification queries to test the setup'); 