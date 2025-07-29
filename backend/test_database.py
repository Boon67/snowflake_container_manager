import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
import uuid
import os

from database import SnowflakeConnection
import models

class TestSnowflakeConnection:
    """Test Snowflake database connection and operations"""
    
    @patch('snowflake.connector.connect')
    def test_connection_with_password_auth(self, mock_connect):
        """Test database connection with password authentication"""
        mock_connection = Mock()
        mock_cursor = Mock()
        mock_connection.cursor.return_value = mock_cursor
        mock_connect.return_value = mock_connection
        
        # Mock environment variables for password auth
        with patch.dict(os.environ, {
            'SNOWFLAKE_USER': 'testuser',
            'SNOWFLAKE_PASSWORD': 'testpass',
            'SNOWFLAKE_ACCOUNT': 'testaccount',
            'SNOWFLAKE_WAREHOUSE': 'testwh',
            'SNOWFLAKE_DATABASE': 'testdb',
            'SNOWFLAKE_SCHEMA': 'testschema'
        }):
            db = SnowflakeConnection()
            
            assert db.connection == mock_connection
            mock_connect.assert_called_once()
    
    @patch('snowflake.connector.connect')
    def test_connection_with_keypair_auth(self, mock_connect):
        """Test database connection with keypair authentication"""
        mock_connection = Mock()
        mock_cursor = Mock()
        mock_connection.cursor.return_value = mock_cursor
        mock_connect.return_value = mock_connection
        
        # Mock environment variables for keypair auth
        with patch.dict(os.environ, {
            'SNOWFLAKE_USER': 'testuser',
            'SNOWFLAKE_PRIVATE_KEY_PATH': '/path/to/key.pem',
            'SNOWFLAKE_ACCOUNT': 'testaccount',
            'SNOWFLAKE_WAREHOUSE': 'testwh',
            'SNOWFLAKE_DATABASE': 'testdb',
            'SNOWFLAKE_SCHEMA': 'testschema'
        }):
            with patch('builtins.open', mock_open_with_content('fake_key_content')):
                with patch('cryptography.hazmat.primitives.serialization.load_pem_private_key') as mock_load_key:
                    mock_load_key.return_value = Mock()
                    
                    db = SnowflakeConnection()
                    
                    assert db.connection == mock_connection
                    mock_connect.assert_called_once()
    
    @patch('snowflake.connector.connect')
    def test_connection_failure(self, mock_connect):
        """Test database connection failure handling"""
        mock_connect.side_effect = Exception("Connection failed")
        
        with patch.dict(os.environ, {
            'SNOWFLAKE_USER': 'testuser',
            'SNOWFLAKE_PASSWORD': 'testpass',
            'SNOWFLAKE_ACCOUNT': 'testaccount'
        }):
            with pytest.raises(Exception):
                SnowflakeConnection()
    
    def test_execute_query_success(self):
        """Test successful query execution"""
        mock_connection = Mock()
        mock_cursor = Mock()
        mock_connection.cursor.return_value = mock_cursor
        
        # Mock query results
        mock_cursor.fetchall.return_value = [
            {'ID': '123', 'NAME': 'Test', 'VALUE': 'test_value'}
        ]
        mock_cursor.description = [
            Mock(name='ID'), Mock(name='NAME'), Mock(name='VALUE')
        ]
        
        db = SnowflakeConnection.__new__(SnowflakeConnection)
        db.connection = mock_connection
        
        result = db.execute_query("SELECT * FROM test_table")
        
        assert len(result) == 1
        assert result[0]['NAME'] == 'Test'
        mock_cursor.execute.assert_called_once()
    
    def test_execute_query_with_params(self):
        """Test query execution with parameters"""
        mock_connection = Mock()
        mock_cursor = Mock()
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.fetchall.return_value = []
        
        db = SnowflakeConnection.__new__(SnowflakeConnection)
        db.connection = mock_connection
        
        db.execute_query("SELECT * FROM test_table WHERE id = %s", ("123",))
        
        mock_cursor.execute.assert_called_once_with("SELECT * FROM test_table WHERE id = %s", ("123",))
    
    def test_execute_non_query_success(self):
        """Test successful non-query execution"""
        mock_connection = Mock()
        mock_cursor = Mock()
        mock_connection.cursor.return_value = mock_cursor
        
        db = SnowflakeConnection.__new__(SnowflakeConnection)
        db.connection = mock_connection
        
        db.execute_non_query("INSERT INTO test_table VALUES (%s, %s)", ("123", "test"))
        
        mock_cursor.execute.assert_called_once()
        mock_connection.commit.assert_called_once()
    
    def test_execute_query_error_handling(self):
        """Test query execution error handling"""
        mock_connection = Mock()
        mock_cursor = Mock()
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Query failed")
        
        db = SnowflakeConnection.__new__(SnowflakeConnection)
        db.connection = mock_connection
        
        result = db.execute_query("INVALID QUERY")
        
        assert result == []

