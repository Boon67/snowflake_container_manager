-- Create the Snowflake Container Manager service
CREATE SERVICE SNOWFLAKE_CONTAINER_MANAGER_SERVICE
  IN COMPUTE POOL CONTAINER_MANAGER_POOL
  FROM SPECIFICATION $$
spec:
  containers:
  - name: container-manager
    image: /APPS/CONFIG/CONTAINERS/snowflake-container-manager:latest
    env:
      SNOWFLAKE_WAREHOUSE: COMPUTE_WH
      SNOWFLAKE_DATABASE: APPS
      SNOWFLAKE_SCHEMA: CONFIG
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
$$
  COMMENT = 'Snowflake Container Manager application service - Web UI for managing container services';
