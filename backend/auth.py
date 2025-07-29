from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional, List
import os
import uuid
import secrets
import snowflake.connector
from dotenv import load_dotenv
from database import get_database
import models

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/token")

def verify_password(plain_password, hashed_password):
    """Verify a plain password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Generate password hash"""
    return pwd_context.hash(password)

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

def get_user(db, username: str):
    """Get user from database by username"""
    user_data = db.execute_query("SELECT * FROM USERS WHERE USERNAME = %s", (username,))
    if user_data:
        # Map uppercase column names from Snowflake to lowercase for Pydantic model
        user_dict = user_data[0]
        mapped_user = {
            'id': user_dict['ID'],
            'username': user_dict['USERNAME'],
            'email': user_dict.get('EMAIL'),
            'first_name': user_dict.get('FIRST_NAME'),
            'last_name': user_dict.get('LAST_NAME'),
            'role': user_dict.get('ROLE', 'user'),
            'is_active': user_dict.get('IS_ACTIVE', True),
            'is_sso_user': user_dict.get('IS_SSO_USER', False),
            'sso_provider': user_dict.get('SSO_PROVIDER'),
            'sso_user_id': user_dict.get('SSO_USER_ID'),
            'use_snowflake_auth': user_dict.get('USE_SNOWFLAKE_AUTH', False),
            'last_login': user_dict.get('LAST_LOGIN'),
            'created_at': user_dict['CREATED_AT'],
            'updated_at': user_dict.get('UPDATED_AT'),
            'hashed_password': user_dict.get('HASHED_PASSWORD'),
            'password_reset_token': user_dict.get('PASSWORD_RESET_TOKEN'),
            'password_reset_expires': user_dict.get('PASSWORD_RESET_EXPIRES')
        }
        return models.UserInDB(**mapped_user)
    return None

def get_user_by_id(db, user_id: str):
    """Get user from database by user ID"""
    user_data = db.execute_query("SELECT * FROM USERS WHERE ID = %s", (user_id,))
    if user_data:
        user_dict = user_data[0]
        mapped_user = {
            'id': user_dict['ID'],
            'username': user_dict['USERNAME'],
            'email': user_dict.get('EMAIL'),
            'first_name': user_dict.get('FIRST_NAME'),
            'last_name': user_dict.get('LAST_NAME'),
            'role': user_dict.get('ROLE', 'user'),
            'is_active': user_dict.get('IS_ACTIVE', True),
            'is_sso_user': user_dict.get('IS_SSO_USER', False),
            'sso_provider': user_dict.get('SSO_PROVIDER'),
            'sso_user_id': user_dict.get('SSO_USER_ID'),
            'use_snowflake_auth': user_dict.get('USE_SNOWFLAKE_AUTH', False),
            'last_login': user_dict.get('LAST_LOGIN'),
            'created_at': user_dict['CREATED_AT'],
            'updated_at': user_dict.get('UPDATED_AT'),
            'hashed_password': user_dict.get('HASHED_PASSWORD'),
            'password_reset_token': user_dict.get('PASSWORD_RESET_TOKEN'),
            'password_reset_expires': user_dict.get('PASSWORD_RESET_EXPIRES')
        }
        return models.UserInDB(**mapped_user)
    return None

def get_all_users(db) -> List[models.User]:
    """Get all users from database"""
    users_data = db.execute_query("SELECT * FROM USERS ORDER BY CREATED_AT DESC")
    users = []
    for user_dict in users_data:
        mapped_user = {
            'id': user_dict['ID'],
            'username': user_dict['USERNAME'],
            'email': user_dict.get('EMAIL'),
            'first_name': user_dict.get('FIRST_NAME'),
            'last_name': user_dict.get('LAST_NAME'),
            'role': user_dict.get('ROLE', 'user'),
            'is_active': user_dict.get('IS_ACTIVE', True),
            'is_sso_user': user_dict.get('IS_SSO_USER', False),
            'sso_provider': user_dict.get('SSO_PROVIDER'),
            'sso_user_id': user_dict.get('SSO_USER_ID'),
            'use_snowflake_auth': user_dict.get('USE_SNOWFLAKE_AUTH', False),
            'last_login': user_dict.get('LAST_LOGIN'),
            'created_at': user_dict['CREATED_AT'],
            'updated_at': user_dict.get('UPDATED_AT')
        }
        users.append(models.User(**mapped_user))
    return users

def authenticate_user(db, username: str, password: str):
    """Authenticate user credentials"""
    user = get_user(db, username)
    if not user or not user.is_active:
        return False
    
    # Handle different authentication methods
    if user.use_snowflake_auth:
        return authenticate_snowflake_user(username, password)
    elif user.is_sso_user:
        return False  # SSO users should not authenticate with password
    else:
        if not user.hashed_password or not verify_password(password, user.hashed_password):
            return False
        
        # Update last login
        db.execute_non_query(
            "UPDATE USERS SET LAST_LOGIN = CURRENT_TIMESTAMP() WHERE ID = %s",
            (user.id,)
        )
        return user

