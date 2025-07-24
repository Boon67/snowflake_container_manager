from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from datetime import timedelta
from typing import List
import logging
import os

from database import get_database, SnowflakeConnection
from models import (
    AppSetting, AppSettingCreate, AppSettingUpdate,
    DatabaseSetting, DatabaseSettingCreate, DatabaseSettingUpdate,
    APISetting, APISettingCreate, APISettingUpdate,
    FeatureFlag, FeatureFlagCreate, FeatureFlagUpdate,
    UserLogin, Token, APIResponse, ConfigTable, User
)
from auth import (
    authenticate_user, create_access_token, get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Configuration Manager",
    description="A backend service for managing application configurations stored in Snowflake",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security scheme
security = HTTPBearer()

@app.on_event("startup")
async def startup_event():
    """Initialize database connection and schema on startup"""
    try:
        logger.info("🚀 Starting Configuration Manager application...")
        
        # Get database instance
        db = get_database()
        
        # Step 1: Establish connection
        logger.info("🔌 Establishing database connection...")
        if not db.connect():
            raise ConnectionError("Failed to establish database connection")
        
        # Step 2: Validate connection is working
        logger.info("🧪 Validating database connection...")
        db.validate_connection()
        
        # Step 3: Initialize schema
        logger.info("🏗️  Initializing database schema...")
        if not db.initialize_schema():
            raise RuntimeError("Failed to initialize database schema")
        
        logger.info("✅ Application started successfully - all systems operational!")
        
    except Exception as e:
        logger.error(f"❌ CRITICAL ERROR: Application startup failed: {e}")
        logger.error("🛑 Stopping application due to database connection failure")
        
        # Clean up any partial connections
        try:
            db = get_database()
            db.disconnect()
        except:
            pass  # Ignore cleanup errors
        
        # Re-raise the exception to stop the application
        raise RuntimeError(f"Application startup failed: {e}") from e

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up database connection on shutdown"""
    db = get_database()
    db.disconnect()
    logger.info("Application shutdown complete")

# Authentication endpoints
@app.post("/api/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    """Authenticate user and return JWT token"""
    user = authenticate_user(user_data.username, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=dict)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return {"username": current_user.username}

# Configuration tables metadata
@app.get("/api/config/tables", response_model=List[ConfigTable])
async def get_config_tables(current_user: User = Depends(get_current_active_user)):
    """Get list of all configuration tables"""
    tables = [
        ConfigTable(
            table_name="APP_SETTINGS",
            display_name="Application Settings",
            description="General application configuration parameters",
            columns=["ID", "CONFIG_KEY", "CONFIG_VALUE", "CONFIG_TYPE", "DESCRIPTION", "CREATED_AT", "UPDATED_AT"]
        ),
        ConfigTable(
            table_name="DATABASE_SETTINGS",
            display_name="Database Settings",
            description="Database connection configurations",
            columns=["ID", "CONNECTION_NAME", "HOST", "PORT", "DATABASE_NAME", "USERNAME", "PASSWORD", "ADDITIONAL_PARAMS", "ACTIVE", "CREATED_AT", "UPDATED_AT"]
        ),
        ConfigTable(
            table_name="API_SETTINGS",
            display_name="API Settings",
            description="External API configurations",
            columns=["ID", "API_NAME", "ENDPOINT_URL", "API_KEY", "TIMEOUT_SECONDS", "RATE_LIMIT", "ACTIVE", "CREATED_AT", "UPDATED_AT"]
        ),
        ConfigTable(
            table_name="FEATURE_FLAGS",
            display_name="Feature Flags",
            description="Application feature flag configurations",
            columns=["ID", "FEATURE_NAME", "ENABLED", "DESCRIPTION", "ROLLOUT_PERCENTAGE", "ENVIRONMENT", "CREATED_AT", "UPDATED_AT"]
        )
    ]
    return tables

# App Settings endpoints
@app.get("/api/config/app-settings", response_model=List[AppSetting])
async def get_app_settings(current_user: User = Depends(get_current_active_user)):
    """Get all application settings"""
    db = get_database()
    try:
        results = db.execute_query("SELECT * FROM APP_SETTINGS ORDER BY CONFIG_KEY")
        return [AppSetting(**result) for result in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch app settings: {str(e)}")

@app.post("/api/config/app-settings", response_model=AppSetting)
async def create_app_setting(setting: AppSettingCreate, current_user: User = Depends(get_current_active_user)):
    """Create a new application setting"""
    db = get_database()
    try:
        db.execute_non_query(
            "INSERT INTO APP_SETTINGS (CONFIG_KEY, CONFIG_VALUE, CONFIG_TYPE, DESCRIPTION) VALUES (%s, %s, %s, %s)",
            (setting.config_key, setting.config_value, setting.config_type, setting.description)
        )
        results = db.execute_query("SELECT * FROM APP_SETTINGS WHERE CONFIG_KEY = %s", (setting.config_key,))
        return AppSetting(**results[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create app setting: {str(e)}")

@app.put("/api/config/app-settings/{setting_id}", response_model=AppSetting)
async def update_app_setting(setting_id: int, setting: AppSettingUpdate, current_user: User = Depends(get_current_active_user)):
    """Update an application setting"""
    db = get_database()
    try:
        update_fields = []
        params = []
        
        if setting.config_value is not None:
            update_fields.append("CONFIG_VALUE = %s")
            params.append(setting.config_value)
        if setting.config_type is not None:
            update_fields.append("CONFIG_TYPE = %s")
            params.append(setting.config_type)
        if setting.description is not None:
            update_fields.append("DESCRIPTION = %s")
            params.append(setting.description)
        
        update_fields.append("UPDATED_AT = CURRENT_TIMESTAMP()")
        params.append(setting_id)
        
        query = f"UPDATE APP_SETTINGS SET {', '.join(update_fields)} WHERE ID = %s"
        db.execute_non_query(query, tuple(params))
        
        results = db.execute_query("SELECT * FROM APP_SETTINGS WHERE ID = %s", (setting_id,))
        return AppSetting(**results[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update app setting: {str(e)}")

@app.delete("/api/config/app-settings/{setting_id}")
async def delete_app_setting(setting_id: int, current_user: User = Depends(get_current_active_user)):
    """Delete an application setting"""
    db = get_database()
    try:
        db.execute_non_query("DELETE FROM APP_SETTINGS WHERE ID = %s", (setting_id,))
        return {"message": "App setting deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete app setting: {str(e)}")

# Database Settings endpoints
@app.get("/api/config/database-settings", response_model=List[DatabaseSetting])
async def get_database_settings(current_user: User = Depends(get_current_active_user)):
    """Get all database settings"""
    db = get_database()
    try:
        results = db.execute_query("SELECT * FROM DATABASE_SETTINGS ORDER BY CONNECTION_NAME")
        return [DatabaseSetting(**result) for result in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch database settings: {str(e)}")

@app.post("/api/config/database-settings", response_model=DatabaseSetting)
async def create_database_setting(setting: DatabaseSettingCreate, current_user: User = Depends(get_current_active_user)):
    """Create a new database setting"""
    db = get_database()
    try:
        db.execute_non_query(
            "INSERT INTO DATABASE_SETTINGS (CONNECTION_NAME, HOST, PORT, DATABASE_NAME, USERNAME, PASSWORD, ADDITIONAL_PARAMS, ACTIVE) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            (setting.connection_name, setting.host, setting.port, setting.database_name, setting.username, setting.password, setting.additional_params, setting.active)
        )
        results = db.execute_query("SELECT * FROM DATABASE_SETTINGS WHERE CONNECTION_NAME = %s", (setting.connection_name,))
        return DatabaseSetting(**results[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create database setting: {str(e)}")

@app.put("/api/config/database-settings/{setting_id}", response_model=DatabaseSetting)
async def update_database_setting(setting_id: int, setting: DatabaseSettingUpdate, current_user: User = Depends(get_current_active_user)):
    """Update a database setting"""
    db = get_database()
    try:
        update_fields = []
        params = []
        
        for field, value in setting.dict(exclude_unset=True).items():
            if value is not None:
                update_fields.append(f"{field.upper()} = %s")
                params.append(value)
        
        update_fields.append("UPDATED_AT = CURRENT_TIMESTAMP()")
        params.append(setting_id)
        
        query = f"UPDATE DATABASE_SETTINGS SET {', '.join(update_fields)} WHERE ID = %s"
        db.execute_non_query(query, tuple(params))
        
        results = db.execute_query("SELECT * FROM DATABASE_SETTINGS WHERE ID = %s", (setting_id,))
        return DatabaseSetting(**results[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update database setting: {str(e)}")

@app.delete("/api/config/database-settings/{setting_id}")
async def delete_database_setting(setting_id: int, current_user: User = Depends(get_current_active_user)):
    """Delete a database setting"""
    db = get_database()
    try:
        db.execute_non_query("DELETE FROM DATABASE_SETTINGS WHERE ID = %s", (setting_id,))
        return {"message": "Database setting deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete database setting: {str(e)}")

# API Settings endpoints
@app.get("/api/config/api-settings", response_model=List[APISetting])
async def get_api_settings(current_user: User = Depends(get_current_active_user)):
    """Get all API settings"""
    db = get_database()
    try:
        results = db.execute_query("SELECT * FROM API_SETTINGS ORDER BY API_NAME")
        return [APISetting(**result) for result in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch API settings: {str(e)}")

@app.post("/api/config/api-settings", response_model=APISetting)
async def create_api_setting(setting: APISettingCreate, current_user: User = Depends(get_current_active_user)):
    """Create a new API setting"""
    db = get_database()
    try:
        db.execute_non_query(
            "INSERT INTO API_SETTINGS (API_NAME, ENDPOINT_URL, API_KEY, TIMEOUT_SECONDS, RATE_LIMIT, ACTIVE) VALUES (%s, %s, %s, %s, %s, %s)",
            (setting.api_name, setting.endpoint_url, setting.api_key, setting.timeout_seconds, setting.rate_limit, setting.active)
        )
        results = db.execute_query("SELECT * FROM API_SETTINGS WHERE API_NAME = %s", (setting.api_name,))
        return APISetting(**results[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create API setting: {str(e)}")

@app.put("/api/config/api-settings/{setting_id}", response_model=APISetting)
async def update_api_setting(setting_id: int, setting: APISettingUpdate, current_user: User = Depends(get_current_active_user)):
    """Update an API setting"""
    db = get_database()
    try:
        update_fields = []
        params = []
        
        for field, value in setting.dict(exclude_unset=True).items():
            if value is not None:
                update_fields.append(f"{field.upper()} = %s")
                params.append(value)
        
        update_fields.append("UPDATED_AT = CURRENT_TIMESTAMP()")
        params.append(setting_id)
        
        query = f"UPDATE API_SETTINGS SET {', '.join(update_fields)} WHERE ID = %s"
        db.execute_non_query(query, tuple(params))
        
        results = db.execute_query("SELECT * FROM API_SETTINGS WHERE ID = %s", (setting_id,))
        return APISetting(**results[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update API setting: {str(e)}")

@app.delete("/api/config/api-settings/{setting_id}")
async def delete_api_setting(setting_id: int, current_user: User = Depends(get_current_active_user)):
    """Delete an API setting"""
    db = get_database()
    try:
        db.execute_non_query("DELETE FROM API_SETTINGS WHERE ID = %s", (setting_id,))
        return {"message": "API setting deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete API setting: {str(e)}")

# Feature Flags endpoints
@app.get("/api/config/feature-flags", response_model=List[FeatureFlag])
async def get_feature_flags(current_user: User = Depends(get_current_active_user)):
    """Get all feature flags"""
    db = get_database()
    try:
        results = db.execute_query("SELECT * FROM FEATURE_FLAGS ORDER BY FEATURE_NAME")
        return [FeatureFlag(**result) for result in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch feature flags: {str(e)}")

@app.post("/api/config/feature-flags", response_model=FeatureFlag)
async def create_feature_flag(flag: FeatureFlagCreate, current_user: User = Depends(get_current_active_user)):
    """Create a new feature flag"""
    db = get_database()
    try:
        db.execute_non_query(
            "INSERT INTO FEATURE_FLAGS (FEATURE_NAME, ENABLED, DESCRIPTION, ROLLOUT_PERCENTAGE, ENVIRONMENT) VALUES (%s, %s, %s, %s, %s)",
            (flag.feature_name, flag.enabled, flag.description, flag.rollout_percentage, flag.environment)
        )
        results = db.execute_query("SELECT * FROM FEATURE_FLAGS WHERE FEATURE_NAME = %s", (flag.feature_name,))
        return FeatureFlag(**results[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create feature flag: {str(e)}")

@app.put("/api/config/feature-flags/{flag_id}", response_model=FeatureFlag)
async def update_feature_flag(flag_id: int, flag: FeatureFlagUpdate, current_user: User = Depends(get_current_active_user)):
    """Update a feature flag"""
    db = get_database()
    try:
        update_fields = []
        params = []
        
        for field, value in flag.dict(exclude_unset=True).items():
            if value is not None:
                update_fields.append(f"{field.upper()} = %s")
                params.append(value)
        
        update_fields.append("UPDATED_AT = CURRENT_TIMESTAMP()")
        params.append(flag_id)
        
        query = f"UPDATE FEATURE_FLAGS SET {', '.join(update_fields)} WHERE ID = %s"
        db.execute_non_query(query, tuple(params))
        
        results = db.execute_query("SELECT * FROM FEATURE_FLAGS WHERE ID = %s", (flag_id,))
        return FeatureFlag(**results[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update feature flag: {str(e)}")

@app.delete("/api/config/feature-flags/{flag_id}")
async def delete_feature_flag(flag_id: int, current_user: User = Depends(get_current_active_user)):
    """Delete a feature flag"""
    db = get_database()
    try:
        db.execute_non_query("DELETE FROM FEATURE_FLAGS WHERE ID = %s", (flag_id,))
        return {"message": "Feature flag deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete feature flag: {str(e)}")

# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint with database connection validation"""
    try:
        db = get_database()
        
        # Basic health check
        health_status = {
            "status": "healthy",
            "service": "Configuration Manager",
            "version": "1.0.0",
            "database": {
                "status": "unknown",
                "connection": False,
                "validation": False
            }
        }
        
        # Test database connection
        if db.connection and db.cursor:
            health_status["database"]["connection"] = True
            
            try:
                # Validate database is responsive
                db.validate_connection()
                health_status["database"]["status"] = "healthy"
                health_status["database"]["validation"] = True
            except Exception as db_error:
                logger.warning(f"Database validation failed during health check: {db_error}")
                health_status["database"]["status"] = "degraded"
                health_status["database"]["validation"] = False
                health_status["status"] = "degraded"
        else:
            health_status["database"]["status"] = "unhealthy"
            health_status["database"]["connection"] = False
            health_status["status"] = "degraded"
            
        return health_status
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "service": "Configuration Manager", 
            "version": "1.0.0",
            "error": str(e),
            "database": {
                "status": "error",
                "connection": False,
                "validation": False
            }
        }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Configuration Manager API", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 