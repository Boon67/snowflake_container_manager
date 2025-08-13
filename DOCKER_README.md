# Docker Deployment Guide

This guide explains how to build and run the Snowflake Container Manager using Docker.

## Quick Start

### 1. Build the Docker Image

```bash
docker build -t snowflake-container-manager .
```

### 2. Create Environment File

Copy the example environment file and configure your Snowflake credentials:

```bash
cp docker.env.example .env
```

Edit `.env` with your Snowflake credentials:

```bash
SNOWFLAKE_ACCOUNT=your-account.region
SNOWFLAKE_USER=your-username
SNOWFLAKE_PASSWORD=your-password
SNOWFLAKE_WAREHOUSE=your-warehouse
SNOWFLAKE_DATABASE=your-database
SNOWFLAKE_SCHEMA=your-schema
```

### 3. Run with Docker Compose (Recommended)

```bash
docker-compose up -d
```

### 4. Run with Docker directly

```bash
docker run -d \
  --name snowflake-container-manager \
  --env-file .env \
  -p 8000:8000 \
  snowflake-container-manager
```

## Access the Application

- **Web Interface**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

Default login credentials:
- Username: `admin`
- Password: `password123`

## Authentication Methods

### Password Authentication

Set these environment variables:
```bash
SNOWFLAKE_ACCOUNT=your-account.region
SNOWFLAKE_USER=your-username
SNOWFLAKE_PASSWORD=your-password
```

### Keypair Authentication

1. Place your private key file in the `secrets/` directory
2. Set these environment variables:
```bash
SNOWFLAKE_ACCOUNT=your-account.region
SNOWFLAKE_USER=your-username
SNOWFLAKE_PRIVATE_KEY_PATH=/app/backend/secrets/snowflake_private_key.pem
```

3. Mount the secrets directory when running:
```bash
docker run -d \
  --name snowflake-container-manager \
  --env-file .env \
  -v ./secrets:/app/backend/secrets:ro \
  -p 8000:8000 \
  snowflake-container-manager
```

## Advanced Configuration

### Custom JWT Settings

```bash
JWT_SECRET_KEY=your-custom-secret-key
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
```

If `JWT_SECRET_KEY` is not provided, one will be automatically generated.

### Health Check

The container includes a health check that monitors:
- Application startup
- Database connectivity

Check container health:
```bash
docker ps
docker inspect snowflake-container-manager | grep -A5 Health
```

## Development

### Building for Development

```bash
# Build with build arguments for development
docker build --target production -t snowflake-container-manager:dev .
```

### Viewing Logs

```bash
# Follow logs
docker logs -f snowflake-container-manager

# View with docker-compose
docker-compose logs -f
```

## Troubleshooting

### Container Won't Start

1. Check environment variables:
```bash
docker run --rm --env-file .env snowflake-container-manager printenv | grep SNOWFLAKE
```

2. Verify Snowflake credentials outside container first

3. Check logs:
```bash
docker logs snowflake-container-manager
```

### Database Connection Issues

The application validates the database connection on startup. Common issues:

- **Invalid credentials**: Check your `.env` file
- **Network access**: Ensure your Snowflake account allows connections from your IP
- **Warehouse not running**: Ensure your Snowflake warehouse is active
- **Insufficient permissions**: Verify your user has the required permissions

### Frontend Not Loading

If the frontend doesn't load:

1. Ensure the container started successfully:
```bash
docker ps
curl http://localhost:8000/health
```

2. Check if static files were built correctly:
```bash
docker exec snowflake-container-manager ls -la /app/frontend/build/
```

## Multi-Architecture Support

To build for different architectures:

```bash
# Build for ARM64 (Apple Silicon)
docker buildx build --platform linux/arm64 -t snowflake-container-manager:arm64 .

# Build for AMD64 (Intel)
docker buildx build --platform linux/amd64 -t snowflake-container-manager:amd64 .

# Build multi-architecture
docker buildx build --platform linux/amd64,linux/arm64 -t snowflake-container-manager:latest --push .
```

## Security Considerations

- The container runs as a non-root user for security
- Environment variables containing secrets should be handled securely
- Consider using Docker secrets or external secret management for production
- The health check endpoint is exposed for monitoring

## Production Deployment

For production deployment:

1. Use a reverse proxy (nginx, traefik) for SSL termination
2. Set up proper logging and monitoring
3. Use Docker secrets or external secret management
4. Configure resource limits
5. Set up backup strategies for your Snowflake configurations

Example production docker-compose.yml:

```yaml
version: '3.8'
services:
  snowflake-container-manager:
    image: snowflake-container-manager:latest
    restart: unless-stopped
    environment:
      - SNOWFLAKE_ACCOUNT_FILE=/run/secrets/snowflake_account
      - SNOWFLAKE_USER_FILE=/run/secrets/snowflake_user
      - SNOWFLAKE_PASSWORD_FILE=/run/secrets/snowflake_password
    secrets:
      - snowflake_account
      - snowflake_user
      - snowflake_password
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

secrets:
  snowflake_account:
    external: true
  snowflake_user:
    external: true
  snowflake_password:
    external: true
```