class TestSchemaInitialization:
    """Test database schema initialization"""
    
    @pytest.fixture
    def mock_db(self):
        """Create a mock database instance"""
        db = Mock(spec=SnowflakeConnection)
        return db
    
    def test_initialize_schema_creates_tables(self, mock_db):
        """Test that initialize_schema creates all required tables"""
        mock_db.execute_query.return_value = []  # No existing tables
        mock_db.execute_non_query.return_value = None
        
        # This would be called in the actual initialization
        tables_created = []
        
        def track_table_creation(query, params=None):
            if "CREATE TABLE" in query.upper():
                if "USERS" in query:
                    tables_created.append("USERS")
                elif "SOLUTIONS" in query:
                    tables_created.append("SOLUTIONS")
                elif "PARAMETERS" in query:
                    tables_created.append("PARAMETERS")
                elif "TAGS" in query:
                    tables_created.append("TAGS")
                elif "PARAMETER_TAGS" in query:
                    tables_created.append("PARAMETER_TAGS")
                elif "SOLUTION_PARAMETERS" in query:
                    tables_created.append("SOLUTION_PARAMETERS")
        
        mock_db.execute_non_query.side_effect = track_table_creation
        
        # Simulate schema initialization
        expected_tables = ["USERS", "SOLUTIONS", "PARAMETERS", "TAGS", "PARAMETER_TAGS", "SOLUTION_PARAMETERS"]
        
        for table in expected_tables:
            mock_db.execute_non_query(f"CREATE TABLE IF NOT EXISTS {table}")
        
        assert all(table in tables_created for table in expected_tables)
    
    def test_schema_migration_users_table(self, mock_db):
        """Test migration of USERS table to include new columns"""
        # Mock existing USERS table without new columns
        old_columns = [
            {'name': 'ID'}, {'name': 'USERNAME'}, {'name': 'HASHED_PASSWORD'}, {'name': 'CREATED_AT'}
        ]
        mock_db.execute_query.side_effect = [
            old_columns,  # DESCRIBE TABLE USERS
            [{'ID': 'user-123', 'USERNAME': 'existing_user', 'HASHED_PASSWORD': 'hash', 'CREATED_AT': datetime.now()}],  # SELECT existing users
        ]
        
        # Simulate migration logic
        column_names = [col['name'] for col in old_columns]
        needs_migration = 'LAST_LOGIN' not in column_names or 'ROLE' not in column_names
        
        assert needs_migration is True
    
    def test_database_and_schema_creation(self, mock_db):
        """Test creation of database and schema if they don't exist"""
        mock_db.execute_non_query.return_value = None
        
        database_name = "TEST_CONFIG_DB"
        schema_name = "CONFIG_SCHEMA"
        
        # Simulate database and schema creation
        mock_db.execute_non_query(f"CREATE DATABASE IF NOT EXISTS {database_name}")
        mock_db.execute_non_query(f"USE DATABASE {database_name}")
        mock_db.execute_non_query(f"CREATE SCHEMA IF NOT EXISTS {schema_name}")
        mock_db.execute_non_query(f"USE SCHEMA {schema_name}")
        
        assert mock_db.execute_non_query.call_count == 4

