#!/bin/bash

# Deployment script for Snowflake Container Manager - Snowpark Container Services
# This script automates the deployment of the Snowflake Container Manager to Snowpark

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
SNOWFLAKE_ACCOUNT="sfsenorthamerica-tboon-aws2"
SNOWFLAKE_USER=""
SNOWFLAKE_PASSWORD=""
SNOWFLAKE_ROLE="ACCOUNTADMIN"
SNOWFLAKE_WAREHOUSE="COMPUTE_WH"
SNOWFLAKE_DATABASE="APPS"
SNOWFLAKE_SCHEMA="CONFIG"
IMAGE_REPO="CONTAINERS"
IMAGE_NAME="snowflake-container-manager"
REGISTRY_DATABASE="apps"
REGISTRY_SCHEMA="config"
REGISTRY_REPO="containers"
SERVICE_NAME="SNOWFLAKE_CONTAINER_MANAGER_SERVICE"
COMPUTE_POOL="CONTAINER_MANAGER_POOL"
IMAGE_TAG="latest"
SKIP_BUILD=false
SKIP_PUSH=false

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Note: Assumes Snow CLI is already authenticated (e.g., via 'snow spcs image-registry login')"
    echo ""
    echo "Optional Options:"
    echo "  -a, --account ACCOUNT      Snowflake account identifier (for image registry)"
    echo "  -u, --user USER           Snowflake username (deprecated - not used)"
    echo "  -p, --password PASSWORD   Snowflake password (deprecated - not used)"
    echo "  -r, --role ROLE           Snowflake role (default: ACCOUNTADMIN)"
    echo "  -w, --warehouse WH        Snowflake warehouse (default: COMPUTE_WH)"
    echo "  -d, --database DB         Snowflake database (default: APPS)"
    echo "  -s, --schema SCHEMA       Snowflake schema (default: CONFIG)"
    echo "  --image-repo REPO         Image repository name (default: CONTAINERS)"
    echo "  --image-name NAME         Docker image name (default: snowflake-container-manager)"
    echo "  --registry-database DB    Registry database (default: apps)"
    echo "  --registry-schema SCHEMA  Registry schema (default: config)"
    echo "  --registry-repo REPO      Registry repository (default: containers)"
    echo "  --service-name NAME       Service name (default: SNOWFLAKE_CONTAINER_MANAGER_SERVICE)"
    echo "  --compute-pool POOL       Compute pool name (default: CONTAINER_MANAGER_POOL)"
    echo "  --image-tag TAG           Docker image tag (default: latest)"
    echo "  --skip-build              Skip Docker image build"
    echo "  --skip-push               Skip Docker image push"
    echo "  -h, --help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  # First authenticate with Snow CLI:"
    echo "  snow spcs image-registry login"
    echo ""
    echo "  # Then run deployment:"
    echo "  $0 -a abc12345"
    echo "  $0 -a abc12345 --skip-build"
    echo "  $0 -a abc12345 -d MY_DB -s MY_SCHEMA"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -a|--account)
            SNOWFLAKE_ACCOUNT="$2"
            shift 2
            ;;
        -u|--user)
            SNOWFLAKE_USER="$2"
            shift 2
            ;;
        -p|--password)
            SNOWFLAKE_PASSWORD="$2"
            shift 2
            ;;
        -r|--role)
            SNOWFLAKE_ROLE="$2"
            shift 2
            ;;
        -w|--warehouse)
            SNOWFLAKE_WAREHOUSE="$2"
            shift 2
            ;;
        -d|--database)
            SNOWFLAKE_DATABASE="$2"
            shift 2
            ;;
        -s|--schema)
            SNOWFLAKE_SCHEMA="$2"
            shift 2
            ;;
        --image-repo)
            IMAGE_REPO="$2"
            shift 2
            ;;
        --image-name)
            IMAGE_NAME="$2"
            shift 2
            ;;
        --registry-database)
            REGISTRY_DATABASE="$2"
            shift 2
            ;;
        --registry-schema)
            REGISTRY_SCHEMA="$2"
            shift 2
            ;;
        --registry-repo)
            REGISTRY_REPO="$2"
            shift 2
            ;;
        --service-name)
            SERVICE_NAME="$2"
            shift 2
            ;;
        --compute-pool)
            COMPUTE_POOL="$2"
            shift 2
            ;;
        --image-tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-push)
            SKIP_PUSH=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

