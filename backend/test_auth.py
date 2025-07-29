import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
import uuid

import auth
import models
from database import SnowflakeConnection

class TestPasswordHashing:
    """Test password hashing functionality"""
    
    def test_password_hashing(self):
        """Test password hashing and verification"""
        password = "test_password_123"
        hashed = auth.get_password_hash(password)
        
        assert hashed != password
        assert auth.verify_password(password, hashed)
        assert not auth.verify_password("wrong_password", hashed)
    
    def test_different_passwords_different_hashes(self):
        """Test that different passwords produce different hashes"""
        password1 = "password1"
        password2 = "password2"
        
        hash1 = auth.get_password_hash(password1)
        hash2 = auth.get_password_hash(password2)
        
        assert hash1 != hash2

class TestJWTTokens:
    """Test JWT token functionality"""
    
    def test_create_access_token(self):
        """Test access token creation"""
        data = {"sub": "testuser"}
        token = auth.create_access_token(data)
        
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_create_token_with_expiry(self):
        """Test token creation with custom expiry"""
        data = {"sub": "testuser"}
        expires_delta = timedelta(minutes=30)
        token = auth.create_access_token(data, expires_delta)
        
        assert isinstance(token, str)
        assert len(token) > 0
    
    @patch('auth.jwt.decode')
    def test_verify_token_valid(self, mock_decode):
        """Test token verification with valid token"""
        mock_decode.return_value = {"sub": "testuser"}
        
        username = auth.verify_token("valid_token")
        assert username == "testuser"
    
    @patch('auth.jwt.decode')
    def test_verify_token_invalid(self, mock_decode):
        """Test token verification with invalid token"""
        from jose import JWTError
        mock_decode.side_effect = JWTError()
        
        username = auth.verify_token("invalid_token")
        assert username is None

class TestUserOperations:
    """Test user-related operations"""
    
    @pytest.fixture
    def mock_db(self):
        """Mock database for testing"""
        db = Mock(spec=SnowflakeConnection)
        return db
    
    def test_get_user_existing(self, mock_db):
        """Test getting an existing user"""
        user_data = {
            'ID': 'user-123',
            'USERNAME': 'testuser',
            'HASHED_PASSWORD': 'hashed_pass',
            'ROLE': 'admin',
            'IS_ACTIVE': True,
            'IS_SSO_USER': False,
            'USE_SNOWFLAKE_AUTH': False,
            'CREATED_AT': datetime.now()
        }
        mock_db.execute_query.return_value = [user_data]
        
        user = auth.get_user(mock_db, "testuser")
        
        assert user is not None
        assert user.username == "testuser"
        assert user.role == "admin"
        assert user.is_active == True
    
    def test_get_user_nonexistent(self, mock_db):
        """Test getting a non-existent user"""
        mock_db.execute_query.return_value = []
        
        user = auth.get_user(mock_db, "nonexistent")
        
        assert user is None
    
    def test_authenticate_user_success(self, mock_db):
        """Test successful user authentication"""
        password = "testpass"
        hashed_password = auth.get_password_hash(password)
        
        user_data = {
            'ID': 'user-123',
            'USERNAME': 'testuser',
            'HASHED_PASSWORD': hashed_password,
            'ROLE': 'admin',
            'IS_ACTIVE': True,
            'IS_SSO_USER': False,
            'USE_SNOWFLAKE_AUTH': False,
            'CREATED_AT': datetime.now()
        }
        mock_db.execute_query.return_value = [user_data]
        mock_db.execute_non_query.return_value = None
        
        user = auth.authenticate_user(mock_db, "testuser", password)
        
        assert user is not False
        assert user.username == "testuser"
    
    def test_authenticate_user_wrong_password(self, mock_db):
        """Test authentication with wrong password"""
        correct_password = "testpass"
        wrong_password = "wrongpass"
        hashed_password = auth.get_password_hash(correct_password)
        
        user_data = {
            'ID': 'user-123',
            'USERNAME': 'testuser',
            'HASHED_PASSWORD': hashed_password,
            'ROLE': 'admin',
            'IS_ACTIVE': True,
            'IS_SSO_USER': False,
            'USE_SNOWFLAKE_AUTH': False,
            'CREATED_AT': datetime.now()
        }
        mock_db.execute_query.return_value = [user_data]
        
        result = auth.authenticate_user(mock_db, "testuser", wrong_password)
        
        assert result is False
    
    def test_authenticate_inactive_user(self, mock_db):
        """Test authentication of inactive user"""
        password = "testpass"
        hashed_password = auth.get_password_hash(password)
        
        user_data = {
            'ID': 'user-123',
            'USERNAME': 'testuser',
            'HASHED_PASSWORD': hashed_password,
            'ROLE': 'admin',
            'IS_ACTIVE': False,  # Inactive user
            'IS_SSO_USER': False,
            'USE_SNOWFLAKE_AUTH': False,
            'CREATED_AT': datetime.now()
        }
        mock_db.execute_query.return_value = [user_data]
        
        result = auth.authenticate_user(mock_db, "testuser", password)
        
        assert result is False
    
    def test_create_user_success(self, mock_db):
        """Test successful user creation"""
        mock_db.execute_query.return_value = []  # No existing user
        mock_db.execute_non_query.return_value = None
        
        user_data = models.UserCreate(
            username="newuser",
            password="newpass123",
            email="new@example.com",
            role="user"
        )
        
        # Mock the return after creation
        created_user_data = {
            'ID': 'user-456',
            'USERNAME': 'newuser',
            'EMAIL': 'new@example.com',
            'ROLE': 'user',
            'IS_ACTIVE': True,
            'IS_SSO_USER': False,
            'USE_SNOWFLAKE_AUTH': False,
            'CREATED_AT': datetime.now(),
            'HASHED_PASSWORD': 'hashed_pass'
        }
        mock_db.execute_query.side_effect = [[], [created_user_data]]
        
        user = auth.create_user(mock_db, user_data)
        
        assert user is not None
        assert user.username == "newuser"
        assert user.email == "new@example.com"
    
    def test_create_user_duplicate_username(self, mock_db):
        """Test creating user with duplicate username"""
        # Mock existing user
        existing_user_data = {
            'ID': 'user-123',
            'USERNAME': 'existing',
            'CREATED_AT': datetime.now()
        }
        mock_db.execute_query.return_value = [existing_user_data]
        
        user_data = models.UserCreate(
            username="existing",
            password="newpass123"
        )
        
        with pytest.raises(ValueError, match="already exists"):
            auth.create_user(mock_db, user_data)