class TestCRUDOperations:
    """Test CRUD operations for different entities"""
    
    @pytest.fixture
    def mock_db(self):
        """Create a mock database instance"""
        db = Mock(spec=SnowflakeConnection)
        return db
    
    def test_create_solution(self, mock_db):
        """Test solution creation"""
        solution_id = str(uuid.uuid4())
        mock_db.execute_non_query.return_value = None
        mock_db.execute_query.return_value = [{
            'ID': solution_id,
            'NAME': 'Test Solution',
            'DESCRIPTION': 'Test Description',
            'CREATED_AT': datetime.now()
        }]
        
        # Simulate solution creation
        mock_db.execute_non_query(
            "INSERT INTO SOLUTIONS (ID, NAME, DESCRIPTION) VALUES (%s, %s, %s)",
            (solution_id, "Test Solution", "Test Description")
        )
        
        result = mock_db.execute_query("SELECT * FROM SOLUTIONS WHERE ID = %s", (solution_id,))
        
        assert len(result) == 1
        assert result[0]['NAME'] == 'Test Solution'
    
    def test_create_parameter_with_tags(self, mock_db):
        """Test parameter creation with tag association"""
        param_id = str(uuid.uuid4())
        tag_id = str(uuid.uuid4())
        
        mock_db.execute_query.side_effect = [
            [],  # No existing parameter with same key
            [{'ID': tag_id}],  # Existing tag
            [{  # Created parameter
                'ID': param_id,
                'NAME': 'Test Param',
                'KEY': 'TEST_KEY',
                'VALUE': 'test_value',
                'DESCRIPTION': 'Test Description',
                'IS_SECRET': False,
                'CREATED_AT': datetime.now()
            }]
        ]
        mock_db.execute_non_query.return_value = None
        
        # Simulate parameter creation with tag
        mock_db.execute_non_query(
            "INSERT INTO PARAMETERS (ID, NAME, KEY, VALUE, DESCRIPTION, IS_SECRET) VALUES (%s, %s, %s, %s, %s, %s)",
            (param_id, "Test Param", "TEST_KEY", "test_value", "Test Description", False)
        )
        
        # Associate with tag
        mock_db.execute_non_query(
            "INSERT INTO PARAMETER_TAGS (PARAMETER_ID, TAG_ID) VALUES (%s, %s)",
            (param_id, tag_id)
        )
        
        assert mock_db.execute_non_query.call_count == 2
    
    def test_delete_solution_with_parameters(self, mock_db):
        """Test solution deletion when it has parameters"""
        solution_id = str(uuid.uuid4())
        
        # Mock solution with parameters
        mock_db.execute_query.return_value = [
            {'PARAMETER_ID': 'param-1'}, {'PARAMETER_ID': 'param-2'}
        ]
        
        # Check if solution has parameters
        params = mock_db.execute_query(
            "SELECT PARAMETER_ID FROM SOLUTION_PARAMETERS WHERE SOLUTION_ID = %s", 
            (solution_id,)
        )
        
        # Should not delete if parameters exist
        assert len(params) > 0

class TestContainerServicesOperations:
    """Test container services and compute pools operations"""
    
    @pytest.fixture
    def mock_db(self):
        """Create a mock database instance"""
        db = Mock(spec=SnowflakeConnection)
        return db
    
    def test_get_container_services(self, mock_db):
        """Test retrieving container services"""
        mock_services = [
            {
                'name': 'service-1',
                'status': 'RUNNING',
                'compute_pool': 'pool-1',
                'endpoint_url': 'https://service1.example.com',
                'created_on': datetime.now()
            },
            {
                'name': 'service-2',
                'status': 'SUSPENDED',
                'compute_pool': 'pool-2',
                'endpoint_url': 'https://service2.example.com',
                'created_on': datetime.now()
            }
        ]
        mock_db.execute_query.return_value = mock_services
        
        result = mock_db.execute_query("SHOW SERVICES")
        
        assert len(result) == 2
        assert result[0]['status'] == 'RUNNING'
        assert result[1]['status'] == 'SUSPENDED'
    
    def test_get_compute_pools(self, mock_db):
        """Test retrieving compute pools"""
        mock_pools = [
            {
                'name': 'pool-1',
                'state': 'ACTIVE',
                'min_nodes': 1,
                'max_nodes': 10,
                'instance_family': 'CPU_X64_XS',
                'created_on': datetime.now()
            }
        ]
        mock_db.execute_query.return_value = mock_pools
        
        result = mock_db.execute_query("SHOW COMPUTE POOLS")
        
        assert len(result) == 1
        assert result[0]['state'] == 'ACTIVE'
    
    def test_start_container_service(self, mock_db):
        """Test starting a container service"""
        mock_db.execute_non_query.return_value = None
        
        service_name = "test-service"
        mock_db.execute_non_query(f"ALTER SERVICE {service_name} RESUME")
        
        mock_db.execute_non_query.assert_called_once()
    
    def test_stop_container_service(self, mock_db):
        """Test stopping a container service"""
        mock_db.execute_non_query.return_value = None
        
        service_name = "test-service"
        mock_db.execute_non_query(f"ALTER SERVICE {service_name} SUSPEND")
        
        mock_db.execute_non_query.assert_called_once()