# Validate required parameters
if [[ -z "$SNOWFLAKE_ACCOUNT" ]]; then
    echo -e "${RED}Error: Snowflake account is required for image registry URL${NC}"
    usage
    exit 1
fi

echo -e "${BLUE}Snowflake Container Manager - Snowpark Container Services Deployment${NC}"
echo -e "${BLUE}====================================================================${NC}"
echo ""
echo "Configuration:"
echo "  Account: $SNOWFLAKE_ACCOUNT"
echo "  User: $SNOWFLAKE_USER"
echo "  Role: $SNOWFLAKE_ROLE"
echo "  Warehouse: $SNOWFLAKE_WAREHOUSE"
echo "  Database: $SNOWFLAKE_DATABASE"
echo "  Schema: $SNOWFLAKE_SCHEMA"
echo "  Image Repository: $IMAGE_REPO"
echo "  Image Name: $IMAGE_NAME"
echo "  Registry Database: $REGISTRY_DATABASE"
echo "  Registry Schema: $REGISTRY_SCHEMA"
echo "  Registry Repository: $REGISTRY_REPO"
echo "  Service Name: $SERVICE_NAME"
echo "  Compute Pool: $COMPUTE_POOL"
echo "  Image Tag: $IMAGE_TAG"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed or not in PATH${NC}"
    exit 1
fi

if ! command -v snow &> /dev/null; then
    echo -e "${RED}Error: Snowflake CLI (snow) is required for image registry login and SQL execution${NC}"
    echo -e "${YELLOW}Please install the Snowflake CLI: https://docs.snowflake.com/en/developer-guide/snowflake-cli/installation/installation${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Snowflake CLI found${NC}"
    SNOW_AVAILABLE=true
fi

echo -e "${GREEN}✓ Prerequisites checked${NC}"

# Step 1: Build Docker image
if [[ "$SKIP_BUILD" == false ]]; then
    echo ""
    echo -e "${YELLOW}Step 1: Building Docker image...${NC}"
    
    if docker build --platform linux/amd64 -t $IMAGE_NAME:$IMAGE_TAG .; then
        echo -e "${GREEN}✓ Docker image built successfully${NC}"
    else
        echo -e "${RED}✗ Docker build failed${NC}"
        exit 1
    fi
else
    echo ""
    echo -e "${YELLOW}Step 1: Skipping Docker build${NC}"
fi

# Step 2: Tag and push image to Snowflake registry
if [[ "$SKIP_PUSH" == false ]]; then
    echo ""
    echo -e "${YELLOW}Step 2: Tagging and pushing image to Snowflake registry...${NC}"
    
    # Use the specific registry format
    REGISTRY_URL="${SNOWFLAKE_ACCOUNT}.registry.snowflakecomputing.com"
    FULL_IMAGE_NAME="${REGISTRY_URL}/${REGISTRY_DATABASE}/${REGISTRY_SCHEMA}/${REGISTRY_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"
    
    echo "Tagging image: $FULL_IMAGE_NAME"
    docker tag $IMAGE_NAME:$IMAGE_TAG "$FULL_IMAGE_NAME"
    
    echo "Logging in to Snowflake registry..."
    snow spcs image-registry login
    
    echo "Pushing image to registry..."
    if docker push "$FULL_IMAGE_NAME"; then
        echo -e "${GREEN}✓ Image pushed successfully${NC}"
    else
        echo -e "${RED}✗ Image push failed${NC}"
        exit 1
    fi
else
    echo ""
    echo -e "${YELLOW}Step 2: Skipping image push${NC}"
    REGISTRY_URL="${SNOWFLAKE_ACCOUNT}.registry.snowflakecomputing.com"
    FULL_IMAGE_NAME="${REGISTRY_URL}/${REGISTRY_DATABASE}/${REGISTRY_SCHEMA}/${REGISTRY_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"
fi

# Step 3: Generate SQL commands
echo ""
echo -e "${YELLOW}Step 3: Generating Snowflake SQL commands...${NC}"

# Create SQL file with deployment commands
SQL_FILE="snowpark-container-manager-deployment.sql"

# Create uppercase versions for Snowflake internal paths
REGISTRY_DATABASE_UPPER=$(echo "$REGISTRY_DATABASE" | tr '[:lower:]' '[:upper:]')
REGISTRY_SCHEMA_UPPER=$(echo "$REGISTRY_SCHEMA" | tr '[:lower:]' '[:upper:]')
REGISTRY_REPO_UPPER=$(echo "$REGISTRY_REPO" | tr '[:lower:]' '[:upper:]')

