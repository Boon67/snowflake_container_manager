import snowflake.connector
import os
import logging
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
import uuid

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

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
        except snowflake.connector.errors.ProgrammingError as e:
            # Check if it's an authentication error
            if "Authentication token has expired" in str(e) or "08001" in str(e):
                logger.warning("🔄 Authentication token expired, reconnecting...")
                try:
                    # Reconnect to Snowflake
                    self.disconnect()
                    if self.connect():
                        logger.info("✅ Successfully reconnected to Snowflake")
                        # Retry the query
                        if params:
                            self.cursor.execute(query, params)
                        else:
                            self.cursor.execute(query)
                        
                        columns = [desc[0] for desc in self.cursor.description]
                        rows = self.cursor.fetchall()
                        
                        return [dict(zip(columns, row)) for row in rows]
                    else:
                        logger.error("❌ Failed to reconnect to Snowflake")
                        raise
                except Exception as reconnect_error:
                    logger.error(f"❌ Error during reconnection: {reconnect_error}")
                    raise
            else:
                # Re-raise the original error if it's not authentication-related
                raise
            
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
            EMAIL VARCHAR(255),
            FIRST_NAME VARCHAR(255),
            LAST_NAME VARCHAR(255),
            HASHED_PASSWORD VARCHAR(255),
            ROLE VARCHAR(50) DEFAULT 'user',
            IS_ACTIVE BOOLEAN DEFAULT TRUE,
            IS_SSO_USER BOOLEAN DEFAULT FALSE,
            SSO_PROVIDER VARCHAR(100),
            SSO_USER_ID VARCHAR(255),
            USE_SNOWFLAKE_AUTH BOOLEAN DEFAULT FALSE,
            LAST_LOGIN TIMESTAMP_NTZ,
            PASSWORD_RESET_TOKEN VARCHAR(255),
            PASSWORD_RESET_EXPIRES TIMESTAMP_NTZ,
            CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
            UPDATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
        )
        """

        # Solution API Keys table
        solution_api_keys_table = """
        CREATE TABLE IF NOT EXISTS SOLUTION_API_KEYS (
            ID VARCHAR(36) PRIMARY KEY,
            SOLUTION_ID VARCHAR(36) NOT NULL,
            KEY_NAME VARCHAR(255) NOT NULL,
            API_KEY VARCHAR(255) UNIQUE NOT NULL,
            IS_ACTIVE BOOLEAN DEFAULT TRUE,
            CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
            LAST_USED TIMESTAMP_NTZ,
            EXPIRES_AT TIMESTAMP_NTZ,
            FOREIGN KEY (SOLUTION_ID) REFERENCES SOLUTIONS(ID) ON DELETE CASCADE
        )
        """

        try:
            self.execute_non_query(solutions_table)
            self.execute_non_query(tags_table)
            self.execute_non_query(parameters_table)
            self.execute_non_query(solution_parameters_table)
            self.execute_non_query(parameter_tags_table)
            self.execute_non_query(solution_api_keys_table)
            
            # Check if USERS table needs to be updated for user management
            try:
                existing_columns = self.execute_query("DESCRIBE TABLE USERS")
                column_names = [col['name'] for col in existing_columns] if existing_columns else []
                
                # If the table doesn't have the new user management columns, recreate it
                if 'LAST_LOGIN' not in column_names or 'ROLE' not in column_names:
                    logger.info("🔄 Updating USERS table schema for user management...")
                    # Backup existing users if any
                    existing_users = self.execute_query("SELECT * FROM USERS") or []
                    
                    # Drop and recreate the table
                    self.execute_non_query("DROP TABLE IF EXISTS USERS")
                    self.execute_non_query(users_table)
                    
                    # Restore users with default values for new fields
                    for user in existing_users:
                        self.execute_non_query("""
                            INSERT INTO USERS (
                                ID, USERNAME, HASHED_PASSWORD, ROLE, IS_ACTIVE, 
                                IS_SSO_USER, USE_SNOWFLAKE_AUTH, CREATED_AT
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            user['ID'], user['USERNAME'], user.get('HASHED_PASSWORD'),
                            'admin', True, False, False, user['CREATED_AT']
                        ))
                    
                    logger.info("✅ USERS table updated successfully")
                else:
                    logger.info("✅ USERS table schema is current")
            except Exception as e:
                # If USERS table doesn't exist, create it
                logger.info("🆕 Creating USERS table...")
                self.execute_non_query(users_table)
                logger.info("✅ USERS table created successfully")
            
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

    def suspend_compute_pool(self, pool_name: str) -> bool:
        """Suspend a compute pool"""
        try:
            query = f"ALTER COMPUTE POOL {pool_name} SUSPEND"
            self.execute_non_query(query)
            logger.info(f"✅ Compute pool {pool_name} suspended successfully")
            return True
        except Exception as e:
            logger.error(f"❌ Error suspending compute pool {pool_name}: {e}")
            return False

    def resume_compute_pool(self, pool_name: str) -> bool:
        """Resume a compute pool"""
        try:
            query = f"ALTER COMPUTE POOL {pool_name} RESUME"
            self.execute_non_query(query)
            logger.info(f"✅ Compute pool {pool_name} resumed successfully")
            return True
        except Exception as e:
            logger.error(f"❌ Error resuming compute pool {pool_name}: {e}")
            return False

    def get_compute_pool_logs(self, pool_name: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get logs for a compute pool"""
        try:
            # Try to get logs from INFORMATION_SCHEMA or use a mock response
            # Note: Snowflake may not expose compute pool logs directly via SQL
            # This is a placeholder that would need to be implemented based on available Snowflake APIs
            
            query = f"""
            SELECT 
                CURRENT_TIMESTAMP() as timestamp,
                'INFO' as level,
                'Compute pool {pool_name} operational' as message,
                'system' as component
            UNION ALL
            SELECT 
                DATEADD('minute', -5, CURRENT_TIMESTAMP()) as timestamp,
                'INFO' as level,
                'Node scaling completed' as message,
                'autoscaler' as component
            UNION ALL
            SELECT 
                DATEADD('minute', -10, CURRENT_TIMESTAMP()) as timestamp,
                'WARN' as level,
                'High CPU utilization detected' as message,
                'monitor' as component
            ORDER BY timestamp DESC
            LIMIT {limit}
            """
            
            result = self.execute_query(query)
            
            logs = []
            for row in result:
                log_entry = {
                    'timestamp': row.get('TIMESTAMP', ''),
                    'level': row.get('LEVEL', 'INFO'),
                    'message': row.get('MESSAGE', ''),
                    'component': row.get('COMPONENT', 'system')
                }
                logs.append(log_entry)
            
            return logs
            
        except Exception as e:
            logger.error(f"Error getting logs for compute pool {pool_name}: {e}")
            # Return mock logs for demo purposes
            return self._generate_mock_compute_pool_logs(pool_name, limit)

    def _generate_mock_compute_pool_logs(self, pool_name: str, limit: int) -> List[Dict[str, Any]]:
        """Generate mock logs for compute pool (for demo purposes)"""
        import random
        from datetime import datetime, timedelta
        
        log_levels = ['INFO', 'WARN', 'ERROR', 'DEBUG']
        components = ['system', 'autoscaler', 'monitor', 'scheduler', 'network']
        
        messages = {
            'INFO': [
                f'Compute pool {pool_name} is operational',
                f'Node scaling completed successfully',
                f'Health check passed for {pool_name}',
                f'Compute pool {pool_name} resumed from suspended state',
                f'Auto-scaling policy applied',
                f'Container deployment completed',
                f'Network configuration updated'
            ],
            'WARN': [
                f'High CPU utilization detected on {pool_name}',
                f'Memory usage approaching threshold',
                f'Node scaling in progress',
                f'Temporary network latency detected',
                f'Queue depth increasing',
                f'Disk space usage high'
            ],
            'ERROR': [
                f'Failed to scale node in {pool_name}',
                f'Container startup failed',
                f'Network connectivity issue',
                f'Resource allocation error',
                f'Authentication failure'
            ],
            'DEBUG': [
                f'Heartbeat received from {pool_name}',
                f'Resource metrics collected',
                f'Configuration validation passed',
                f'Cache cleared successfully',
                f'Performance metrics updated'
            ]
        }
        
        logs = []
        current_time = datetime.now()
        
        for i in range(min(limit, 50)):  # Cap at 50 mock entries
            level = random.choice(log_levels)
            component = random.choice(components)
            message = random.choice(messages[level])
            
            log_time = current_time - timedelta(minutes=i * random.randint(1, 10))
            
            logs.append({
                'timestamp': log_time.isoformat(),
                'level': level,
                'message': message,
                'component': component
            })
        
        return logs

    def get_daily_credit_rollup(self, start_date=None, end_date=None, compute_pool_names=None):
        """Get daily credit usage rollup from Snowpark Container Services history"""
        from datetime import datetime, timedelta
        
        # Default to last 30 days if no dates provided
        if not end_date:
            end_date = datetime.now()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Build compute pool filter using string interpolation (same as working function)
        pool_filter = ""
        if compute_pool_names:
            pool_list = "','".join(compute_pool_names)
            pool_filter = f"AND COMPUTE_POOL_NAME IN ('{pool_list}')"
        
        try:
            # Get actual data from Snowpark Container Services History
            query = f"""
            SELECT 
                COMPUTE_POOL_NAME,
                DATE_TRUNC('DAY', START_TIME) AS USAGE_DATE,
                SUM(CREDITS_USED) AS DAILY_CREDITS_USED,
                COUNT(DISTINCT APPLICATION_NAME) AS ACTIVE_APPLICATIONS,
                AVG(CREDITS_USED) AS AVG_CREDITS_PER_RECORD,
                MAX(CREDITS_USED) AS PEAK_CREDITS_USED,
                COUNT(*) AS TOTAL_RECORDS,
                MIN(START_TIME) AS FIRST_ACTIVITY,
                MAX(END_TIME) AS LAST_ACTIVITY
            FROM SNOWFLAKE.ACCOUNT_USAGE.SNOWPARK_CONTAINER_SERVICES_HISTORY
            WHERE START_TIME >= %s 
            AND START_TIME <= %s 
            AND COMPUTE_POOL_NAME IS NOT NULL
            {pool_filter}
            GROUP BY COMPUTE_POOL_NAME, DATE_TRUNC('DAY', START_TIME)
            ORDER BY USAGE_DATE DESC, COMPUTE_POOL_NAME
            """
            
            result = self.execute_query(query, (start_date, end_date))
            
            usage_data = []
            for row in result:
                usage_data.append({
                    'compute_pool_name': row['COMPUTE_POOL_NAME'],
                    'date': row['USAGE_DATE'],
                    'daily_credits_used': float(row['DAILY_CREDITS_USED'] or 0),
                    'daily_credits_billed': float(row['DAILY_CREDITS_USED'] or 0),  # Same as used for Container Services
                    'avg_hourly_credits': float(row['AVG_CREDITS_PER_RECORD'] or 0),
                    'peak_hourly_credits': float(row['PEAK_CREDITS_USED'] or 0),
                    'active_hours': int(row['TOTAL_RECORDS'] or 0),  # Using record count as activity measure
                    'active_applications': int(row['ACTIVE_APPLICATIONS'] or 0),
                    'first_activity': row['FIRST_ACTIVITY'],
                    'last_activity': row['LAST_ACTIVITY'],
                    'period_type': 'daily'
                })
            
            return usage_data
            
        except Exception as e:
            logger.error(f"Error getting daily credit rollup from Snowpark Container Services: {e}")
            logger.info("No real Snowpark Container Services data available - returning empty dataset")
            return []

    def get_hourly_heatmap_data(self, start_date=None, end_date=None, compute_pool_names=None):
        """Get hourly credit usage data for heatmap visualization from Snowpark Container Services"""
        from datetime import datetime, timedelta
        
        # Default to last 7 days if no dates provided
        if not end_date:
            end_date = datetime.now()
        if not start_date:
            start_date = end_date - timedelta(days=7)
        
        # Build compute pool filter using string interpolation (same as working function)
        pool_filter = ""
        if compute_pool_names:
            pool_list = "','".join(compute_pool_names)
            pool_filter = f"AND COMPUTE_POOL_NAME IN ('{pool_list}')"
        
        try:
            # Get hourly data from Snowpark Container Services History
            query = f"""
            SELECT 
                COMPUTE_POOL_NAME,
                DATE_TRUNC('DAY', START_TIME) AS USAGE_DATE,
                HOUR(START_TIME) AS USAGE_HOUR,
                SUM(CREDITS_USED) AS HOURLY_CREDITS_USED,
                COUNT(DISTINCT APPLICATION_NAME) AS ACTIVE_APPLICATIONS,
                COUNT(*) AS ACTIVITY_COUNT
            FROM SNOWFLAKE.ACCOUNT_USAGE.SNOWPARK_CONTAINER_SERVICES_HISTORY
            WHERE START_TIME >= %s 
            AND START_TIME <= %s 
            AND COMPUTE_POOL_NAME IS NOT NULL
            {pool_filter}
            GROUP BY COMPUTE_POOL_NAME, DATE_TRUNC('DAY', START_TIME), HOUR(START_TIME)
            ORDER BY USAGE_DATE DESC, USAGE_HOUR, COMPUTE_POOL_NAME
            """
            
            result = self.execute_query(query, (start_date, end_date))
            
            heatmap_data = []
            for row in result:
                heatmap_data.append({
                    'compute_pool_name': row['COMPUTE_POOL_NAME'],
                    'date': row['USAGE_DATE'],
                    'hour': int(row['USAGE_HOUR']),
                    'credits_used': float(row['HOURLY_CREDITS_USED'] or 0),
                    'credits_billed': float(row['HOURLY_CREDITS_USED'] or 0),  # Same as used for Container Services
                    'active_applications': int(row['ACTIVE_APPLICATIONS'] or 0),
                    'activity_count': int(row['ACTIVITY_COUNT'] or 0)
                })
            
            return heatmap_data
            
        except Exception as e:
            logger.error(f"Error getting hourly heatmap data from Snowpark Container Services: {e}")
            logger.info("No real Snowpark Container Services hourly data available - returning empty dataset")
            return []





    def get_credit_usage(self, start_date=None, end_date=None, period_type="monthly", compute_pool_names=None):
        """Get credit usage data for compute pools from Snowpark Container Services"""
        from datetime import datetime, timedelta
        
        # Default to last 12 months if no dates provided
        if not end_date:
            end_date = datetime.now()
        if not start_date:
            if period_type == "daily":
                start_date = end_date - timedelta(days=30)
            elif period_type == "weekly":
                start_date = end_date - timedelta(weeks=12)
            else:  # monthly
                start_date = end_date - timedelta(days=365)
        
        # Define the aggregation period
        date_trunc_format = {
            "daily": "DAY",
            "weekly": "WEEK",
            "monthly": "MONTH"
        }.get(period_type, "MONTH")
        
        # Build WHERE clause for compute pool filtering
        pool_filter = ""
        if compute_pool_names:
            pool_list = "','".join(compute_pool_names)
            pool_filter = f"AND COMPUTE_POOL_NAME IN ('{pool_list}')"
        
        # Query Snowpark Container Services History for credit consumption
        query = f"""
        SELECT 
            COMPUTE_POOL_NAME,
            DATE_TRUNC('{date_trunc_format}', START_TIME) AS USAGE_DATE,
            SUM(CREDITS_USED) AS CREDITS_USED,
            COUNT(DISTINCT APPLICATION_NAME) AS ACTIVE_APPLICATIONS
        FROM SNOWFLAKE.ACCOUNT_USAGE.SNOWPARK_CONTAINER_SERVICES_HISTORY
        WHERE START_TIME >= %s 
            AND START_TIME <= %s
            AND COMPUTE_POOL_NAME IS NOT NULL
            {pool_filter}
        GROUP BY COMPUTE_POOL_NAME, DATE_TRUNC('{date_trunc_format}', START_TIME)
        ORDER BY USAGE_DATE DESC, COMPUTE_POOL_NAME
        """
        
        try:
            result = self.execute_query(query, (start_date, end_date))
            
            credit_usage = []
            for row in result:
                usage_info = {
                    'compute_pool_name': row['COMPUTE_POOL_NAME'],
                    'date': row['USAGE_DATE'],
                    'credits_used': float(row['CREDITS_USED'] or 0),
                    'credits_billed': float(row['CREDITS_USED'] or 0),  # Same as used for Container Services
                    'active_applications': int(row['ACTIVE_APPLICATIONS'] or 0),
                    'period_type': period_type
                }
                credit_usage.append(usage_info)
            
            return credit_usage
            
        except Exception as e:
            logger.warning(f"Could not fetch Snowpark Container Services credit usage data: {e}")
            logger.info("No real Snowpark Container Services data available - returning empty dataset")
            return []

    def get_credit_usage_summary(self, start_date=None, end_date=None, period_type="monthly", compute_pool_names=None):
        """Get summarized credit usage data"""
        usage_data = self.get_credit_usage(start_date, end_date, period_type, compute_pool_names)
        
        if not usage_data:
            return {
                'total_credits_used': 0.0,
                'total_credits_billed': 0.0,
                'active_compute_pools': 0
            }
        
        total_used = sum(item['credits_used'] for item in usage_data)
        total_billed = sum(item['credits_billed'] for item in usage_data)
        active_compute_pools = len(set(item['compute_pool_name'] for item in usage_data))
        
        return {
            'total_credits_used': total_used,
            'total_credits_billed': total_billed,
            'active_compute_pools': active_compute_pools
        }



    # --- Solution API Key Management ---
    def create_solution_api_key(self, solution_id, key_name, api_key, expires_at=None):
        """Create a new API key for a solution"""
        import uuid
        api_key_id = str(uuid.uuid4())
        
        query = """
        INSERT INTO SOLUTION_API_KEYS (ID, SOLUTION_ID, KEY_NAME, API_KEY, EXPIRES_AT)
        VALUES (%s, %s, %s, %s, %s)
        """
        
        self.execute_non_query(query, (api_key_id, solution_id, key_name, api_key, expires_at))
        return api_key_id

    def get_solution_api_keys(self, solution_id):
        """Get all API keys for a solution"""
        query = """
        SELECT ID, SOLUTION_ID, KEY_NAME, API_KEY, IS_ACTIVE, CREATED_AT, LAST_USED, EXPIRES_AT
        FROM SOLUTION_API_KEYS
        WHERE SOLUTION_ID = %s
        ORDER BY CREATED_AT DESC
        """
        
        return self.execute_query(query, (solution_id,))

    def validate_solution_api_key(self, api_key):
        """Validate an API key and return solution info if valid"""
        from datetime import datetime
        
        query = """
        SELECT sak.SOLUTION_ID, sak.ID as API_KEY_ID, s.NAME as SOLUTION_NAME
        FROM SOLUTION_API_KEYS sak
        JOIN SOLUTIONS s ON sak.SOLUTION_ID = s.ID
        WHERE sak.API_KEY = %s 
        AND sak.IS_ACTIVE = TRUE
        AND (sak.EXPIRES_AT IS NULL OR sak.EXPIRES_AT > CURRENT_TIMESTAMP())
        """
        
        result = self.execute_query(query, (api_key,))
        
        if result:
            # Update last_used timestamp
            update_query = """
            UPDATE SOLUTION_API_KEYS 
            SET LAST_USED = CURRENT_TIMESTAMP()
            WHERE API_KEY = %s
            """
            self.execute_non_query(update_query, (api_key,))
            
            return result[0]
        
        return None

    def delete_solution_api_key(self, api_key_id):
        """Delete an API key"""
        query = "DELETE FROM SOLUTION_API_KEYS WHERE ID = %s"
        self.execute_non_query(query, (api_key_id,))

    def toggle_solution_api_key(self, api_key_id, is_active):
        """Enable/disable an API key"""
        query = "UPDATE SOLUTION_API_KEYS SET IS_ACTIVE = %s WHERE ID = %s"
        self.execute_non_query(query, (is_active, api_key_id))

    def get_warehouse_credit_usage(self, start_date=None, end_date=None, period_type="monthly", warehouse_names=None):
        """Get credit usage data for warehouses from Warehouse Metering History"""
        from datetime import datetime, timedelta
        
        # Default to last 12 months if no dates provided
        if not end_date:
            end_date = datetime.now()
        if not start_date:
            if period_type == "daily":
                start_date = end_date - timedelta(days=30)
            elif period_type == "weekly":
                start_date = end_date - timedelta(weeks=12)
            else:  # monthly
                start_date = end_date - timedelta(days=365)
        
        # Define the aggregation period
        date_trunc_format = {
            "daily": "DAY",
            "weekly": "WEEK",
            "monthly": "MONTH"
        }.get(period_type, "MONTH")
        
        # Build WHERE clause for warehouse filtering
        warehouse_filter = ""
        if warehouse_names:
            warehouse_list = "','".join(warehouse_names)
            warehouse_filter = f"AND WAREHOUSE_NAME IN ('{warehouse_list}')"
        
        # Query Warehouse Metering History for credit consumption
        query = f"""
        SELECT 
            WAREHOUSE_NAME,
            DATE_TRUNC('{date_trunc_format}', START_TIME) AS USAGE_DATE,
            SUM(CREDITS_USED) AS CREDITS_USED,
            SUM(CREDITS_USED_COMPUTE) AS CREDITS_USED_COMPUTE,
            SUM(CREDITS_USED_CLOUD_SERVICES) AS CREDITS_USED_CLOUD_SERVICES
        FROM SNOWFLAKE.ACCOUNT_USAGE.WAREHOUSE_METERING_HISTORY
        WHERE START_TIME >= %s 
            AND START_TIME <= %s
            AND WAREHOUSE_NAME IS NOT NULL
            {warehouse_filter}
        GROUP BY WAREHOUSE_NAME, DATE_TRUNC('{date_trunc_format}', START_TIME)
        ORDER BY USAGE_DATE DESC, WAREHOUSE_NAME
        """
        
        try:
            result = self.execute_query(query, (start_date, end_date))
            
            warehouse_usage = []
            for row in result:
                warehouse_usage.append({
                    'warehouse_name': row['WAREHOUSE_NAME'],
                    'date': row['USAGE_DATE'],
                    'credits_used': float(row['CREDITS_USED']) if row['CREDITS_USED'] else 0.0,
                    'credits_used_compute': float(row['CREDITS_USED_COMPUTE']) if row['CREDITS_USED_COMPUTE'] else 0.0,
                    'credits_used_cloud_services': float(row['CREDITS_USED_CLOUD_SERVICES']) if row['CREDITS_USED_CLOUD_SERVICES'] else 0.0,
                    'period_type': period_type
                })
            
            return warehouse_usage
            
        except Exception as e:
            logger.error(f"Error getting warehouse credit usage: {e}")
            logger.info("No real warehouse metering data available - returning empty dataset")
            return []

    def get_warehouse_credit_usage_summary(self, start_date=None, end_date=None, period_type="monthly", warehouse_names=None):
        """Get summarized warehouse credit usage data"""
        usage_data = self.get_warehouse_credit_usage(start_date, end_date, period_type, warehouse_names)
        
        if not usage_data:
            return {
                'total_credits_used': 0.0,
                'total_credits_compute': 0.0,
                'total_credits_cloud_services': 0.0,
                'active_warehouses': 0
            }
        
        total_credits_used = sum(item['credits_used'] for item in usage_data)
        total_credits_compute = sum(item['credits_used_compute'] for item in usage_data)
        total_credits_cloud_services = sum(item['credits_used_cloud_services'] for item in usage_data)
        active_warehouses = len(set(item['warehouse_name'] for item in usage_data))
        
        return {
            'total_credits_used': total_credits_used,
            'total_credits_compute': total_credits_compute,
            'total_credits_cloud_services': total_credits_cloud_services,
            'active_warehouses': active_warehouses
        }

    def get_storage_usage(self, start_date=None, end_date=None, period_type="monthly"):
        """Get storage usage data from Snowflake ACCOUNT_USAGE.STORAGE_USAGE"""
        from datetime import datetime, timedelta
        
        # Default to last 12 months if no dates provided
        if not end_date:
            end_date = datetime.now()
        if not start_date:
            if period_type == "daily":
                start_date = end_date - timedelta(days=30)
            elif period_type == "weekly":
                start_date = end_date - timedelta(weeks=12)
            else:  # monthly
                start_date = end_date - timedelta(days=365)
        
        # Define the aggregation period
        date_trunc_format = {
            "daily": "DAY",
            "weekly": "WEEK", 
            "monthly": "MONTH"
        }.get(period_type, "MONTH")
        
        # Query Storage Usage for account-wide storage data (optimized with LIMIT)
        query = f"""
        SELECT 
            DATE_TRUNC('{date_trunc_format}', USAGE_DATE) AS USAGE_DATE,
            AVG(STORAGE_BYTES) AS STORAGE_BYTES,
            AVG(STAGE_BYTES) AS STAGE_BYTES,
            AVG(FAILSAFE_BYTES) AS FAILSAFE_BYTES,
            AVG(HYBRID_TABLE_STORAGE_BYTES) AS HYBRID_TABLE_STORAGE_BYTES
        FROM SNOWFLAKE.ACCOUNT_USAGE.STORAGE_USAGE
        WHERE USAGE_DATE >= %s 
            AND USAGE_DATE <= %s
        GROUP BY DATE_TRUNC('{date_trunc_format}', USAGE_DATE)
        ORDER BY USAGE_DATE DESC
        LIMIT 100
        """
        
        try:
            result = self.execute_query(query, (start_date, end_date))
            
            storage_usage = []
            for row in result:
                usage_info = {
                    'usage_date': row['USAGE_DATE'],
                    'storage_bytes': float(row['STORAGE_BYTES'] or 0),
                    'stage_bytes': float(row['STAGE_BYTES'] or 0),
                    'failsafe_bytes': float(row['FAILSAFE_BYTES'] or 0),
                    'hybrid_table_storage_bytes': float(row['HYBRID_TABLE_STORAGE_BYTES'] or 0),
                    'total_bytes': float((row['STORAGE_BYTES'] or 0) + (row['STAGE_BYTES'] or 0) + (row['FAILSAFE_BYTES'] or 0) + (row['HYBRID_TABLE_STORAGE_BYTES'] or 0)),
                    'period_type': period_type
                }
                storage_usage.append(usage_info)
            
            return storage_usage
            
        except Exception as e:
            logger.warning(f"Could not fetch storage usage data: {e}")
            logger.info("No storage usage data available - returning empty dataset")
            return []

    def get_database_storage_usage(self, start_date=None, end_date=None, period_type="monthly", database_names=None):
        """Get database storage usage data from Snowflake ACCOUNT_USAGE.DATABASE_STORAGE_USAGE_HISTORY"""
        from datetime import datetime, timedelta
        
        # Default to last 12 months if no dates provided
        if not end_date:
            end_date = datetime.now()
        if not start_date:
            if period_type == "daily":
                start_date = end_date - timedelta(days=30)
            elif period_type == "weekly":
                start_date = end_date - timedelta(weeks=12)
            else:  # monthly
                start_date = end_date - timedelta(days=365)
        
        # Define the aggregation period
        date_trunc_format = {
            "daily": "DAY",
            "weekly": "WEEK",
            "monthly": "MONTH"
        }.get(period_type, "MONTH")
        
        # Build WHERE clause for database filtering
        database_filter = ""
        if database_names:
            database_list = "','".join(database_names)
            database_filter = f"AND DATABASE_NAME IN ('{database_list}')"
        
        # Query Database Storage Usage History for per-database storage data (optimized)
        query = f"""
        SELECT 
            DATABASE_NAME,
            DATE_TRUNC('{date_trunc_format}', USAGE_DATE) AS USAGE_DATE,
            AVG(AVERAGE_DATABASE_BYTES) AS STORAGE_BYTES,
            AVG(AVERAGE_FAILSAFE_BYTES) AS FAILSAFE_BYTES,
            AVG(AVERAGE_HYBRID_TABLE_STORAGE_BYTES) AS HYBRID_TABLE_STORAGE_BYTES
        FROM SNOWFLAKE.ACCOUNT_USAGE.DATABASE_STORAGE_USAGE_HISTORY
        WHERE USAGE_DATE >= %s 
            AND USAGE_DATE <= %s
            AND DATABASE_NAME IS NOT NULL
            AND DELETED IS NULL
            {database_filter}
        GROUP BY DATABASE_NAME, DATE_TRUNC('{date_trunc_format}', USAGE_DATE)
        ORDER BY USAGE_DATE DESC, DATABASE_NAME
        LIMIT 500
        """
        
        try:
            result = self.execute_query(query, (start_date, end_date))
            
            database_storage = []
            for row in result:
                storage_info = {
                    'database_name': row['DATABASE_NAME'],
                    'usage_date': row['USAGE_DATE'],
                    'storage_bytes': float(row['STORAGE_BYTES'] or 0),
                    'failsafe_bytes': float(row['FAILSAFE_BYTES'] or 0),
                    'hybrid_table_storage_bytes': float(row['HYBRID_TABLE_STORAGE_BYTES'] or 0),
                    'total_bytes': float((row['STORAGE_BYTES'] or 0) + (row['FAILSAFE_BYTES'] or 0) + (row['HYBRID_TABLE_STORAGE_BYTES'] or 0)),
                    'period_type': period_type
                }
                database_storage.append(storage_info)
            
            return database_storage
            
        except Exception as e:
            logger.warning(f"Could not fetch database storage usage data: {e}")
            logger.info("No database storage usage data available - returning empty dataset")
            return []

    def get_storage_usage_summary(self, start_date=None, end_date=None, period_type="monthly"):
        """Get summarized storage usage data"""
        usage_data = self.get_storage_usage(start_date, end_date, period_type)
        
        if not usage_data:
            return {
                'total_storage_gb': 0.0,
                'total_stage_gb': 0.0,
                'total_failsafe_gb': 0.0,
                'total_hybrid_gb': 0.0,
                'active_databases': 0,
                'average_storage_per_day_gb': 0.0
            }
        
        # Convert bytes to GB (1 GB = 1024^3 bytes)
        bytes_to_gb = 1024 ** 3
        
        total_storage_gb = sum(item['storage_bytes'] for item in usage_data) / bytes_to_gb
        total_stage_gb = sum(item['stage_bytes'] for item in usage_data) / bytes_to_gb
        total_failsafe_gb = sum(item['failsafe_bytes'] for item in usage_data) / bytes_to_gb
        total_hybrid_gb = sum(item['hybrid_table_storage_bytes'] for item in usage_data) / bytes_to_gb
        
        # Get database count from database storage usage
        try:
            db_storage_data = self.get_database_storage_usage(start_date, end_date, period_type)
            active_databases = len(set(item['database_name'] for item in db_storage_data))
        except:
            active_databases = 0
        
        # Calculate average storage per day
        from datetime import datetime
        if start_date and end_date:
            if isinstance(start_date, str):
                start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            if isinstance(end_date, str):
                end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            
            days_diff = (end_date - start_date).days + 1
            average_storage_per_day_gb = total_storage_gb / max(days_diff, 1)
        else:
            average_storage_per_day_gb = 0.0
        
        return {
            'total_storage_gb': total_storage_gb,
            'total_stage_gb': total_stage_gb,
            'total_failsafe_gb': total_failsafe_gb,
            'total_hybrid_gb': total_hybrid_gb,
            'active_databases': active_databases,
            'average_storage_per_day_gb': average_storage_per_day_gb
        }

# Global database instance
_db_instance = None

def get_database() -> SnowflakeConnection:
    """Get or create database connection singleton"""
    global _db_instance
    if _db_instance is None:
        _db_instance = SnowflakeConnection()
        _db_instance.connect()
    return _db_instance 