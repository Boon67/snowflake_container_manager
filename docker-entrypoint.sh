#!/bin/bash
set -e

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "🚀 Starting Snowflake Container Manager..."

# Check required environment variables
if [ -z "$SNOWFLAKE_ACCOUNT" ]; then
    log "❌ SNOWFLAKE_ACCOUNT environment variable is required"
    exit 1
fi

if [ -z "$SNOWFLAKE_USER" ]; then
    log "❌ SNOWFLAKE_USER environment variable is required"
    exit 1
fi

if [ -z "$SNOWFLAKE_WAREHOUSE" ]; then
    log "❌ SNOWFLAKE_WAREHOUSE environment variable is required"
    exit 1
fi

if [ -z "$SNOWFLAKE_DATABASE" ]; then
    log "❌ SNOWFLAKE_DATABASE environment variable is required"
    exit 1
fi

if [ -z "$SNOWFLAKE_SCHEMA" ]; then
    log "❌ SNOWFLAKE_SCHEMA environment variable is required"
    exit 1
fi

# Check authentication method
if [ -z "$SNOWFLAKE_PASSWORD" ] && [ -z "$SNOWFLAKE_PRIVATE_KEY_PATH" ]; then
    log "❌ Either SNOWFLAKE_PASSWORD or SNOWFLAKE_PRIVATE_KEY_PATH must be provided"
    exit 1
fi

# Set default JWT settings if not provided
export JWT_SECRET_KEY=${JWT_SECRET_KEY:-$(openssl rand -base64 32)}
export JWT_ALGORITHM=${JWT_ALGORITHM:-HS256}
export JWT_ACCESS_TOKEN_EXPIRE_MINUTES=${JWT_ACCESS_TOKEN_EXPIRE_MINUTES:-30}

log "✅ Environment validation complete"
log "📡 Backend will be available at: http://localhost:8000"
log "🌐 Frontend UI will be served at: http://localhost:8000"
log "📚 API Documentation at: http://localhost:8000/docs"

# Start the application
cd /app/backend
exec python main.py