cat > "$SQL_FILE" << EOF
-- Snowflake Container Manager - Snowpark Container Services Deployment
-- Generated on $(date)

-- Use the specified role, warehouse, database, and schema
USE ROLE ${SNOWFLAKE_ROLE};
USE WAREHOUSE ${SNOWFLAKE_WAREHOUSE};
USE DATABASE ${SNOWFLAKE_DATABASE};
USE SCHEMA ${SNOWFLAKE_SCHEMA};

-- Create database and schema if they don't exist
CREATE DATABASE IF NOT EXISTS ${SNOWFLAKE_DATABASE};
CREATE SCHEMA IF NOT EXISTS ${SNOWFLAKE_DATABASE}.${SNOWFLAKE_SCHEMA};

-- Note: Using existing image repository at /${REGISTRY_DATABASE_UPPER}/${REGISTRY_SCHEMA_UPPER}/${REGISTRY_REPO_UPPER}
-- Images are pushed to the shared registry location

-- Create tables if they don't exist (using the exact schema from your backend/database.py)
CREATE TABLE IF NOT EXISTS SOLUTIONS (
    ID VARCHAR(36) PRIMARY KEY,
    NAME VARCHAR(255) NOT NULL UNIQUE,
    DESCRIPTION VARCHAR(1000),
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    UPDATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS TAGS (
    ID VARCHAR(36) PRIMARY KEY,
    NAME VARCHAR(255) NOT NULL UNIQUE,
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS PARAMETERS (
    ID VARCHAR(36) PRIMARY KEY,
    NAME VARCHAR(255),
    KEY VARCHAR(255) NOT NULL UNIQUE,
    VALUE VARCHAR,
    DESCRIPTION VARCHAR(1000),
    IS_SECRET BOOLEAN DEFAULT FALSE,
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    UPDATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS SOLUTION_PARAMETERS (
    SOLUTION_ID VARCHAR(36) NOT NULL,
    PARAMETER_ID VARCHAR(36) NOT NULL,
    PRIMARY KEY (SOLUTION_ID, PARAMETER_ID),
    CONSTRAINT FK_SP_SOLUTION FOREIGN KEY (SOLUTION_ID) REFERENCES SOLUTIONS(ID) ON DELETE CASCADE,
    CONSTRAINT FK_SP_PARAMETER FOREIGN KEY (PARAMETER_ID) REFERENCES PARAMETERS(ID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS PARAMETER_TAGS (
    PARAMETER_ID VARCHAR(36) NOT NULL,
    TAG_ID VARCHAR(36) NOT NULL,
    PRIMARY KEY (PARAMETER_ID, TAG_ID),
    CONSTRAINT FK_PT_PARAMETER FOREIGN KEY (PARAMETER_ID) REFERENCES PARAMETERS(ID) ON DELETE CASCADE,
    CONSTRAINT FK_PT_TAG FOREIGN KEY (TAG_ID) REFERENCES TAGS(ID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS SOLUTION_API_KEYS (
    ID VARCHAR(36) PRIMARY KEY,
    SOLUTION_ID VARCHAR(36) NOT NULL,
    KEY_NAME VARCHAR(255) NOT NULL,
    API_KEY VARCHAR(255) UNIQUE NOT NULL,
    IS_ACTIVE BOOLEAN DEFAULT TRUE,
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    LAST_USED TIMESTAMP_NTZ,
    EXPIRES_AT TIMESTAMP_NTZ,
    FOREIGN KEY (SOLUTION_ID) REFERENCES SOLUTIONS(ID) ON DELETE CASCADE
);



-- Insert default data if not exists
INSERT INTO TAGS (ID, NAME)
SELECT 'env-tag-id', 'Environment'
WHERE NOT EXISTS (SELECT 1 FROM TAGS WHERE NAME = 'Environment');

INSERT INTO TAGS (ID, NAME)
SELECT 'sec-tag-id', 'Security'
WHERE NOT EXISTS (SELECT 1 FROM TAGS WHERE NAME = 'Security');

INSERT INTO TAGS (ID, NAME)
SELECT 'config-tag-id', 'Configuration'
WHERE NOT EXISTS (SELECT 1 FROM TAGS WHERE NAME = 'Configuration');

INSERT INTO TAGS (ID, NAME)
SELECT 'db-tag-id', 'Database'
WHERE NOT EXISTS (SELECT 1 FROM TAGS WHERE NAME = 'Database');

-- Create compute pool for the container manager service
CREATE COMPUTE POOL IF NOT EXISTS ${COMPUTE_POOL}
  MIN_NODES = 1
  MAX_NODES = 2
  INSTANCE_FAMILY = 'CPU_X64_XS'
  COMMENT = 'Compute pool for Snowflake Container Manager service';

-- Drop existing service if it exists
DROP SERVICE IF EXISTS ${SERVICE_NAME};

-- Create the service
-- Image path constructed from variables: REGISTRY_DATABASE=${REGISTRY_DATABASE}, REGISTRY_SCHEMA=${REGISTRY_SCHEMA}, REGISTRY_REPO=${REGISTRY_REPO}
-- IMAGE_NAME=${IMAGE_NAME}, IMAGE_TAG=${IMAGE_TAG}
CREATE SERVICE ${SERVICE_NAME}
  IN COMPUTE POOL ${COMPUTE_POOL}
  FROM SPECIFICATION \$\$
spec:
  containers:
  - name: container-manager
    image: /${REGISTRY_DATABASE_UPPER}/${REGISTRY_SCHEMA_UPPER}/${REGISTRY_REPO_UPPER}/${IMAGE_NAME}:${IMAGE_TAG}
    env:
      SNOWFLAKE_WAREHOUSE: ${SNOWFLAKE_WAREHOUSE}
      SNOWFLAKE_DATABASE: ${SNOWFLAKE_DATABASE}
      SNOWFLAKE_SCHEMA: ${SNOWFLAKE_SCHEMA}
      SECRET_KEY: snowflake-container-manager-secret-key
      ALGORITHM: HS256
      ACCESS_TOKEN_EXPIRE_MINUTES: 720
    resources:
      requests:
        memory: 1Gi
        cpu: 0.5
      limits:
        memory: 2Gi
        cpu: 1.0
    readinessProbe:
      port: 8000
      path: /health
  endpoints:
  - name: container-manager-endpoint
    port: 8000
    public: true
\$\$
  COMMENT = 'Snowflake Container Manager application service - Web UI for managing container services';

-- Show service status
SHOW SERVICES;

-- Get service endpoint
SELECT SYSTEM\$GET_SERVICE_STATUS('${SERVICE_NAME}');
EOF

echo -e "${GREEN}✓ SQL deployment script generated: $SQL_FILE${NC}"

# Step 4: Execute SQL commands (if Snow CLI is available)
if [[ "$SNOW_AVAILABLE" == true ]]; then
    echo ""
    echo -e "${YELLOW}Step 4: Executing SQL commands...${NC}"
    
    if snow sql -f "$SQL_FILE"; then
        echo -e "${GREEN}✓ SQL commands executed successfully${NC}"
    else
        echo -e "${RED}✗ SQL execution failed${NC}"
        echo -e "${YELLOW}Please run the SQL commands in $SQL_FILE manually${NC}"
    fi
else
    echo ""
    echo -e "${YELLOW}Step 4: Manual SQL execution required${NC}"
    echo -e "${YELLOW}Please execute the SQL commands in $SQL_FILE using Snowflake Web UI or Snow CLI${NC}"
fi

echo ""
echo -e "${GREEN}Deployment process completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Wait for the service to start (may take 2-5 minutes)"
echo "2. Check service status: SHOW SERVICES;"
echo "3. Get service endpoint: SELECT SYSTEM\$GET_SERVICE_STATUS('${SERVICE_NAME}');"
echo "4. Access your Snowflake Container Manager via the public endpoint URL"
echo ""
echo "Once deployed, you can:"
echo "- Manage container services through the web UI"
echo "- Create and deploy new containerized solutions"
echo "- Configure network policies and security settings"
echo "- Monitor container service analytics"
echo ""
echo "Troubleshooting:"
echo "- View service logs: SELECT SYSTEM\$GET_SERVICE_LOGS('${SERVICE_NAME}', 0, 'container-manager');"
echo "- Check service status: SELECT SYSTEM\$GET_SERVICE_STATUS('${SERVICE_NAME}');"
echo "- Monitor compute pool: SHOW COMPUTE POOLS;"
echo "- Restart service: ALTER SERVICE ${SERVICE_NAME} SUSPEND; ALTER SERVICE ${SERVICE_NAME} RESUME;"
