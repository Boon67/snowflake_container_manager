from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os
import snowflake.connector
from dotenv import load_dotenv
import models

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

# Snowflake connection settings for backend operations
SNOWFLAKE_ACCOUNT = os.getenv("SNOWFLAKE_ACCOUNT")
SNOWFLAKE_WAREHOUSE = os.getenv("SNOWFLAKE_WAREHOUSE")
SNOWFLAKE_DATABASE = os.getenv("SNOWFLAKE_DATABASE")
SNOWFLAKE_SCHEMA = os.getenv("SNOWFLAKE_SCHEMA", "PUBLIC")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/token")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def validate_snowflake_connection(account: str, username: str, password: str) -> bool:
    """Validate Snowflake connection with provided credentials"""
    try:
        conn = snowflake.connector.connect(
            account=account,
            user=username,
            password=password,
            warehouse=SNOWFLAKE_WAREHOUSE,
            database=SNOWFLAKE_DATABASE,
            schema=SNOWFLAKE_SCHEMA
        )
        conn.close()
        return True
    except Exception as e:
        print(f"Snowflake authentication failed: {str(e)}")
        return False

def create_auth_token(login_data: models.SnowflakeLogin) -> str:
    """Create authentication token for Snowflake user"""
    # Validate Snowflake credentials
    if not validate_snowflake_connection(login_data.account, login_data.username, login_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Snowflake credentials"
        )
    
    # Create JWT token with Snowflake user info
    token_data = {
        "sub": login_data.username,
        "account": login_data.account,
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    }
    
    access_token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    return access_token

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Get current authenticated Snowflake user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        account: str = payload.get("account")
        
        if username is None or account is None:
            raise credentials_exception
            
        return {
            "username": username,
            "account": account
        }
    except JWTError:
        raise credentials_exception