def authenticate_snowflake_user(username: str, password: str):
    """Authenticate user against Snowflake directly"""
    try:
        # Create a test connection to Snowflake with user credentials
        test_conn = snowflake.connector.connect(
            account=os.getenv("SNOWFLAKE_ACCOUNT"),
            user=username,
            password=password,
            warehouse=os.getenv("SNOWFLAKE_WAREHOUSE"),
            database=os.getenv("SNOWFLAKE_DATABASE"),
            schema=os.getenv("SNOWFLAKE_SCHEMA", "PUBLIC")
        )
        test_conn.close()
        return True
    except Exception:
        return False

def create_user(db, user: models.UserCreate):
    """Create a new user in the database"""
    user_id = str(uuid.uuid4())
    
    # Hash password only if provided and not using SSO or Snowflake auth
    hashed_password = None
    if user.password and not user.is_sso_user and not user.use_snowflake_auth:
        hashed_password = get_password_hash(user.password)
    
    # Check if username already exists
    existing_user = get_user(db, user.username)
    if existing_user:
        raise ValueError("Username already exists")
    
    db.execute_non_query("""
        INSERT INTO USERS (
            ID, USERNAME, EMAIL, FIRST_NAME, LAST_NAME, HASHED_PASSWORD,
            ROLE, IS_ACTIVE, IS_SSO_USER, SSO_PROVIDER, SSO_USER_ID, USE_SNOWFLAKE_AUTH
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        user_id, user.username, user.email, user.first_name, user.last_name,
        hashed_password, user.role, user.is_active, user.is_sso_user,
        user.sso_provider, user.sso_user_id, user.use_snowflake_auth
    ))
    
    return get_user(db, user.username)

def update_user(db, user_id: str, user_update: models.UserUpdate):
    """Update user information"""
    # Build dynamic update query
    update_fields = []
    values = []
    
    if user_update.email is not None:
        update_fields.append("EMAIL = %s")
        values.append(user_update.email)
    if user_update.first_name is not None:
        update_fields.append("FIRST_NAME = %s")
        values.append(user_update.first_name)
    if user_update.last_name is not None:
        update_fields.append("LAST_NAME = %s")
        values.append(user_update.last_name)
    if user_update.role is not None:
        update_fields.append("ROLE = %s")
        values.append(user_update.role)
    if user_update.is_active is not None:
        update_fields.append("IS_ACTIVE = %s")
        values.append(user_update.is_active)
    if user_update.is_sso_user is not None:
        update_fields.append("IS_SSO_USER = %s")
        values.append(user_update.is_sso_user)
    if user_update.sso_provider is not None:
        update_fields.append("SSO_PROVIDER = %s")
        values.append(user_update.sso_provider)
    if user_update.sso_user_id is not None:
        update_fields.append("SSO_USER_ID = %s")
        values.append(user_update.sso_user_id)
    if user_update.use_snowflake_auth is not None:
        update_fields.append("USE_SNOWFLAKE_AUTH = %s")
        values.append(user_update.use_snowflake_auth)
    
    if not update_fields:
        return get_user_by_id(db, user_id)
    
    update_fields.append("UPDATED_AT = CURRENT_TIMESTAMP()")
    values.append(user_id)
    
    query = f"UPDATE USERS SET {', '.join(update_fields)} WHERE ID = %s"
    db.execute_non_query(query, values)
    
    return get_user_by_id(db, user_id)

def delete_user(db, user_id: str):
    """Delete user from database"""
    db.execute_non_query("DELETE FROM USERS WHERE ID = %s", (user_id,))

def generate_password_reset_token(db, username: str):
    """Generate a password reset token for a user"""
    user = get_user(db, username)
    if not user or user.is_sso_user or user.use_snowflake_auth:
        return None
    
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
    
    db.execute_non_query("""
        UPDATE USERS SET 
        PASSWORD_RESET_TOKEN = %s, 
        PASSWORD_RESET_EXPIRES = %s 
        WHERE USERNAME = %s
    """, (reset_token, expires_at, username))
    
    return reset_token

def reset_password(db, username: str, new_password: str, reset_token: str = None):
    """Reset user password"""
    user = get_user(db, username)
    if not user:
        return False
    
    # If reset_token is provided, validate it
    if reset_token:
        if (not user.password_reset_token or 
            user.password_reset_token != reset_token or
            not user.password_reset_expires or
            user.password_reset_expires < datetime.utcnow()):
            return False
    
    # Cannot reset password for SSO or Snowflake auth users
    if user.is_sso_user or user.use_snowflake_auth:
        return False
    
    hashed_password = get_password_hash(new_password)
    
    db.execute_non_query("""
        UPDATE USERS SET 
        HASHED_PASSWORD = %s,
        PASSWORD_RESET_TOKEN = NULL,
        PASSWORD_RESET_EXPIRES = NULL,
        UPDATED_AT = CURRENT_TIMESTAMP()
        WHERE USERNAME = %s
    """, (hashed_password, username))
    
    return True

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = models.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    db = get_database()
    if not db.connection:
        db.connect()
        
    user = get_user(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: models.User = Depends(get_current_user)):
    """Get current active user"""
    return current_user 