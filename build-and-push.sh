#!/bin/bash

# Teams Snowflake Bot - Build and Push to Snowflake Image Repository
# This script checks for a repository and builds/pushes the Docker image

set -e  # Exit on any error

# =============================================================================
# Configuration
# =============================================================================

export PRIVATE_KEY_PASSPHRASE="bubba123#"

# Repository configuration
REPOSITORY_NAME="containers"
REPOSITORY_DATABASE="apps"
REPOSITORY_SCHEMA="config"
IMAGE_NAME="snowflake-container-manager"
VERSION="1.0.0"

# =============================================================================
# Functions
# =============================================================================

print_info() {
    echo "ℹ️  $1"
}

print_success() {
    echo "✅ $1"
}

print_error() {
    echo "❌ $1"
    exit 1
}

check_repository() {
    print_info "Checking for repository '${REPOSITORY_NAME}' in database '${REPOSITORY_DATABASE}' schema '${REPOSITORY_SCHEMA}'..."
    
    # Connect to Snowflake CLI (using default connection)
    snow spcs image-registry login
    print_success "Connected to Snowflake image registry"
    
    # Check if repository exists using snow sql
    local check_sql="SHOW IMAGE REPOSITORIES LIKE '${REPOSITORY_NAME}' IN SCHEMA ${REPOSITORY_DATABASE}.${REPOSITORY_SCHEMA};"
    print_info "Executing SQL: ${check_sql}"
    
    # Run the query and capture output
    local query_result=$(snow sql -q "$check_sql" 2>/dev/null)
    
    if echo "$query_result" | grep -q "$REPOSITORY_NAME"; then
        print_success "Repository '${REPOSITORY_NAME}' found in ${REPOSITORY_DATABASE}.${REPOSITORY_SCHEMA}"
        return 0
    else
        print_error "Repository '${REPOSITORY_NAME}' not found in ${REPOSITORY_DATABASE}.${REPOSITORY_SCHEMA}"
        return 1
    fi
}

build_and_push() {
    print_info "Building Docker image: ${IMAGE_NAME}:${VERSION}"
    
    # Build the Docker image
    docker build -t "${IMAGE_NAME}:${VERSION}" .
    print_success "Image built successfully"
    
    # Get registry URL from snow CLI
    local registry_url=$(snow spcs image-registry url)
    local full_image_tag="${registry_url}/${REPOSITORY_DATABASE}/${REPOSITORY_SCHEMA}/${REPOSITORY_NAME}/${IMAGE_NAME}:${VERSION}"
    
    print_info "Tagging image for Snowflake registry: ${full_image_tag}"
    docker tag "${IMAGE_NAME}:${VERSION}" "${full_image_tag}"
    
    print_info "Pushing image to Snowflake repository..."
    if  docker push "${full_image_tag}"; then
        print_success "Image pushed successfully: ${full_image_tag}"
    else
        print_error "Failed to push image to Snowflake repository"
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    echo "🚀 Teams Snowflake Bot - Repository Check and Build Script"
    echo "=========================================================="
    
    # Check if repository exists
    if check_repository; then
        echo ""
        read -p "Repository found. Proceed with build and push? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            build_and_push
        else
            print_info "Build cancelled by user"
        fi
    else
        echo ""
        print_error "Cannot proceed without repository. Please create the '${REPOSITORY_NAME}' repository in ${REPOSITORY_DATABASE}.${REPOSITORY_SCHEMA} first."
    fi
}

# Run main function
main "$@"
