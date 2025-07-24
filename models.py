from pydantic import BaseModel, Field
from typing import Optional, Any, List
from datetime import datetime

class ConfigItem(BaseModel):
    """Base configuration item model"""
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class AppSetting(ConfigItem):
    """Application settings model"""
    config_key: str = Field(..., description="Configuration key")
    config_value: Optional[str] = Field(None, description="Configuration value")
    config_type: str = Field(default="string", description="Configuration type (string, number, boolean)")
    description: Optional[str] = Field(None, description="Configuration description")

class AppSettingCreate(BaseModel):
    config_key: str
    config_value: Optional[str] = None
    config_type: str = "string"
    description: Optional[str] = None

class AppSettingUpdate(BaseModel):
    config_value: Optional[str] = None
    config_type: Optional[str] = None
    description: Optional[str] = None

class DatabaseSetting(ConfigItem):
    """Database connection settings model"""
    connection_name: str = Field(..., description="Connection name")
    host: Optional[str] = Field(None, description="Database host")
    port: Optional[int] = Field(None, description="Database port")
    database_name: Optional[str] = Field(None, description="Database name")
    username: Optional[str] = Field(None, description="Database username")
    password: Optional[str] = Field(None, description="Database password")
    additional_params: Optional[str] = Field(None, description="Additional connection parameters")
    active: bool = Field(default=True, description="Whether connection is active")

class DatabaseSettingCreate(BaseModel):
    connection_name: str
    host: Optional[str] = None
    port: Optional[int] = None
    database_name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    additional_params: Optional[str] = None
    active: bool = True

class DatabaseSettingUpdate(BaseModel):
    host: Optional[str] = None
    port: Optional[int] = None
    database_name: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    additional_params: Optional[str] = None
    active: Optional[bool] = None

class APISetting(ConfigItem):
    """API settings model"""
    api_name: str = Field(..., description="API name")
    endpoint_url: Optional[str] = Field(None, description="API endpoint URL")
    api_key: Optional[str] = Field(None, description="API key")
    timeout_seconds: int = Field(default=30, description="Request timeout in seconds")
    rate_limit: Optional[int] = Field(None, description="Rate limit per minute")
    active: bool = Field(default=True, description="Whether API is active")

class APISettingCreate(BaseModel):
    api_name: str
    endpoint_url: Optional[str] = None
    api_key: Optional[str] = None
    timeout_seconds: int = 30
    rate_limit: Optional[int] = None
    active: bool = True

class APISettingUpdate(BaseModel):
    endpoint_url: Optional[str] = None
    api_key: Optional[str] = None
    timeout_seconds: Optional[int] = None
    rate_limit: Optional[int] = None
    active: Optional[bool] = None

class FeatureFlag(ConfigItem):
    """Feature flag model"""
    feature_name: str = Field(..., description="Feature name")
    enabled: bool = Field(default=False, description="Whether feature is enabled")
    description: Optional[str] = Field(None, description="Feature description")
    rollout_percentage: int = Field(default=0, description="Rollout percentage (0-100)")
    environment: str = Field(default="production", description="Target environment")

class FeatureFlagCreate(BaseModel):
    feature_name: str
    enabled: bool = False
    description: Optional[str] = None
    rollout_percentage: int = 0
    environment: str = "production"

class FeatureFlagUpdate(BaseModel):
    enabled: Optional[bool] = None
    description: Optional[str] = None
    rollout_percentage: Optional[int] = None
    environment: Optional[str] = None

class User(BaseModel):
    """User model for authentication"""
    username: str
    hashed_password: str

class UserLogin(BaseModel):
    """User login request model"""
    username: str
    password: str

class Token(BaseModel):
    """JWT token response model"""
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """JWT token data model"""
    username: Optional[str] = None

class ConfigTable(BaseModel):
    """Configuration table metadata"""
    table_name: str
    display_name: str
    description: str
    columns: List[str]

class APIResponse(BaseModel):
    """Standard API response model"""
    success: bool
    message: str
    data: Optional[Any] = None 