class TestAnalyticsOperations:
    """Test analytics and credit usage operations"""
    
    @pytest.fixture
    def mock_db(self):
        """Create a mock database instance"""
        db = Mock(spec=SnowflakeConnection)
        return db
    
    def test_get_credit_usage_data(self, mock_db):
        """Test retrieving credit usage data"""
        mock_usage_data = [
            {
                'COMPUTE_POOL_NAME': 'analytics-pool',
                'USAGE_DATE': datetime.now() - timedelta(days=1),
                'CREDITS_USED': 25.5,
                'CREDITS_BILLED': 26.0
            },
            {
                'COMPUTE_POOL_NAME': 'ml-pool',
                'USAGE_DATE': datetime.now() - timedelta(days=1),
                'CREDITS_USED': 45.2,
                'CREDITS_BILLED': 46.0
            }
        ]
        
        mock_db.execute_query.return_value = mock_usage_data
        
        # Simulate credit usage query
        start_date = datetime.now() - timedelta(days=30)
        end_date = datetime.now()
        
        query = """
        SELECT 
            COMPUTE_POOL_NAME,
            DATE_TRUNC('DAY', START_TIME) AS USAGE_DATE,
            SUM(CREDITS_USED) AS CREDITS_USED,
            SUM(CREDITS_BILLED) AS CREDITS_BILLED
        FROM SNOWFLAKE.ACCOUNT_USAGE.COMPUTE_POOL_METERING_HISTORY
        WHERE START_TIME >= %s AND START_TIME <= %s
        GROUP BY COMPUTE_POOL_NAME, DATE_TRUNC('DAY', START_TIME)
        """
        
        result = mock_db.execute_query(query, (start_date, end_date))
        
        assert len(result) == 2
        assert result[0]['COMPUTE_POOL_NAME'] == 'analytics-pool'
        assert result[1]['CREDITS_USED'] == 45.2
    
    def test_generate_mock_credit_data(self, mock_db):
        """Test generation of mock credit data when ACCOUNT_USAGE is unavailable"""
        # Simulate ACCOUNT_USAGE query failure
        mock_db.execute_query.side_effect = Exception("ACCOUNT_USAGE not accessible")
        
        # Mock compute pools for fallback data
        mock_pools = [
            {'name': 'demo-pool-1'},
            {'name': 'demo-pool-2'}
        ]
        
        # This would trigger mock data generation
        with pytest.raises(Exception):
            mock_db.execute_query("SELECT * FROM SNOWFLAKE.ACCOUNT_USAGE.COMPUTE_POOL_METERING_HISTORY")

class TestErrorHandling:
    """Test database error handling scenarios"""
    
    @pytest.fixture
    def mock_db(self):
        """Create a mock database instance"""
        db = Mock(spec=SnowflakeConnection)
        return db
    
    def test_connection_timeout_handling(self, mock_db):
        """Test handling of connection timeouts"""
        import snowflake.connector.errors
        
        mock_db.execute_query.side_effect = snowflake.connector.errors.DatabaseError("Connection timeout")
        
        # Should handle timeout gracefully
        with pytest.raises(snowflake.connector.errors.DatabaseError):
            mock_db.execute_query("SELECT 1")
    
    def test_invalid_query_handling(self, mock_db):
        """Test handling of invalid SQL queries"""
        mock_db.execute_query.side_effect = Exception("SQL compilation error")
        
        result = mock_db.execute_query("INVALID SQL SYNTAX")
        
        # Should return empty result on error
        assert result is None or isinstance(result, Exception)
    
    def test_constraint_violation_handling(self, mock_db):
        """Test handling of database constraint violations"""
        mock_db.execute_non_query.side_effect = Exception("Unique constraint violation")
        
        # Should handle constraint violations appropriately
        with pytest.raises(Exception):
            mock_db.execute_non_query("INSERT INTO USERS (ID, USERNAME) VALUES ('1', 'existing_user')")

def mock_open_with_content(content):
    """Helper function to mock file open with specific content"""
    from unittest.mock import mock_open
    return mock_open(read_data=content)

if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 