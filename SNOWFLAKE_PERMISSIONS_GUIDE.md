# Snowflake Permissions Guide for Slack Agent Server

This guide explains the Snowflake permissions required for the Slack Agent Server application and provides step-by-step setup instructions.

## 🔐 Overview

The Slack Agent Server application requires specific Snowflake permissions to manage:
- **Compute Pools** (create, modify, monitor)
- **Container Services** (deploy, manage, monitor)  
- **Image Repositories** (create, manage images)
- **Databases & Schemas** (application data storage)
- **Monitoring & Analytics** (usage metrics, logs)

## 📋 Required Permissions Summary

### Account-Level Privileges
- `CREATE COMPUTE POOL` - Create new compute pools
- `CREATE SERVICE` - Deploy container services
- `CREATE IMAGE REPOSITORY` - Manage container images
- `CREATE DATABASE` - Create application databases
- `MONITOR USAGE` - Access usage metrics
- `IMPORTED PRIVILEGES ON DATABASE SNOWFLAKE` - Access ACCOUNT_USAGE views

### Database & Schema Operations
- `ALL PRIVILEGES ON DATABASE` - Full access to application database
- `USAGE ON ALL DATABASES` - List all databases (for dropdown)
- `USAGE ON ALL SCHEMAS` - List all schemas (for dropdown)

### Compute Pool Management
- `ALL PRIVILEGES ON ALL COMPUTE POOLS` - Manage existing pools
- `ALL PRIVILEGES ON FUTURE COMPUTE POOLS` - Manage new pools

### Container Service Management  
- `ALL PRIVILEGES ON ALL SERVICES` - Manage existing services
- `ALL PRIVILEGES ON FUTURE SERVICES` - Manage new services

### Image Repository Management
- `ALL PRIVILEGES ON ALL IMAGE REPOSITORIES` - Manage existing repositories
- `ALL PRIVILEGES ON FUTURE IMAGE REPOSITORIES` - Manage new repositories

### Warehouse Access
- `USAGE ON WAREHOUSE` - Execute queries
- `OPERATE ON WAREHOUSE` - Start/stop warehouses

## 🚀 Quick Setup

### Step 1: Run the Setup Script

```sql
-- Execute the snowflake_role_setup.sql file as ACCOUNTADMIN
USE ROLE ACCOUNTADMIN;
@snowflake_role_setup.sql
```

### Step 2: Customize for Your Environment

Replace these placeholders in the SQL file:

```sql
-- Replace COMPUTE_WH with your warehouse name
GRANT USAGE ON WAREHOUSE YOUR_WAREHOUSE_NAME TO ROLE SLACK_AGENT_APP_ROLE;

-- Replace APP with your database name  
GRANT ALL PRIVILEGES ON DATABASE YOUR_DATABASE_NAME TO ROLE SLACK_AGENT_APP_ROLE;
```

### Step 3: Grant Role to User

```sql
-- Option 1: Create new application user
CREATE USER SLACK_AGENT_APP_USER PASSWORD = 'YourSecurePassword123!';
GRANT ROLE SLACK_AGENT_APP_ROLE TO USER SLACK_AGENT_APP_USER;

-- Option 2: Grant to existing user
GRANT ROLE SLACK_AGENT_APP_ROLE TO USER YOUR_EXISTING_USER;
```

### Step 4: Update Environment Variables

```bash
# Update your .env file or environment
SNOWFLAKE_ACCOUNT=your_account
SNOWFLAKE_USER=slack_agent_app_user  # or your existing user
SNOWFLAKE_PASSWORD=YourSecurePassword123!
SNOWFLAKE_WAREHOUSE=your_warehouse
SNOWFLAKE_DATABASE=your_database
SNOWFLAKE_SCHEMA=PUBLIC
```

## 🔍 Verification

Run these queries to verify the setup:

```sql
USE ROLE SLACK_AGENT_APP_ROLE;

-- Test basic operations
SHOW COMPUTE POOLS;
SHOW SERVICES;  
SHOW IMAGE REPOSITORIES IN ACCOUNT;
SHOW DATABASES;

-- Test monitoring access
SELECT COUNT(*) FROM SNOWFLAKE.ACCOUNT_USAGE.SNOWPARK_CONTAINER_SERVICES_HISTORY;
SELECT COUNT(*) FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY;

-- Test database access
USE DATABASE YOUR_DATABASE_NAME;
SHOW TABLES;
```

## 📊 Detailed Permission Breakdown

### Compute Pool Operations

| Operation | Required Permission | SQL Example |
|-----------|-------------------|-------------|
| List pools | `USAGE` on account | `SHOW COMPUTE POOLS` |
| Create pool | `CREATE COMPUTE POOL` | `CREATE COMPUTE POOL my_pool...` |
| Modify pool | `OPERATE` on pool | `ALTER COMPUTE POOL my_pool RESUME` |
| Delete pool | `DROP` on pool | `DROP COMPUTE POOL my_pool` |

### Container Service Operations

| Operation | Required Permission | SQL Example |
|-----------|-------------------|-------------|
| List services | `USAGE` on account | `SHOW SERVICES` |
| Create service | `CREATE SERVICE` | `CREATE SERVICE my_service...` |
| Modify service | `OPERATE` on service | `ALTER SERVICE my_service SUSPEND` |
| Get details | `USAGE` on service | `DESCRIBE SERVICE my_service` |
| Delete service | `DROP` on service | `DROP SERVICE my_service` |

