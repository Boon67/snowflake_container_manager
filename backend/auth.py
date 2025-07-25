from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
import os
import uuid
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
            'created_at': user_dict['CREATED_AT'],
            'hashed_password': user_dict['HASHED_PASSWORD']
        }
        return models.UserInDB(**mapped_user)
    return None

def authenticate_user(db, username: str, password: str):
    """Authenticate user credentials"""
    user = get_user(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_user(db, user: models.UserCreate):
    """Create a new user in the database"""
    hashed_password = get_password_hash(user.password)
    user_id = str(uuid.uuid4())
    db.execute_non_query(
        "INSERT INTO USERS (ID, USERNAME, HASHED_PASSWORD) VALUES (%s, %s, %s)",
        (user_id, user.username, hashed_password)
    )
    return get_user(db, user.username)

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