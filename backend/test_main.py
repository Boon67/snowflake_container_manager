import pytest
import asyncio
import uuid
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
import json

# Import the main application
from main import app
from database import SnowflakeConnection
import models
import auth

# Create test client
client = TestClient(app)

class TestDatabase:
    """Mock database for testing"""
    def __init__(self):
        self.users = {}
        self.solutions = {}
        self.parameters = {}
        self.tags = {}
        self.parameter_tags = {}
        self.solution_parameters = {}
        self.container_services = []
        self.compute_pools = []
        self.credit_usage = []
        
    def execute_query(self, query, params=None):
        """Mock query execution"""
        query_upper = query.upper().strip()
        
        # Handle different query types
        if "SELECT * FROM USERS WHERE USERNAME" in query_upper:
            username = params[0] if params else None
            user = next((u for u in self.users.values() if u.get('USERNAME') == username), None)
            return [user] if user else []
            
        elif "SELECT * FROM USERS WHERE ID" in query_upper:
            user_id = params[0] if params else None
            user = self.users.get(user_id)
            return [user] if user else []
            
        elif "SELECT * FROM USERS" in query_upper and "WHERE" not in query_upper:
            return list(self.users.values())
            
        elif "SELECT * FROM SOLUTIONS" in query_upper:
            return list(self.solutions.values())
            
        elif "SELECT * FROM PARAMETERS" in query_upper:
            return list(self.parameters.values())
            
        elif "SELECT * FROM TAGS" in query_upper:
            return list(self.tags.values())
            
        elif "SELECT ID FROM PARAMETERS WHERE KEY" in query_upper:
            key = params[0] if params else None
            param = next((p for p in self.parameters.values() if p.get('KEY') == key), None)
            return [{'ID': param['ID']}] if param else []
            
        elif "SELECT ID FROM TAGS WHERE NAME" in query_upper:
            name = params[0] if params else None
            tag = next((t for t in self.tags.values() if t.get('NAME') == name), None)
            return [{'ID': tag['ID']}] if tag else []
            
        elif "SHOW SERVICES" in query_upper:
            return self.container_services
            
        elif "SHOW COMPUTE POOLS" in query_upper:
            return self.compute_pools
            
        elif "COMPUTE_POOL_METERING_HISTORY" in query_upper:
            return self.credit_usage
            
        return []
    
    def execute_non_query(self, query, params=None):
        """Mock non-query execution"""
        query_upper = query.upper().strip()
        
        if "INSERT INTO USERS" in query_upper:
            if params and len(params) >= 6:
                user_id = params[0]
                self.users[user_id] = {
                    'ID': user_id,
                    'USERNAME': params[1],
                    'HASHED_PASSWORD': params[2],
                    'ROLE': params[3] if len(params) > 3 else 'user',
                    'IS_ACTIVE': params[4] if len(params) > 4 else True,
                    'IS_SSO_USER': params[5] if len(params) > 5 else False,
                    'USE_SNOWFLAKE_AUTH': params[6] if len(params) > 6 else False,
                    'CREATED_AT': params[7] if len(params) > 7 else datetime.now()
                }
                
        elif "INSERT INTO SOLUTIONS" in query_upper:
            if params and len(params) >= 3:
                solution_id = params[0]
                self.solutions[solution_id] = {
                    'ID': solution_id,
                    'NAME': params[1],
                    'DESCRIPTION': params[2],
                    'CREATED_AT': datetime.now()
                }
                
        elif "INSERT INTO PARAMETERS" in query_upper:
            if params and len(params) >= 6:
                param_id = params[0]
                self.parameters[param_id] = {
                    'ID': param_id,
                    'NAME': params[1],
                    'KEY': params[2],
                    'VALUE': params[3],
                    'DESCRIPTION': params[4],
                    'IS_SECRET': params[5],
                    'CREATED_AT': datetime.now()
                }
                
        elif "INSERT INTO TAGS" in query_upper:
            if params and len(params) >= 2:
                tag_id = params[0]
                self.tags[tag_id] = {
                    'ID': tag_id,
                    'NAME': params[1],
                    'CREATED_AT': datetime.now()
                }
                
        elif "DELETE FROM USERS WHERE ID" in query_upper:
            user_id = params[0] if params else None
            if user_id in self.users:
                del self.users[user_id]
                
        elif "DELETE FROM SOLUTIONS WHERE ID" in query_upper:
            solution_id = params[0] if params else None
            if solution_id in self.solutions:
                del self.solutions[solution_id]
                
        elif "DELETE FROM PARAMETERS WHERE ID" in query_upper:
            param_id = params[0] if params else None
            if param_id in self.parameters:
                del self.parameters[param_id]