### Image Repository Operations

| Operation | Required Permission | SQL Example |
|-----------|-------------------|-------------|
| List repositories | `USAGE` on account | `SHOW IMAGE REPOSITORIES` |
| Create repository | `CREATE IMAGE REPOSITORY` | `CREATE IMAGE REPOSITORY my_repo` |
| List images | `USAGE` on repository | `SHOW IMAGES IN IMAGE REPOSITORY my_repo` |
| Delete repository | `DROP` on repository | `DROP IMAGE REPOSITORY my_repo` |

### Monitoring & Analytics

| Data Source | Required Permission | Purpose |
|-------------|-------------------|---------|
| `SNOWPARK_CONTAINER_SERVICES_HISTORY` | `IMPORTED PRIVILEGES` | Service usage metrics |
| `QUERY_HISTORY` | `IMPORTED PRIVILEGES` | Query logs and performance |
| `WAREHOUSE_METERING_HISTORY` | `IMPORTED PRIVILEGES` | Warehouse credit usage |
| `STORAGE_USAGE` | `IMPORTED PRIVILEGES` | Storage metrics |
| `DATABASE_STORAGE_USAGE_HISTORY` | `IMPORTED PRIVILEGES` | Database storage trends |

## 🔧 Troubleshooting

### Common Permission Issues

#### "Access denied" on SHOW COMPUTE POOLS
**Solution:** Ensure the role has `MONITOR USAGE` privilege:
```sql
GRANT MONITOR USAGE ON ACCOUNT TO ROLE SLACK_AGENT_APP_ROLE;
```

#### "Insufficient privileges" when creating services
**Solution:** Grant service creation privileges:
```sql
GRANT CREATE SERVICE ON ACCOUNT TO ROLE SLACK_AGENT_APP_ROLE;
GRANT ALL PRIVILEGES ON ALL COMPUTE POOLS IN ACCOUNT TO ROLE SLACK_AGENT_APP_ROLE;
```

#### Cannot access ACCOUNT_USAGE views
**Solution:** Grant imported privileges on SNOWFLAKE database:
```sql
GRANT IMPORTED PRIVILEGES ON DATABASE SNOWFLAKE TO ROLE SLACK_AGENT_APP_ROLE;
```

#### "Database does not exist" errors
**Solution:** Ensure database creation privileges and verify connection:
```sql
GRANT CREATE DATABASE ON ACCOUNT TO ROLE SLACK_AGENT_APP_ROLE;
USE ROLE SLACK_AGENT_APP_ROLE;
CREATE DATABASE IF NOT EXISTS YOUR_DATABASE_NAME;
```

### Testing Individual Components

```sql
-- Test compute pool access
USE ROLE SLACK_AGENT_APP_ROLE;
SHOW COMPUTE POOLS;

-- Test container service access  
SHOW SERVICES;

-- Test image repository access
SHOW IMAGE REPOSITORIES IN ACCOUNT;

-- Test monitoring access
SELECT TOP 1 * FROM SNOWFLAKE.ACCOUNT_USAGE.SNOWPARK_CONTAINER_SERVICES_HISTORY;

-- Test database operations
USE DATABASE YOUR_DATABASE_NAME;
CREATE TABLE test_table (id INT);
DROP TABLE test_table;
```

## 🔒 Security Best Practices

1. **Principle of Least Privilege**: The provided permissions are tailored specifically for the application's needs

2. **Dedicated Application User**: Create a dedicated user for the application rather than using personal accounts

3. **Secure Password Management**: Use strong passwords and consider key-pair authentication for production

4. **Role Separation**: Keep the application role separate from administrative roles

5. **Regular Auditing**: Periodically review granted permissions and usage

## 📝 Environment Configuration

### Required Environment Variables

```bash
# Connection Details
SNOWFLAKE_ACCOUNT=your_account.region.cloud_provider
SNOWFLAKE_USER=slack_agent_app_user
SNOWFLAKE_PASSWORD=secure_password_here

# OR use key-pair authentication (recommended for production)
SNOWFLAKE_PRIVATE_KEY_PATH=/path/to/private_key.p8
SNOWFLAKE_PRIVATE_KEY_PASSPHRASE=optional_passphrase

# Warehouse and Database
SNOWFLAKE_WAREHOUSE=compute_wh
SNOWFLAKE_DATABASE=app
SNOWFLAKE_SCHEMA=public
```

### Key-Pair Authentication Setup (Recommended)

For production environments, use key-pair authentication:

1. Generate RSA key pair:
```bash
openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out rsa_key.p8 -nocrypt
openssl rsa -in rsa_key.p8 -pubout -out rsa_key.pub
```

2. Add public key to Snowflake user:
```sql
ALTER USER slack_agent_app_user SET RSA_PUBLIC_KEY='MIIBIjANBgkq...';
```

3. Update environment variables:
```bash
SNOWFLAKE_PRIVATE_KEY_PATH=/secure/path/rsa_key.p8
# Remove SNOWFLAKE_PASSWORD when using key-pair auth
```

## 🎯 Ready to Go!

After completing this setup:

1. ✅ **Role Created**: `SLACK_AGENT_APP_ROLE` with comprehensive permissions
2. ✅ **User Configured**: Application user with appropriate role
3. ✅ **Environment Set**: Connection parameters configured  
4. ✅ **Permissions Verified**: All operations tested and working

Your Slack Agent Server application should now have all the necessary Snowflake permissions to operate fully! 