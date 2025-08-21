#!/bin/bash

# Push Docker Image to Snowflake Container Manager
# This script helps push the built Docker image to your Snowflake image repository

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Snowflake Container Manager - Image Push Script${NC}"
echo "=========================================================="

# Check if Docker image exists
if ! docker image inspect snowflake-container-manager:latest >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker image 'snowflake-container-manager:latest' not found.${NC}"
    echo -e "${YELLOW}Please build the image first:${NC}"
    echo "docker build -t snowflake-container-manager ."
    exit 1
fi

echo -e "${GREEN}✅ Docker image found locally${NC}"

# Load environment variables
if [ -f "backend/.env" ]; then
    echo -e "${BLUE}📝 Loading environment variables from backend/.env${NC}"
    export $(grep -v '^#' backend/.env | xargs)
else
    echo -e "${YELLOW}⚠️  No backend/.env file found. Please ensure you have Snowflake credentials set.${NC}"
fi

# Check required variables
REQUIRED_VARS=("SNOWFLAKE_ACCOUNT" "SNOWFLAKE_USER")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Missing required environment variable: $var${NC}"
        echo -e "${YELLOW}Please set this in your backend/.env file${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ Environment variables loaded${NC}"
echo -e "${BLUE}Account: ${SNOWFLAKE_ACCOUNT}${NC}"
echo -e "${BLUE}User: ${SNOWFLAKE_USER}${NC}"

# Image repository details
IMAGE_REPO="${SNOWFLAKE_DATABASE:-APPS}.${SNOWFLAKE_SCHEMA:-CONFIG}.CONTAINERS"
IMAGE_NAME="snowflake-container-manager"
IMAGE_TAG="v1.0"
FULL_IMAGE_PATH="/${IMAGE_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"

# Docker requires lowercase for registry paths
DOCKER_IMAGE_REPO=$(echo "${IMAGE_REPO}" | tr '[:upper:]' '[:lower:]')
DOCKER_FULL_IMAGE_PATH="/${DOCKER_IMAGE_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"

echo ""
echo -e "${BLUE}🎯 Target Image Repository:${NC}"
echo -e "${BLUE}   Repository: ${IMAGE_REPO}${NC}"
echo -e "${BLUE}   Image Name: ${IMAGE_NAME}${NC}"
echo -e "${BLUE}   Tag: ${IMAGE_TAG}${NC}"
echo -e "${BLUE}   Full Path: ${FULL_IMAGE_PATH}${NC}"

echo ""
echo -e "${YELLOW}📋 Steps to push your image to Snowflake:${NC}"
echo ""
echo -e "${YELLOW}1. First, create the image repository in Snowflake (if it doesn't exist):${NC}"
echo "   Connect to Snowflake and run:"
echo -e "${GREEN}   CREATE IMAGE REPOSITORY IF NOT EXISTS ${IMAGE_REPO};${NC}"
echo ""
echo -e "${YELLOW}2. Log in to your Snowflake registry:${NC}"
echo -e "${GREEN}   docker login ${SNOWFLAKE_ACCOUNT}.registry.snowflakecomputing.com -u ${SNOWFLAKE_USER}${NC}"
echo "   (You'll be prompted for your password)"
echo ""
echo -e "${YELLOW}3. Tag your image for the Snowflake registry:${NC}"
echo -e "${GREEN}   docker tag snowflake-container-manager:latest ${SNOWFLAKE_ACCOUNT}.registry.snowflakecomputing.com${DOCKER_FULL_IMAGE_PATH}${NC}"
echo ""
echo -e "${YELLOW}4. Push the image:${NC}"
echo -e "${GREEN}   docker push ${SNOWFLAKE_ACCOUNT}.registry.snowflakecomputing.com${DOCKER_FULL_IMAGE_PATH}${NC}"
echo ""
echo -e "${YELLOW}5. Verify the image in Snowflake:${NC}"
echo -e "${GREEN}   SHOW IMAGES IN IMAGE REPOSITORY ${IMAGE_REPO};${NC}"
echo ""
echo -e "${BLUE}🚀 After these steps, you can create container services using:${NC}"
echo -e "${BLUE}   Image Path: ${FULL_IMAGE_PATH}${NC}"
echo ""

# Ask if user wants to proceed with automated steps
read -p "Would you like to run the automated login and push? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🚀 Starting automated push process...${NC}"
    
    # Step 2: Docker login
    echo -e "${YELLOW}Step 1/3: Logging into Snowflake registry...${NC}"
    if docker login "${SNOWFLAKE_ACCOUNT}.registry.snowflakecomputing.com" -u "${SNOWFLAKE_USER}"; then
        echo -e "${GREEN}✅ Successfully logged into Snowflake registry${NC}"
    else
        echo -e "${RED}❌ Failed to log into Snowflake registry${NC}"
        exit 1
    fi
    
    # Step 3: Tag image
    echo -e "${YELLOW}Step 2/3: Tagging image for Snowflake...${NC}"
    SNOWFLAKE_IMAGE_TAG="${SNOWFLAKE_ACCOUNT}.registry.snowflakecomputing.com${FULL_IMAGE_PATH}"
    if docker tag snowflake-container-manager:latest "${SNOWFLAKE_IMAGE_TAG}"; then
        echo -e "${GREEN}✅ Successfully tagged image: ${SNOWFLAKE_IMAGE_TAG}${NC}"
    else
        echo -e "${RED}❌ Failed to tag image${NC}"
        exit 1
    fi
    
    # Step 4: Push image
    echo -e "${YELLOW}Step 3/3: Pushing image to Snowflake...${NC}"
    if docker push "${SNOWFLAKE_IMAGE_TAG}"; then
        echo -e "${GREEN}✅ Successfully pushed image to Snowflake!${NC}"
        echo ""
        echo -e "${BLUE}🎉 Your image is now available at:${NC}"
        echo -e "${GREEN}   ${FULL_IMAGE_PATH}${NC}"
        echo ""
        echo -e "${YELLOW}Next steps:${NC}"
        echo "1. Go to your Snowflake Container Manager UI"
        echo "2. Create a new container service"
        echo -e "3. Use image path: ${GREEN}${FULL_IMAGE_PATH}${NC}"
    else
        echo -e "${RED}❌ Failed to push image to Snowflake${NC}"
        exit 1
    fi
else
    echo -e "${BLUE}Manual process selected. Please follow the steps above.${NC}"
fi

echo ""
echo -e "${GREEN}✅ Script completed!${NC}"