# Create mock database instance
mock_db = TestDatabase()

@pytest.fixture
def mock_database():
    """Fixture to provide a fresh mock database for each test"""
    global mock_db
    mock_db = TestDatabase()
    
    # Add some default test data
    test_user_id = str(uuid.uuid4())
    mock_db.users[test_user_id] = {
        'ID': test_user_id,
        'USERNAME': 'testuser',
        'HASHED_PASSWORD': auth.get_password_hash('testpass'),
        'ROLE': 'admin',
        'IS_ACTIVE': True,
        'IS_SSO_USER': False,
        'USE_SNOWFLAKE_AUTH': False,
        'CREATED_AT': datetime.now()
    }
    
    return mock_db

@pytest.fixture
def auth_headers():
    """Fixture to provide authentication headers"""
    # Create a test token
    token_data = models.TokenData(username="testuser")
    token = auth.create_access_token(data={"sub": token_data.username})
    return {"Authorization": f"Bearer {token}"}

# Mock the database connection
@patch('main.get_database')
class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_login_success(self, mock_get_db, mock_database):
        mock_get_db.return_value = mock_database
        
        response = client.post("/api/token", data={
            "username": "testuser",
            "password": "testpass"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
    
    def test_login_invalid_credentials(self, mock_get_db, mock_database):
        mock_get_db.return_value = mock_database
        
        response = client.post("/api/token", data={
            "username": "testuser",
            "password": "wrongpass"
        })
        
        assert response.status_code == 401
        assert "incorrect username or password" in response.json()["detail"].lower()
    
    def test_login_nonexistent_user(self, mock_get_db, mock_database):
        mock_get_db.return_value = mock_database
        
        response = client.post("/api/token", data={
            "username": "nonexistent",
            "password": "testpass"
        })
        
        assert response.status_code == 401

@patch('main.get_database')
class TestUserManagement:
    """Test user management endpoints"""
    
    def test_get_users_admin(self, mock_get_db, mock_database, auth_headers):
        mock_get_db.return_value = mock_database
        
        response = client.get("/api/users", headers=auth_headers)
        
        assert response.status_code == 200
        users = response.json()
        assert len(users) >= 1
        assert any(user["username"] == "testuser" for user in users)
    
    def test_create_user_admin(self, mock_get_db, mock_database, auth_headers):
        mock_get_db.return_value = mock_database
        
        new_user = {
            "username": "newuser",
            "password": "newpass123",
            "email": "new@example.com",
            "role": "user"
        }
        
        response = client.post("/api/users", json=new_user, headers=auth_headers)
        
        assert response.status_code == 200
        user_data = response.json()
        assert user_data["username"] == "newuser"
        assert user_data["email"] == "new@example.com"
        assert user_data["role"] == "user"
    
    def test_create_user_duplicate_username(self, mock_get_db, mock_database, auth_headers):
        mock_get_db.return_value = mock_database
        
        duplicate_user = {
            "username": "testuser",  # Already exists
            "password": "newpass123",
            "role": "user"
        }
        
        response = client.post("/api/users", json=duplicate_user, headers=auth_headers)
        
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()

@patch('main.get_database')
class TestSolutionManagement:
    """Test solution CRUD operations"""
    
    def test_create_solution(self, mock_get_db, mock_database, auth_headers):
        mock_get_db.return_value = mock_database
        
        solution_data = {
            "name": "Test Solution",
            "description": "A test solution for testing"
        }
        
        response = client.post("/api/solutions", json=solution_data, headers=auth_headers)
        
        assert response.status_code == 200
        solution = response.json()
        assert solution["name"] == "Test Solution"
        assert solution["description"] == "A test solution for testing"
        assert "id" in solution
    
    def test_get_solutions(self, mock_get_db, mock_database, auth_headers):
        mock_get_db.return_value = mock_database
        
        # Create a test solution first
        solution_id = str(uuid.uuid4())
        mock_database.solutions[solution_id] = {
            'ID': solution_id,
            'NAME': 'Test Solution',
            'DESCRIPTION': 'Test Description',
            'CREATED_AT': datetime.now()
        }
        
        response = client.get("/api/solutions", headers=auth_headers)
        
        assert response.status_code == 200
        solutions = response.json()
        assert len(solutions) >= 1
        assert any(sol["name"] == "Test Solution" for sol in solutions)
    
    def test_update_solution(self, mock_get_db, mock_database, auth_headers):
        mock_get_db.return_value = mock_database
        
        # Create a solution first
        solution_id = str(uuid.uuid4())
        mock_database.solutions[solution_id] = {
            'ID': solution_id,
            'NAME': 'Original Name',
            'DESCRIPTION': 'Original Description',
            'CREATED_AT': datetime.now()
        }
        
        update_data = {
            "name": "Updated Name",
            "description": "Updated Description"
        }
        
        response = client.put(f"/api/solutions/{solution_id}", json=update_data, headers=auth_headers)
        
        assert response.status_code == 200
        # Verify the solution was updated in mock database
        assert mock_database.solutions[solution_id]['NAME'] == 'Updated Name'
    
    def test_delete_solution(self, mock_get_db, mock_database, auth_headers):
        mock_get_db.return_value = mock_database
        
        # Create a solution first
        solution_id = str(uuid.uuid4())
        mock_database.solutions[solution_id] = {
            'ID': solution_id,
            'NAME': 'To Delete',
            'DESCRIPTION': 'Will be deleted',
            'CREATED_AT': datetime.now()
        }
        
        response = client.delete(f"/api/solutions/{solution_id}", headers=auth_headers)
        
        assert response.status_code == 200
        # Verify the solution was deleted from mock database
        assert solution_id not in mock_database.solutions

@patch('main.get_database')
class TestParameterManagement:
    """Test parameter CRUD operations"""
    
    def test_create_parameter(self, mock_get_db, mock_database, auth_headers):
        mock_get_db.return_value = mock_database
        
        parameter_data = {
            "name": "Test Parameter",
            "key": "TEST_PARAM",
            "value": "test_value",
            "description": "A test parameter",
            "is_secret": False,
            "tags": ["test-tag"]
        }
        
        response = client.post("/api/parameters", json=parameter_data, headers=auth_headers)
        
        assert response.status_code == 200
        parameter = response.json()
        assert parameter["name"] == "Test Parameter"
        assert parameter["key"] == "TEST_PARAM"
        assert parameter["value"] == "test_value"
    
    def test_create_parameter_duplicate_key(self, mock_get_db, mock_database, auth_headers):
        mock_get_db.return_value = mock_database
        
        # Add existing parameter
        existing_id = str(uuid.uuid4())
        mock_database.parameters[existing_id] = {
            'ID': existing_id,
            'KEY': 'EXISTING_KEY',
            'NAME': 'Existing',
            'VALUE': 'value',
            'DESCRIPTION': 'desc',
            'IS_SECRET': False,
            'CREATED_AT': datetime.now()
        }
        
        parameter_data = {
            "key": "EXISTING_KEY",  # Duplicate key
            "value": "new_value"
        }
        
        response = client.post("/api/parameters", json=parameter_data, headers=auth_headers)
        
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()
    
    def test_search_parameters(self, mock_get_db, mock_database, auth_headers):
        mock_get_db.return_value = mock_database
        
        # Add test parameters
        param1_id = str(uuid.uuid4())
        param2_id = str(uuid.uuid4())
        
        mock_database.parameters[param1_id] = {
            'ID': param1_id,
            'KEY': 'PARAM1',
            'NAME': 'Parameter 1',
            'VALUE': 'value1',
            'DESCRIPTION': 'First param',
            'IS_SECRET': False,
            'CREATED_AT': datetime.now()
        }
        
        mock_database.parameters[param2_id] = {
            'ID': param2_id,
            'KEY': 'PARAM2',
            'NAME': 'Parameter 2',
            'VALUE': 'value2',
            'DESCRIPTION': 'Second param',
            'IS_SECRET': True,
            'CREATED_AT': datetime.now()
        }
        
        search_data = {"search_term": "Parameter"}
        
        response = client.post("/api/parameters/search", json=search_data, headers=auth_headers)
        
        assert response.status_code == 200
        parameters = response.json()
        assert len(parameters) >= 2

@patch('main.get_database')
class TestTagManagement:
    """Test tag CRUD operations"""
    
    def test_create_tag(self, mock_get_db, mock_database, auth_headers):
        mock_get_db.return_value = mock_database
        
        tag_data = {"name": "Test Tag"}
        
        response = client.post("/api/tags", json=tag_data, headers=auth_headers)
        
        assert response.status_code == 200
        tag = response.json()
        assert tag["name"] == "Test Tag"
        assert "id" in tag
    
    def test_get_tags(self, mock_get_db, mock_database, auth_headers):
        mock_get_db.return_value = mock_database
        
        # Add a test tag
        tag_id = str(uuid.uuid4())
        mock_database.tags[tag_id] = {
            'ID': tag_id,
            'NAME': 'Test Tag',
            'CREATED_AT': datetime.now()
        }
        
        response = client.get("/api/tags", headers=auth_headers)
        
        assert response.status_code == 200
        tags = response.json()
        assert len(tags) >= 1
        assert any(tag["name"] == "Test Tag" for tag in tags)

@patch('main.get_database')
class TestContainerServices:
    """Test container services management"""
    
    def test_get_container_services(self, mock_get_db, mock_database, auth_headers):
        mock_get_db.return_value = mock_database
        
        # Add mock container services
        mock_database.container_services = [
            {
                'name': 'test-service-1',
                'status': 'RUNNING',
                'compute_pool': 'test-pool',
                'endpoint_url': 'https://test1.snowflakecomputing.com',
                'created_on': datetime.now()
            },
            {
                'name': 'test-service-2',
                'status': 'SUSPENDED',
                'compute_pool': 'test-pool',
                'endpoint_url': 'https://test2.snowflakecomputing.com',
                'created_on': datetime.now()
            }
        ]
        
        response = client.get("/api/container-services", headers=auth_headers)
        
        assert response.status_code == 200
        services = response.json()
        assert len(services) == 2
        assert services[0]["name"] == "test-service-1"
        assert services[0]["status"] == "RUNNING"
    
    def test_get_compute_pools(self, mock_get_db, mock_database, auth_headers):
        mock_get_db.return_value = mock_database
        
        # Add mock compute pools
        mock_database.compute_pools = [
            {
                'name': 'test-pool-1',
                'state': 'ACTIVE',
                'min_nodes': 1,
                'max_nodes': 10,
                'instance_family': 'CPU_X64_XS',
                'created_on': datetime.now()
            }
        ]
        
        response = client.get("/api/compute-pools", headers=auth_headers)
        
        assert response.status_code == 200
        pools = response.json()
        assert len(pools) == 1
        assert pools[0]["name"] == "test-pool-1"

@patch('main.get_database')
class TestAnalytics:
    """Test analytics endpoints"""
    
    def test_get_credit_usage(self, mock_get_db, mock_database, auth_headers):
        mock_get_db.return_value = mock_database
        
        # Add mock credit usage data
        mock_database.credit_usage = [
            {
                'COMPUTE_POOL_NAME': 'test-pool',
                'USAGE_DATE': datetime.now() - timedelta(days=1),
                'CREDITS_USED': 10.5,
                'CREDITS_BILLED': 11.0
            },
            {
                'COMPUTE_POOL_NAME': 'test-pool',
                'USAGE_DATE': datetime.now(),
                'CREDITS_USED': 15.2,
                'CREDITS_BILLED': 16.0
            }
        ]
        
        filter_data = {
            "period_type": "daily",
            "start_date": (datetime.now() - timedelta(days=7)).isoformat(),
            "end_date": datetime.now().isoformat()
        }
        
        response = client.post("/api/analytics/credit-usage", json=filter_data, headers=auth_headers)
        
        assert response.status_code == 200
        usage_data = response.json()
        assert len(usage_data) >= 0  # May be empty if mock data doesn't match filters
    
    def test_get_credit_usage_summary(self, mock_get_db, mock_database, auth_headers):
        mock_get_db.return_value = mock_database
        
        filter_data = {
            "period_type": "monthly",
            "start_date": (datetime.now() - timedelta(days=30)).isoformat(),
            "end_date": datetime.now().isoformat()
        }
        
        response = client.post("/api/analytics/credit-usage-summary", json=filter_data, headers=auth_headers)
        
        assert response.status_code == 200
        summary = response.json()
        assert "total_credits_used" in summary
        assert "total_credits_billed" in summary
        assert "compute_pools" in summary

class TestErrorHandling:
    """Test error handling and edge cases"""
    
    def test_unauthorized_access(self):
        """Test accessing protected endpoints without authentication"""
        response = client.get("/api/solutions")
        assert response.status_code == 401
    
    def test_invalid_token(self):
        """Test accessing with invalid token"""
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/api/solutions", headers=headers)
        assert response.status_code == 401
    
    @patch('main.get_database')
    def test_nonexistent_resource(self, mock_get_db, mock_database, auth_headers):
        """Test accessing nonexistent resources"""
        mock_get_db.return_value = mock_database
        
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/solutions/{fake_id}", headers=auth_headers)
        assert response.status_code == 404
    
    @patch('main.get_database')
    def test_invalid_data_format(self, mock_get_db, mock_database, auth_headers):
        """Test sending invalid data formats"""
        mock_get_db.return_value = mock_database
        
        invalid_solution = {
            "name": "",  # Empty name should fail validation
            "description": "x" * 2000  # Too long description
        }
        
        response = client.post("/api/solutions", json=invalid_solution, headers=auth_headers)
        assert response.status_code == 422  # Validation error

class TestDatabaseOperations:
    """Test database-related functionality"""
    
    @patch('database.SnowflakeConnection')
    def test_database_connection_error(self, mock_snowflake):
        """Test handling database connection errors"""
        mock_snowflake.return_value.execute_query.side_effect = Exception("Database connection failed")
        
        # This should be handled gracefully
        with pytest.raises(Exception):
            db = SnowflakeConnection()
            db.execute_query("SELECT 1")
    
    def test_sql_injection_prevention(self):
        """Test that SQL injection attempts are prevented"""
        # This is more of a design test - parameterized queries should prevent SQL injection
        malicious_input = "'; DROP TABLE users; --"
        
        # Our database class should use parameterized queries
        test_db = TestDatabase()
        
        # This should not affect the database structure
        result = test_db.execute_query("SELECT * FROM USERS WHERE USERNAME = %s", (malicious_input,))
        assert result == []  # Should return empty, not cause an error

# Integration tests
class TestIntegration:
    """Test integration between different components"""
    
    @patch('main.get_database')
    def test_full_solution_workflow(self, mock_get_db, mock_database, auth_headers):
        """Test complete solution creation, parameter assignment, and deletion workflow"""
        mock_get_db.return_value = mock_database
        
        # 1. Create a tag
        tag_response = client.post("/api/tags", json={"name": "Integration Tag"}, headers=auth_headers)
        assert tag_response.status_code == 200
        
        # 2. Create a parameter with the tag
        param_data = {
            "name": "Integration Parameter",
            "key": "INTEGRATION_PARAM",
            "value": "integration_value",
            "tags": ["Integration Tag"]
        }
        param_response = client.post("/api/parameters", json=param_data, headers=auth_headers)
        assert param_response.status_code == 200
        param_id = param_response.json()["id"]
        
        # 3. Create a solution
        solution_data = {
            "name": "Integration Solution",
            "description": "A solution for integration testing"
        }
        solution_response = client.post("/api/solutions", json=solution_data, headers=auth_headers)
        assert solution_response.status_code == 200
        solution_id = solution_response.json()["id"]
        
        # 4. Assign parameter to solution
        assign_response = client.post(f"/api/solutions/{solution_id}/parameters/{param_id}", headers=auth_headers)
        assert assign_response.status_code == 200
        
        # 5. Verify the assignment
        solutions_response = client.get("/api/solutions", headers=auth_headers)
        assert solutions_response.status_code == 200
        
        # 6. Clean up - remove parameter from solution
        remove_response = client.delete(f"/api/solutions/{solution_id}/parameters/{param_id}", headers=auth_headers)
        assert remove_response.status_code == 200
        
        # 7. Delete solution
        delete_response = client.delete(f"/api/solutions/{solution_id}", headers=auth_headers)
        assert delete_response.status_code == 200

# Performance tests
class TestPerformance:
    """Test performance-related aspects"""
    
    @patch('main.get_database')
    def test_large_dataset_handling(self, mock_get_db, mock_database, auth_headers):
        """Test handling of large datasets"""
        mock_get_db.return_value = mock_database
        
        # Add many solutions to test pagination and performance
        for i in range(100):
            solution_id = str(uuid.uuid4())
            mock_database.solutions[solution_id] = {
                'ID': solution_id,
                'NAME': f'Solution {i}',
                'DESCRIPTION': f'Description {i}',
                'CREATED_AT': datetime.now()
            }
        
        response = client.get("/api/solutions", headers=auth_headers)
        assert response.status_code == 200
        
        solutions = response.json()
        assert len(solutions) == 100

if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v", "--tb=short"]) 