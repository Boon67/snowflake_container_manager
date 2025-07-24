import snowflake.connector
import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import logging
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.serialization import load_pem_private_key

load_dotenv()

logger = logging.getLogger(__name__)

class SnowflakeConnection:
    def __init__(self):
        self.connection = None
        self.cursor = None
        
    def _load_private_key(self, private_key_path: str, passphrase: Optional[str] = None):
        """Load and parse private key for keypair authentication"""
        try:
            with open(private_key_path, 'rb') as key_file:
                private_key_data = key_file.read()
            
            # Load the private key with or without passphrase
            if passphrase:
                # Use passphrase if provided
                passphrase_bytes = passphrase.encode()
                private_key = load_pem_private_key(
                    private_key_data,
                    password=passphrase_bytes
                )
            else:
                # No passphrase needed - don't pass password parameter
                private_key = load_pem_private_key(private_key_data, None)
            
            # Serialize to DER format for Snowflake
            private_key_der = private_key.private_bytes(
                encoding=serialization.Encoding.DER,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            )
            
            return private_key_der
        except Exception as e:
            logger.error(f"Failed to load private key: {e}")
            raise
        
    def connect(self):
        """Establish connection to Snowflake using password or keypair authentication"""
        try:
            # Base connection parameters
            connection_params = {
                'account': os.getenv('SNOWFLAKE_ACCOUNT'),
                'user': os.getenv('SNOWFLAKE_USER'),
                'warehouse': os.getenv('SNOWFLAKE_WAREHOUSE'),
                'database': os.getenv('SNOWFLAKE_DATABASE'),
                'schema': os.getenv('SNOWFLAKE_SCHEMA'),
                'role': os.getenv('SNOWFLAKE_ROLE')
            }
            
            # Check authentication method
            private_key_path = os.getenv('SNOWFLAKE_PRIVATE_KEY_PATH')
            
            if private_key_path and os.path.exists(private_key_path):
                # Use keypair authentication
                logger.info("Using keypair authentication for Snowflake")
                passphrase = os.getenv('SNOWFLAKE_PRIVATE_KEY_PASSPHRASE')
                private_key_der = self._load_private_key(private_key_path, passphrase)
                connection_params['private_key'] = private_key_der
            else:
                # Use password authentication
                logger.info("Using password authentication for Snowflake")
                password = os.getenv('SNOWFLAKE_PASSWORD')
                if not password:
                    raise ValueError("Either SNOWFLAKE_PASSWORD or SNOWFLAKE_PRIVATE_KEY_PATH must be provided")
                connection_params['password'] = password
            
            self.connection = snowflake.connector.connect(**connection_params)
            self.cursor = self.connection.cursor()
            logger.info("Successfully connected to Snowflake")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Snowflake: {e}")
            return False
    
    def disconnect(self):
        """Close Snowflake connection"""
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
        logger.info("Disconnected from Snowflake")
    
    def validate_connection(self):
        """Validate that the database connection is working properly"""
        if not self.connection or not self.cursor:
            raise ConnectionError("Database connection not established")
        
        try:
            # Test the connection with a simple query
            logger.info("Validating database connection...")
            self.cursor.execute("SELECT 1 as test_connection")
            result = self.cursor.fetchone()
            
            if result and result[0] == 1:
                logger.info("✅ Database connection validation successful")
                return True
            else:
                raise ConnectionError("Database connection test query failed")
                
        except Exception as e:
            logger.error(f"❌ Database connection validation failed: {e}")
            raise ConnectionError(f"Database connection validation failed: {e}")
    
    def execute_query(self, query: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
        """Execute a query and return results"""
        try:
            if params:
                self.cursor.execute(query, params)
            else:
                self.cursor.execute(query)
            
            columns = [desc[0] for desc in self.cursor.description] if self.cursor.description else []
            rows = self.cursor.fetchall()
            
            return [dict(zip(columns, row)) for row in rows]
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise
    
    def execute_non_query(self, query: str, params: Optional[tuple] = None) -> bool:
        """Execute a non-query (INSERT, UPDATE, DELETE) statement"""
        try:
            if params:
                self.cursor.execute(query, params)
            else:
                self.cursor.execute(query)
            return True
        except Exception as e:
            logger.error(f"Non-query execution failed: {e}")
            raise
    
    def initialize_schema(self):
        """Initialize the APP.CONFIG schema and create default tables if they don't exist"""
        try:
            # Create database if it doesn't exist
            self.execute_non_query("CREATE DATABASE IF NOT EXISTS APP")
            
            # Create schema if it doesn't exist
            self.execute_non_query("CREATE SCHEMA IF NOT EXISTS APP.CONFIG")
            
            # Use the schema
            self.execute_non_query("USE SCHEMA APP.CONFIG")
            
            # Create configuration tables
            self.create_config_tables()
            
            logger.info("Schema initialization completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Schema initialization failed: {e}")
            return False
    
    def create_config_tables(self):
        """Create default configuration tables"""
        
        # General application configuration table
        app_config_table = """
        CREATE TABLE IF NOT EXISTS APP_SETTINGS (
            ID NUMBER AUTOINCREMENT PRIMARY KEY,
            CONFIG_KEY VARCHAR(255) NOT NULL UNIQUE,
            CONFIG_VALUE VARCHAR(500),
            CONFIG_TYPE VARCHAR(50) DEFAULT 'string',
            DESCRIPTION VARCHAR(1000),
            CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
            UPDATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
        )
        """
        
        # Database connection configuration
        db_config_table = """
        CREATE TABLE IF NOT EXISTS DATABASE_SETTINGS (
            ID NUMBER AUTOINCREMENT PRIMARY KEY,
            CONNECTION_NAME VARCHAR(255) NOT NULL UNIQUE,
            HOST VARCHAR(255),
            PORT NUMBER,
            DATABASE_NAME VARCHAR(255),
            USERNAME VARCHAR(255),
            PASSWORD VARCHAR(255),
            ADDITIONAL_PARAMS VARCHAR(1000),
            ACTIVE BOOLEAN DEFAULT TRUE,
            CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
            UPDATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
        )
        """
        
        # API configuration table
        api_config_table = """
        CREATE TABLE IF NOT EXISTS API_SETTINGS (
            ID NUMBER AUTOINCREMENT PRIMARY KEY,
            API_NAME VARCHAR(255) NOT NULL UNIQUE,
            ENDPOINT_URL VARCHAR(500),
            API_KEY VARCHAR(255),
            TIMEOUT_SECONDS NUMBER DEFAULT 30,
            RATE_LIMIT NUMBER,
            ACTIVE BOOLEAN DEFAULT TRUE,
            CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
            UPDATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
        )
        """
        
        # Feature flags table
        feature_flags_table = """
        CREATE TABLE IF NOT EXISTS FEATURE_FLAGS (
            ID NUMBER AUTOINCREMENT PRIMARY KEY,
            FEATURE_NAME VARCHAR(255) NOT NULL UNIQUE,
            ENABLED BOOLEAN DEFAULT FALSE,
            DESCRIPTION VARCHAR(1000),
            ROLLOUT_PERCENTAGE NUMBER DEFAULT 0,
            ENVIRONMENT VARCHAR(50) DEFAULT 'production',
            CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
            UPDATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
        )
        """
        
        # Execute table creation queries
        self.execute_non_query(app_config_table)
        self.execute_non_query(db_config_table)
        self.execute_non_query(api_config_table)
        self.execute_non_query(feature_flags_table)
        
        # Insert some default configuration values if tables are empty
        self.insert_default_data()
    
    def insert_default_data(self):
        """Insert default configuration data if tables are empty"""
        
        # Check if APP_SETTINGS has any data
        result = self.execute_query("SELECT COUNT(*) as count FROM APP_SETTINGS")
        if result[0]['COUNT'] == 0:
            default_app_settings = [
                ("APP_NAME", "Configuration Manager", "string", "Application name"),
                ("VERSION", "1.0.0", "string", "Application version"),
                ("ENVIRONMENT", "development", "string", "Current environment"),
                ("LOG_LEVEL", "INFO", "string", "Logging level"),
                ("MAX_UPLOAD_SIZE", "10485760", "number", "Maximum file upload size in bytes")
            ]
            
            for key, value, config_type, description in default_app_settings:
                self.execute_non_query(
                    "INSERT INTO APP_SETTINGS (CONFIG_KEY, CONFIG_VALUE, CONFIG_TYPE, DESCRIPTION) VALUES (%s, %s, %s, %s)",
                    (key, value, config_type, description)
                )
        
        # Add default feature flags
        result = self.execute_query("SELECT COUNT(*) as count FROM FEATURE_FLAGS")
        if result[0]['COUNT'] == 0:
            default_features = [
                ("ADVANCED_ANALYTICS", False, "Enable advanced analytics features", 0),
                ("BETA_UI", False, "Enable beta user interface", 10),
                ("EMAIL_NOTIFICATIONS", True, "Enable email notifications", 100)
            ]
            
            for feature, enabled, description, rollout in default_features:
                self.execute_non_query(
                    "INSERT INTO FEATURE_FLAGS (FEATURE_NAME, ENABLED, DESCRIPTION, ROLLOUT_PERCENTAGE) VALUES (%s, %s, %s, %s)",
                    (feature, enabled, description, rollout)
                )

# Global database instance
db = SnowflakeConnection()

def get_database():
    """Get database connection instance"""
    return db 