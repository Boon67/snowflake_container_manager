import snowflake.connector
import os
import logging
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
import uuid

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SnowflakeConnection:
    def __init__(self):
        self.connection = None
        self.cursor = None

    def _load_private_key(self, private_key_path: str, passphrase: Optional[str] = None) -> bytes:
        """Load and return the private key for Snowflake keypair authentication"""
        try:
            with open(private_key_path, 'rb') as key_file:
                private_key = serialization.load_pem_private_key(
                    key_file.read(),
                    password=passphrase.encode() if passphrase else None,
                )
            
            return private_key.private_bytes(
                encoding=serialization.Encoding.DER,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            )
        except Exception as e:
            logger.error(f"Error loading private key: {e}")
            raise

    def connect(self) -> bool:
        """Establish connection to Snowflake"""
        try:
            # Get connection parameters from environment
            account = os.getenv("SNOWFLAKE_ACCOUNT")
            user = os.getenv("SNOWFLAKE_USER")
            warehouse = os.getenv("SNOWFLAKE_WAREHOUSE")
            database = os.getenv("SNOWFLAKE_DATABASE")
            schema = os.getenv("SNOWFLAKE_SCHEMA", "PUBLIC")
            
            # Check available authentication credentials
            password = os.getenv("SNOWFLAKE_PASSWORD")
            private_key_path = os.getenv("SNOWFLAKE_PRIVATE_KEY_PATH")
            
            # First, connect without specifying database/schema to create them if needed
            base_connection_params = {
                "account": account,
                "user": user,
                "warehouse": warehouse,
            }
            
            # Auto-detect authentication method based on available credentials
            if private_key_path and os.path.exists(private_key_path):
                # Use keypair authentication (preferred if available)
                logger.info("🔑 Using keypair authentication")
                private_key_passphrase = os.getenv("SNOWFLAKE_PRIVATE_KEY_PASSPHRASE")
                
                private_key = self._load_private_key(private_key_path, private_key_passphrase)
                base_connection_params["private_key"] = private_key
                
            elif password:
                # Use password authentication
                logger.info("🔐 Using password authentication")
                base_connection_params["password"] = password
                
            else:
                # No valid authentication credentials found
                raise ValueError(
                    "No valid Snowflake authentication credentials found. "
                    "Please provide either SNOWFLAKE_PASSWORD or SNOWFLAKE_PRIVATE_KEY_PATH in your .env file"
                )
            
            # Create initial connection to create database/schema if needed
            logger.info("📡 Establishing initial connection to Snowflake...")
            temp_connection = snowflake.connector.connect(**base_connection_params)
            temp_cursor = temp_connection.cursor()
            
            # Create database if it doesn't exist
            logger.info(f"🏗️ Ensuring database '{database}' exists...")
            temp_cursor.execute(f"CREATE DATABASE IF NOT EXISTS {database}")
            logger.info(f"✅ Database '{database}' is ready")
            
            # Use the database
            temp_cursor.execute(f"USE DATABASE {database}")
            
            # Create schema if it doesn't exist
            logger.info(f"🏗️ Ensuring schema '{schema}' exists...")
            temp_cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {schema}")
            logger.info(f"✅ Schema '{schema}' is ready")
            
            # Close temporary connection
            temp_cursor.close()
            temp_connection.close()
            
            # Now create the main connection with database and schema specified
            connection_params = base_connection_params.copy()
            connection_params.update({
                "database": database,
                "schema": schema,
            })
            
            logger.info(f"🔗 Connecting to {database}.{schema}...")
            self.connection = snowflake.connector.connect(**connection_params)
            self.cursor = self.connection.cursor()
            logger.info("✅ Successfully connected to Snowflake")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to connect to Snowflake: {e}")
            return False

    def disconnect(self):
        """Close Snowflake connection"""
        try:
            if self.cursor:
                self.cursor.close()
            if self.connection:
                self.connection.close()
            logger.info("🔌 Disconnected from Snowflake")
        except Exception as e:
            logger.error(f"Error disconnecting from Snowflake: {e}")

    def validate_connection(self) -> bool:
        """Validate the database connection"""
        try:
            if not self.connection:
                return False
            self.cursor.execute("SELECT 1")
            result = self.cursor.fetchone()
            return result[0] == 1
        except Exception as e:
            logger.error(f"Connection validation failed: {e}")
            return False

    def execute_query(self, query: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
        """Execute a SELECT query and return results as list of dictionaries"""
        try:
            if params:
                self.cursor.execute(query, params)
            else:
                self.cursor.execute(query)
            
            columns = [desc[0] for desc in self.cursor.description]
            rows = self.cursor.fetchall()
            
            return [dict(zip(columns, row)) for row in rows]
            
        except Exception as e:
            logger.error(f"Error executing query: {e}")
            raise

    def execute_non_query(self, query: str, params: Optional[tuple] = None) -> int:
        """Execute an INSERT, UPDATE, or DELETE query and return affected rows"""
        try:
            if params:
                result = self.cursor.execute(query, params)
            else:
                result = self.cursor.execute(query)
            
            return self.cursor.rowcount
            
        except Exception as e:
            logger.error(f"Error executing non-query: {e}")
            raise

    def create_tables(self):
        """Create application tables if they don't exist"""
        
        # Solutions table
        solutions_table = """
        CREATE TABLE IF NOT EXISTS SOLUTIONS (
            ID VARCHAR(36) PRIMARY KEY,
            NAME VARCHAR(255) NOT NULL UNIQUE,
            DESCRIPTION VARCHAR(1000),
            CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
            UPDATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
        )
        """
        
        # Tags table
        tags_table = """
        CREATE TABLE IF NOT EXISTS TAGS (
            ID VARCHAR(36) PRIMARY KEY,
            NAME VARCHAR(255) NOT NULL UNIQUE,
            CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
        )
        """

        # Parameters table (now independent of solutions)
        parameters_table = """
        CREATE TABLE IF NOT EXISTS PARAMETERS (
            ID VARCHAR(36) PRIMARY KEY,
            NAME VARCHAR(255),
            KEY VARCHAR(255) NOT NULL UNIQUE,
            VALUE VARCHAR,
            DESCRIPTION VARCHAR(1000),
            IS_SECRET BOOLEAN DEFAULT FALSE,
            CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
            UPDATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
        )
        """
        
        # Solution-Parameters junction table (many-to-many)
        solution_parameters_table = """
        CREATE TABLE IF NOT EXISTS SOLUTION_PARAMETERS (
            SOLUTION_ID VARCHAR(36) NOT NULL,
            PARAMETER_ID VARCHAR(36) NOT NULL,
            PRIMARY KEY (SOLUTION_ID, PARAMETER_ID),
            CONSTRAINT FK_SP_SOLUTION FOREIGN KEY (SOLUTION_ID) REFERENCES SOLUTIONS(ID) ON DELETE CASCADE,
            CONSTRAINT FK_SP_PARAMETER FOREIGN KEY (PARAMETER_ID) REFERENCES PARAMETERS(ID) ON DELETE CASCADE
        )
        """
        
        # Parameter-Tags junction table
        parameter_tags_table = """
        CREATE TABLE IF NOT EXISTS PARAMETER_TAGS (
            PARAMETER_ID VARCHAR(36) NOT NULL,
            TAG_ID VARCHAR(36) NOT NULL,
            PRIMARY KEY (PARAMETER_ID, TAG_ID),
            CONSTRAINT FK_PT_PARAMETER FOREIGN KEY (PARAMETER_ID) REFERENCES PARAMETERS(ID) ON DELETE CASCADE,
            CONSTRAINT FK_PT_TAG FOREIGN KEY (TAG_ID) REFERENCES TAGS(ID) ON DELETE CASCADE
        )
        """
        
        # Users table
        users_table = """
        CREATE TABLE IF NOT EXISTS USERS (
            ID VARCHAR(36) PRIMARY KEY,
            USERNAME VARCHAR(255) NOT NULL UNIQUE,
            HASHED_PASSWORD VARCHAR(255) NOT NULL,
            CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
        )
        """

        try:
            self.execute_non_query(solutions_table)
            self.execute_non_query(tags_table)
            self.execute_non_query(parameters_table)
            self.execute_non_query(solution_parameters_table)
            self.execute_non_query(parameter_tags_table)
            self.execute_non_query(users_table)
            logger.info("✅ All tables created successfully")
        except Exception as e:
            logger.error(f"❌ Error creating tables: {e}")
            raise

    def initialize_schema(self) -> bool:
        """Initialize the database schema and insert default data"""
        try:
            self.create_tables()
            self.insert_default_data()
            return True
        except Exception as e:
            logger.error(f"❌ Schema initialization failed: {e}")
            return False

    def insert_default_data(self):
        """Insert default solutions and sample data"""
        try:
            # Check if we already have data
            existing_solutions = self.execute_query("SELECT COUNT(*) as count FROM SOLUTIONS")
            if existing_solutions[0]['COUNT'] > 0:
                logger.info("✅ Default data already exists, skipping insertion")
                return

            # Create default solution
            default_solution_id = str(uuid.uuid4())
            self.execute_non_query(
                "INSERT INTO SOLUTIONS (ID, NAME, DESCRIPTION) VALUES (%s, %s, %s)",
                (default_solution_id, "Default Solution", "Default configuration solution for getting started")
            )

            # Create common tags
            common_tags = [
                ("Environment", str(uuid.uuid4())),
                ("Database", str(uuid.uuid4())),
                ("API", str(uuid.uuid4())),
                ("Security", str(uuid.uuid4())),
                ("Feature", str(uuid.uuid4()))
            ]

            for tag_name, tag_id in common_tags:
                self.execute_non_query(
                    "INSERT INTO TAGS (ID, NAME) VALUES (%s, %s)",
                    (tag_id, tag_name)
                )

            # Get tag IDs for reference
            env_tag = next(tag_id for tag_name, tag_id in common_tags if tag_name == "Environment")
            db_tag = next(tag_id for tag_name, tag_id in common_tags if tag_name == "Database")
            api_tag = next(tag_id for tag_name, tag_id in common_tags if tag_name == "API")

            # Create sample parameters
            sample_parameters = [
                (str(uuid.uuid4()), "Application Name", "app_name", "Configuration Manager", "Application name", False, [env_tag]),
                (str(uuid.uuid4()), "Application Version", "app_version", "1.0.0", "Application version", False, [env_tag]),
                (str(uuid.uuid4()), "Environment", "environment", "development", "Current environment", False, [env_tag]),
                (str(uuid.uuid4()), "DB Connection Timeout", "db_connection_timeout", "30", "Database connection timeout in seconds", False, [db_tag]),
                (str(uuid.uuid4()), "API Rate Limit", "api_rate_limit", "1000", "API requests per minute limit", False, [api_tag]),
                (str(uuid.uuid4()), "Secret Key", "secret_key", "your-secret-key-here", "Application secret key", True, [env_tag]),
            ]

            for param_id, name, key, value, description, is_secret, tag_ids in sample_parameters:
                # Insert parameter
                self.execute_non_query(
                    "INSERT INTO PARAMETERS (ID, NAME, KEY, VALUE, DESCRIPTION, IS_SECRET) VALUES (%s, %s, %s, %s, %s, %s)",
                    (param_id, name, key, value, description, is_secret)
                )
                
                # Associate tags
                for tag_id in tag_ids:
                    self.execute_non_query(
                        "INSERT INTO PARAMETER_TAGS (PARAMETER_ID, TAG_ID) VALUES (%s, %s)",
                        (param_id, tag_id)
                    )

            # Associate parameters with the default solution
            for param_id in [p[0] for p in sample_parameters]:
                self.execute_non_query(
                    "INSERT INTO SOLUTION_PARAMETERS (SOLUTION_ID, PARAMETER_ID) VALUES (%s, %s)",
                    (default_solution_id, param_id)
                )

            logger.info("✅ Default data inserted successfully")
            
        except Exception as e:
            logger.error(f"❌ Error inserting default data: {e}")
            raise

    def get_solution_with_parameters(self, solution_id: str) -> Optional[Dict[str, Any]]:
        """Get a solution with all its parameters and associated tags"""
        try:
            # Get solution
            solution_data = self.execute_query(
                "SELECT * FROM SOLUTIONS WHERE ID = %s", (solution_id,)
            )
            if not solution_data:
                return None
            
            solution = solution_data[0]
            
            # Get parameters with their tags
            params_query = """
            SELECT 
                p.ID, p.KEY, p.VALUE, p.DESCRIPTION, p.IS_SECRET, p.CREATED_AT, p.UPDATED_AT,
                LISTAGG(t.NAME, ',') WITHIN GROUP (ORDER BY t.NAME) as TAG_NAMES,
                LISTAGG(t.ID, ',') WITHIN GROUP (ORDER BY t.NAME) as TAG_IDS
            FROM PARAMETERS p
            LEFT JOIN PARAMETER_TAGS pt ON p.ID = pt.PARAMETER_ID
            LEFT JOIN TAGS t ON pt.TAG_ID = t.ID
            WHERE p.ID IN (
                SELECT PARAMETER_ID FROM SOLUTION_PARAMETERS WHERE SOLUTION_ID = %s
            )
            GROUP BY p.ID, p.KEY, p.VALUE, p.DESCRIPTION, p.IS_SECRET, p.CREATED_AT, p.UPDATED_AT
            ORDER BY p.KEY
            """
            
            parameters = self.execute_query(params_query, (solution_id,))
            
            # Process parameters to include tags
            for param in parameters:
                if param['TAG_NAMES']:
                    tag_names = param['TAG_NAMES'].split(',')
                    tag_ids = param['TAG_IDS'].split(',')
                    param['TAGS'] = [{'ID': tid, 'NAME': tname} for tid, tname in zip(tag_ids, tag_names)]
                else:
                    param['TAGS'] = []
                # Clean up the aggregated fields
                del param['TAG_NAMES']
                del param['TAG_IDS']
            
            solution['PARAMETERS'] = parameters
            return solution
            
        except Exception as e:
            logger.error(f"Error getting solution with parameters: {e}")
            raise

    def get_container_services(self) -> List[Dict[str, Any]]:
        """Get all container services"""
        try:
            # Get container services from Snowflake
            query = """
            SHOW SERVICES
            """
            result = self.execute_query(query)
            
            services = []
            for row in result:
                service = {
                    'name': row.get('name', ''),
                    'compute_pool': row.get('compute_pool', ''),
                    'status': row.get('state', 'UNKNOWN'),
                    'spec': row.get('spec', ''),
                    'min_instances': row.get('min_instances', 1),
                    'max_instances': row.get('max_instances', 1),
                    'created_at': row.get('created_on', ''),
                    'updated_at': row.get('updated_on', ''),
                    'endpoint_url': row.get('public_endpoints', ''),
                    'dns_name': row.get('dns_name', '')
                }
                services.append(service)
            
            return services
            
        except Exception as e:
            logger.error(f"Error getting container services: {e}")
            return []

    def get_compute_pools(self) -> List[Dict[str, Any]]:
        """Get all compute pools"""
        try:
            query = """
            SHOW COMPUTE POOLS
            """
            result = self.execute_query(query)
            
            pools = []
            for row in result:
                pool = {
                    'name': row.get('name', ''),
                    'state': row.get('state', 'UNKNOWN'),
                    'min_nodes': row.get('min_nodes', 0),
                    'max_nodes': row.get('max_nodes', 0),
                    'instance_family': row.get('instance_family', ''),
                    'created_at': row.get('created_on', '')
                }
                pools.append(pool)
            
            return pools
            
        except Exception as e:
            logger.error(f"Error getting compute pools: {e}")
            return []

    def start_container_service(self, service_name: str) -> bool:
        """Start a container service"""
        try:
            query = f"ALTER SERVICE {service_name} RESUME"
            self.execute_non_query(query)
            logger.info(f"✅ Container service {service_name} started successfully")
            return True
        except Exception as e:
            logger.error(f"❌ Error starting container service {service_name}: {e}")
            return False

    def stop_container_service(self, service_name: str) -> bool:
        """Stop a container service"""
        try:
            query = f"ALTER SERVICE {service_name} SUSPEND"
            self.execute_non_query(query)
            logger.info(f"✅ Container service {service_name} stopped successfully")
            return True
        except Exception as e:
            logger.error(f"❌ Error stopping container service {service_name}: {e}")
            return False

    def get_container_service_details(self, service_name: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific container service"""
        try:
            # Get service status
            query = f"DESCRIBE SERVICE {service_name}"
            result = self.execute_query(query)
            
            if result:
                service_info = result[0]
                return {
                    'name': service_name,
                    'status': service_info.get('status', 'UNKNOWN'),
                    'spec': service_info.get('spec', ''),
                    'compute_pool': service_info.get('compute_pool', ''),
                    'min_instances': service_info.get('min_instances', 1),
                    'max_instances': service_info.get('max_instances', 1),
                    'endpoint_url': service_info.get('public_endpoints', ''),
                    'dns_name': service_info.get('dns_name', ''),
                    'created_at': service_info.get('created_on', ''),
                    'updated_at': service_info.get('updated_on', '')
                }
            return None
            
        except Exception as e:
            logger.error(f"Error getting container service details for {service_name}: {e}")
            return None

# Global database instance
_db_instance = None

def get_database() -> SnowflakeConnection:
    """Get or create database connection singleton"""
    global _db_instance
    if _db_instance is None:
        _db_instance = SnowflakeConnection()
    return _db_instance 