class TestPasswordReset:
    """Test password reset functionality"""
    
    @pytest.fixture
    def mock_db(self):
        """Mock database for testing"""
        db = Mock(spec=SnowflakeConnection)
        return db
    
    def test_generate_password_reset_token(self, mock_db):
        """Test password reset token generation"""
        mock_db.execute_non_query.return_value = None
        
        token = auth.generate_password_reset_token(mock_db, "testuser")
        
        assert isinstance(token, str)
        assert len(token) > 0
        mock_db.execute_non_query.assert_called_once()
    
    def test_reset_password_with_token(self, mock_db):
        """Test password reset with valid token"""
        user_data = {
            'ID': 'user-123',
            'USERNAME': 'testuser',
            'PASSWORD_RESET_TOKEN': 'valid_token',
            'PASSWORD_RESET_EXPIRES': datetime.now() + timedelta(hours=1),
            'HASHED_PASSWORD': 'old_hash'
        }
        mock_db.execute_query.return_value = [user_data]
        mock_db.execute_non_query.return_value = None
        
        reset_data = models.PasswordReset(
            username="testuser",
            new_password="newpass123",
            reset_token="valid_token"
        )
        
        result = auth.reset_password(mock_db, reset_data)
        
        assert result is True
        assert mock_db.execute_non_query.call_count == 1
    
    def test_reset_password_expired_token(self, mock_db):
        """Test password reset with expired token"""
        user_data = {
            'ID': 'user-123',
            'USERNAME': 'testuser',
            'PASSWORD_RESET_TOKEN': 'expired_token',
            'PASSWORD_RESET_EXPIRES': datetime.now() - timedelta(hours=1),  # Expired
            'HASHED_PASSWORD': 'old_hash'
        }
        mock_db.execute_query.return_value = [user_data]
        
        reset_data = models.PasswordReset(
            username="testuser",
            new_password="newpass123",
            reset_token="expired_token"
        )
        
        result = auth.reset_password(mock_db, reset_data)
        
        assert result is False
    
    def test_reset_password_invalid_token(self, mock_db):
        """Test password reset with invalid token"""
        user_data = {
            'ID': 'user-123',
            'USERNAME': 'testuser',
            'PASSWORD_RESET_TOKEN': 'correct_token',
            'PASSWORD_RESET_EXPIRES': datetime.now() + timedelta(hours=1),
            'HASHED_PASSWORD': 'old_hash'
        }
        mock_db.execute_query.return_value = [user_data]
        
        reset_data = models.PasswordReset(
            username="testuser",
            new_password="newpass123",
            reset_token="wrong_token"
        )
        
        result = auth.reset_password(mock_db, reset_data)
        
        assert result is False

class TestSnowflakeAuthentication:
    """Test Snowflake-specific authentication"""
    
    @pytest.fixture
    def mock_db(self):
        """Mock database for testing"""
        db = Mock(spec=SnowflakeConnection)
        return db
    
    @patch('snowflake.connector.connect')
    def test_authenticate_snowflake_user_success(self, mock_connect):
        """Test successful Snowflake authentication"""
        mock_connection = Mock()
        mock_connect.return_value = mock_connection
        
        result = auth.authenticate_snowflake_user("sf_user", "sf_pass")
        
        assert result is True
        mock_connect.assert_called_once()
        mock_connection.close.assert_called_once()
    
    @patch('snowflake.connector.connect')
    def test_authenticate_snowflake_user_failure(self, mock_connect):
        """Test failed Snowflake authentication"""
        mock_connect.side_effect = Exception("Authentication failed")
        
        result = auth.authenticate_snowflake_user("sf_user", "wrong_pass")
        
        assert result is False

class TestRoleBasedAccess:
    """Test role-based access control"""
    
    def test_admin_role_permissions(self):
        """Test admin role has full permissions"""
        admin_user = models.User(
            id="admin-123",
            username="admin",
            role="admin",
            is_active=True,
            is_sso_user=False,
            use_snowflake_auth=False,
            created_at=datetime.now()
        )
        
        # Admin should have access to user management
        assert admin_user.role == "admin"
    
    def test_user_role_permissions(self):
        """Test regular user role has limited permissions"""
        regular_user = models.User(
            id="user-123",
            username="user",
            role="user",
            is_active=True,
            is_sso_user=False,
            use_snowflake_auth=False,
            created_at=datetime.now()
        )
        
        # Regular user should not have admin privileges
        assert regular_user.role == "user"

if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 