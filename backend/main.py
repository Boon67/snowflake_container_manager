from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from datetime import timedelta, datetime
from typing import List, Optional
import os
import logging
import uuid
import sys

from database import get_database, SnowflakeConnection
import models
import auth

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_database_connection():
    """Check database connection before starting the application"""
    logger.info("🔍 Checking database connection...")
    
    try:
        db = get_database()
        
        # Attempt to connect
        logger.info("📡 Connecting to Snowflake...")
        if not db.connect():
            logger.error("❌ Failed to establish database connection")
            logger.error("🔧 Please check your Snowflake credentials in .env file:")
            logger.error("   - SNOWFLAKE_ACCOUNT")
            logger.error("   - SNOWFLAKE_USER")
            logger.error("   - SNOWFLAKE_PASSWORD (for password auth) OR")
            logger.error("   - SNOWFLAKE_PRIVATE_KEY_PATH (for keypair auth)")
            logger.error("   - SNOWFLAKE_WAREHOUSE")
            logger.error("   - SNOWFLAKE_DATABASE")
            logger.error("   - SNOWFLAKE_SCHEMA")
            sys.exit(1)
        
        # Validate connection with a test query
        logger.info("🧪 Validating database connection...")
        if not db.validate_connection():
            logger.error("❌ Database connection validation failed")
            logger.error("🔧 Connection established but database is not responding properly")
            logger.error("   - Check if your Snowflake warehouse is running")
            logger.error("   - Verify your user has access to the database and schema")
            logger.error("   - Ensure your Snowflake account is active")
            db.disconnect()
            sys.exit(1)
        
        logger.info("✅ Database connection successful!")
        
        # Initialize schema
        logger.info("🏗️ Initializing database schema...")
        if not db.initialize_schema():
            logger.error("❌ Failed to initialize database schema")
            logger.error("🔧 Schema initialization failed:")
            logger.error("   - Check if your user has CREATE TABLE permissions")
            logger.error("   - Verify sufficient privileges for DDL operations")
            logger.error("   - Ensure your warehouse has adequate resources")
            db.disconnect()
            sys.exit(1)
        
        logger.info("✅ Database schema initialized successfully!")
        
        # Create default user if none exist
        users = db.execute_query("SELECT * FROM USERS")
        if not users:
            default_username = os.getenv("DEFAULT_USERNAME", "admin")
            default_password = os.getenv("DEFAULT_PASSWORD", "password123")
            user_create = models.UserCreate(username=default_username, password=default_password)
            auth.create_user(db, user_create)
            logger.info(f"✅ Default user '{default_username}' created successfully")
        
        logger.info("🎉 Database setup completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ CRITICAL DATABASE ERROR: {e}")
        logger.error("🔧 Troubleshooting steps:")
        logger.error("   1. Verify your .env file contains correct Snowflake credentials")
        logger.error("   2. For password auth: Set SNOWFLAKE_PASSWORD")
        logger.error("   3. For keypair auth: Set SNOWFLAKE_PRIVATE_KEY_PATH (and optionally SNOWFLAKE_PRIVATE_KEY_PASSPHRASE)")
        logger.error("   4. Check network connectivity to Snowflake")
        logger.error("   5. Ensure your Snowflake account and warehouse are active")
        logger.error("   6. Verify user has CREATE DATABASE and CREATE SCHEMA permissions")
        logger.error("   7. For keypair auth, check private key file exists and has proper permissions")
        logger.error(f"   8. Error details: {str(e)}")
        sys.exit(1)

app = FastAPI(
    title="Unified Solution Configuration Manager",
    description="A comprehensive solution configuration management system with dynamic tagging and key-value parameter storage.",
    version="2.0.0",
)

# CORS Middleware
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Application startup event - database is already checked"""
    logger.info("🚀 Starting Unified Configuration Manager application...")
    logger.info("✅ Application started successfully!")

@app.on_event("shutdown")
def shutdown_event():
    """Disconnect from database on shutdown"""
    db = get_database()
    db.disconnect()
    logger.info("👋 Application shut down successfully")

# --- Authentication Endpoints ---
@app.post("/api/token", response_model=models.Token)
async def login_for_access_token(form_data: models.UserLogin):
    db = get_database()
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- Solution Endpoints ---
@app.post("/api/solutions", response_model=models.Solution)
async def create_solution(
    solution: models.SolutionCreate, 
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Create a new solution"""
    db = get_database()
    solution_id = str(uuid.uuid4())
    db.execute_non_query(
        "INSERT INTO SOLUTIONS (ID, NAME, DESCRIPTION) VALUES (%s, %s, %s)",
        (solution_id, solution.name, solution.description)
    )
    result = db.execute_query("SELECT * FROM SOLUTIONS WHERE ID = %s", (solution_id,))
    solution_data = result[0]
    # Map uppercase column names from Snowflake to lowercase for Pydantic model
    mapped_solution = {
        'id': solution_data['ID'],
        'name': solution_data['NAME'],
        'description': solution_data['DESCRIPTION'],
        'created_at': solution_data['CREATED_AT'],
        'updated_at': solution_data['UPDATED_AT'],
        'parameters': []
    }
    return models.Solution(**mapped_solution)

@app.get("/api/solutions", response_model=List[models.Solution])
async def get_solutions(current_user: models.User = Depends(auth.get_current_active_user)):
    """Get all solutions with parameter counts"""
    db = get_database()
    
    # Get solutions with parameter counts
    solutions_query = """
    SELECT 
        s.ID, s.NAME, s.DESCRIPTION, s.CREATED_AT, s.UPDATED_AT,
        COALESCE(COUNT(sp.PARAMETER_ID), 0) as PARAMETER_COUNT
    FROM SOLUTIONS s
    LEFT JOIN SOLUTION_PARAMETERS sp ON s.ID = sp.SOLUTION_ID
    GROUP BY s.ID, s.NAME, s.DESCRIPTION, s.CREATED_AT, s.UPDATED_AT
    ORDER BY s.NAME
    """
    
    solutions_data = db.execute_query(solutions_query)
    solutions = []
    for s in solutions_data:
        # Map uppercase column names from Snowflake to lowercase for Pydantic model
        mapped_solution = {
            'id': s['ID'],
            'name': s['NAME'],
            'description': s['DESCRIPTION'],
            'created_at': s['CREATED_AT'],
            'updated_at': s['UPDATED_AT'],
            'parameters': [],  # Empty array for compatibility
            'parameter_count': s['PARAMETER_COUNT']  # Add parameter count
        }
        solutions.append(models.Solution(**mapped_solution))
    return solutions

@app.get("/api/solutions/{solution_id}", response_model=models.Solution)
async def get_solution(
    solution_id: str, 
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get a solution with all its parameters and tags"""
    db = get_database()
    solution_data = db.get_solution_with_parameters(solution_id)
    if not solution_data:
        raise HTTPException(status_code=404, detail="Solution not found")
    
    # Convert to proper format
    solution = models.Solution(
        id=solution_data['ID'],
        name=solution_data['NAME'],
        description=solution_data['DESCRIPTION'],
        created_at=solution_data['CREATED_AT'],
        updated_at=solution_data['UPDATED_AT'],
        parameters=[]
    )
    
    # Add parameters with tags
    for param_data in solution_data['PARAMETERS']:
        tags = [models.Tag(id=tag['ID'], name=tag['NAME'], created_at=param_data['CREATED_AT']) for tag in param_data['TAGS']]
        parameter = models.Parameter(
            id=param_data['ID'],
            solution_id=solution_id,
            key=param_data['KEY'],
            value=param_data['VALUE'],
            description=param_data['DESCRIPTION'],
            is_secret=param_data['IS_SECRET'],
            created_at=param_data['CREATED_AT'],
            updated_at=param_data['UPDATED_AT'],
            tags=tags
        )
        solution.parameters.append(parameter)
    
    return solution

@app.put("/api/solutions/{solution_id}", response_model=models.Solution)
async def update_solution(
    solution_id: str,
    solution_update: models.SolutionUpdate,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Update a solution"""
    db = get_database()
    
    # Check if solution exists
    existing = db.execute_query("SELECT * FROM SOLUTIONS WHERE ID = %s", (solution_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Solution not found")
    
    # Build update query
    update_fields = []
    params = []
    
    if solution_update.name is not None:
        update_fields.append("NAME = %s")
        params.append(solution_update.name)
    
    if solution_update.description is not None:
        update_fields.append("DESCRIPTION = %s")
        params.append(solution_update.description)
    
    if update_fields:
        update_fields.append("UPDATED_AT = CURRENT_TIMESTAMP()")
        params.append(solution_id)
        
        query = f"UPDATE SOLUTIONS SET {', '.join(update_fields)} WHERE ID = %s"
        db.execute_non_query(query, tuple(params))
    
    # Return updated solution
    return await get_solution(solution_id, current_user)

@app.delete("/api/solutions/{solution_id}")
async def delete_solution(
    solution_id: str,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Delete a solution and all its parameters"""
    db = get_database()
    
    # Check if solution exists
    existing = db.execute_query("SELECT * FROM SOLUTIONS WHERE ID = %s", (solution_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Solution not found")
    
    # Delete solution (CASCADE will delete parameters and parameter_tags)
    db.execute_non_query("DELETE FROM SOLUTIONS WHERE ID = %s", (solution_id,))
    
    return models.APIResponse(message="Solution deleted successfully")

# --- Parameter Endpoints ---
@app.post("/api/parameters", response_model=models.Parameter)
async def create_parameter(
    parameter: models.ParameterCreate,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Create a new parameter"""
    db = get_database()
    
    # Debug print
    logger.info(f"Creating parameter: name={parameter.name}, key={parameter.key}")
    
    # Check if parameter key already exists
    existing_param = db.execute_query("SELECT ID FROM PARAMETERS WHERE KEY = %s", (parameter.key,))
    if existing_param:
        raise HTTPException(status_code=400, detail="Parameter key already exists")
    
    param_id = str(uuid.uuid4())
    db.execute_non_query(
        "INSERT INTO PARAMETERS (ID, NAME, KEY, VALUE, DESCRIPTION, IS_SECRET) VALUES (%s, %s, %s, %s, %s, %s)",
        (param_id, parameter.name, parameter.key, parameter.value, parameter.description, parameter.is_secret)
    )
    
    # Handle tags
    if parameter.tags:
        for tag_name in parameter.tags:
            # Get or create tag
            tag_data = db.execute_query("SELECT ID FROM TAGS WHERE NAME = %s", (tag_name,))
            if tag_data:
                tag_id = tag_data[0]['ID']
            else:
                tag_id = str(uuid.uuid4())
                db.execute_non_query("INSERT INTO TAGS (ID, NAME) VALUES (%s, %s)", (tag_id, tag_name))
            
            # Associate tag with parameter
            db.execute_non_query(
                "INSERT INTO PARAMETER_TAGS (PARAMETER_ID, TAG_ID) VALUES (%s, %s)",
                (param_id, tag_id)
            )
    
    # Return created parameter
    result = db.execute_query("SELECT * FROM PARAMETERS WHERE ID = %s", (param_id,))
    param_data = result[0]
    
    # Get tags
    tags_data = db.execute_query("""
        SELECT t.ID, t.NAME, t.CREATED_AT 
        FROM TAGS t 
        JOIN PARAMETER_TAGS pt ON t.ID = pt.TAG_ID 
        WHERE pt.PARAMETER_ID = %s
    """, (param_id,))
    
    # Map uppercase column names from Snowflake to lowercase for Pydantic model
    tags = []
    for tag in tags_data:
        mapped_tag = {
            'id': tag['ID'],
            'name': tag['NAME'],
            'created_at': tag['CREATED_AT']
        }
        tags.append(models.Tag(**mapped_tag))
    
    return models.Parameter(
        id=param_data['ID'],
        name=param_data.get('NAME'),
        key=param_data['KEY'],
        value=param_data['VALUE'],
        description=param_data['DESCRIPTION'],
        is_secret=param_data['IS_SECRET'],
        created_at=param_data['CREATED_AT'],
        updated_at=param_data['UPDATED_AT'],
        tags=tags
    )

@app.put("/api/parameters/{parameter_id}", response_model=models.Parameter)
async def update_parameter(
    parameter_id: str,
    parameter_update: models.ParameterUpdate,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Update a parameter"""
    db = get_database()
    
    # Check if parameter exists
    existing = db.execute_query("SELECT * FROM PARAMETERS WHERE ID = %s", (parameter_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Parameter not found")
    
    # Build update query
    update_fields = []
    params = []
    
    if parameter_update.name is not None:
        update_fields.append("NAME = %s")
        params.append(parameter_update.name)
    
    if parameter_update.key is not None:
        update_fields.append("KEY = %s")
        params.append(parameter_update.key)
    
    if parameter_update.value is not None:
        update_fields.append("VALUE = %s")
        params.append(parameter_update.value)
    
    if parameter_update.description is not None:
        update_fields.append("DESCRIPTION = %s")
        params.append(parameter_update.description)
    
    if parameter_update.is_secret is not None:
        update_fields.append("IS_SECRET = %s")
        params.append(parameter_update.is_secret)
    
    if update_fields:
        update_fields.append("UPDATED_AT = CURRENT_TIMESTAMP()")
        params.append(parameter_id)
        
        query = f"UPDATE PARAMETERS SET {', '.join(update_fields)} WHERE ID = %s"
        db.execute_non_query(query, tuple(params))
    
    # Handle tag updates
    if parameter_update.tags is not None:
        # Remove existing tags
        db.execute_non_query("DELETE FROM PARAMETER_TAGS WHERE PARAMETER_ID = %s", (parameter_id,))
        
        # Add new tags
        for tag_name in parameter_update.tags:
            # Get or create tag
            tag_data = db.execute_query("SELECT ID FROM TAGS WHERE NAME = %s", (tag_name,))
            if tag_data:
                tag_id = tag_data[0]['ID']
            else:
                tag_id = str(uuid.uuid4())
                db.execute_non_query("INSERT INTO TAGS (ID, NAME) VALUES (%s, %s)", (tag_id, tag_name))
            
            # Associate tag with parameter
            db.execute_non_query(
                "INSERT INTO PARAMETER_TAGS (PARAMETER_ID, TAG_ID) VALUES (%s, %s)",
                (parameter_id, tag_id)
            )
    
    # Return updated parameter
    result = db.execute_query("SELECT * FROM PARAMETERS WHERE ID = %s", (parameter_id,))
    param_data = result[0]
    
    # Get tags
    tags_data = db.execute_query("""
        SELECT t.ID, t.NAME, t.CREATED_AT 
        FROM TAGS t 
        JOIN PARAMETER_TAGS pt ON t.ID = pt.TAG_ID 
        WHERE pt.PARAMETER_ID = %s
    """, (parameter_id,))
    
    # Map uppercase column names from Snowflake to lowercase for Pydantic model
    tags = []
    for tag in tags_data:
        mapped_tag = {
            'id': tag['ID'],
            'name': tag['NAME'],
            'created_at': tag['CREATED_AT']
        }
        tags.append(models.Tag(**mapped_tag))
    
    return models.Parameter(
        id=param_data['ID'],
        name=param_data.get('NAME'),
        key=param_data['KEY'],
        value=param_data['VALUE'],
        description=param_data['DESCRIPTION'],
        is_secret=param_data['IS_SECRET'],
        created_at=param_data['CREATED_AT'],
        updated_at=param_data['UPDATED_AT'],
        tags=tags
    )

@app.delete("/api/parameters/{parameter_id}")
async def delete_parameter(
    parameter_id: str,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Delete a parameter"""
    db = get_database()
    
    # Check if parameter exists
    existing = db.execute_query("SELECT * FROM PARAMETERS WHERE ID = %s", (parameter_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Parameter not found")
    
    # Delete parameter (CASCADE will delete parameter_tags)
    db.execute_non_query("DELETE FROM PARAMETERS WHERE ID = %s", (parameter_id,))
    
    return models.APIResponse(message="Parameter deleted successfully")

# --- Tag Endpoints ---
@app.post("/api/tags", response_model=models.Tag)
async def create_tag(
    tag: models.TagCreate,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Create a new tag"""
    db = get_database()
    tag_id = str(uuid.uuid4())
    
    try:
        db.execute_non_query("INSERT INTO TAGS (ID, NAME) VALUES (%s, %s)", (tag_id, tag.name))
    except Exception as e:
        if "unique constraint" in str(e).lower():
            raise HTTPException(status_code=400, detail="Tag name already exists")
        raise HTTPException(status_code=500, detail="Failed to create tag")
    
    result = db.execute_query("SELECT * FROM TAGS WHERE ID = %s", (tag_id,))
    tag_data = result[0]
    # Map uppercase column names from Snowflake to lowercase for Pydantic model
    mapped_tag = {
        'id': tag_data['ID'],
        'name': tag_data['NAME'],
        'created_at': tag_data['CREATED_AT']
    }
    return models.Tag(**mapped_tag)

@app.get("/api/tags", response_model=List[models.Tag])
async def get_tags(current_user: models.User = Depends(auth.get_current_active_user)):
    """Get all tags"""
    db = get_database()
    tags_data = db.execute_query("SELECT * FROM TAGS ORDER BY NAME")
    # Map uppercase column names from Snowflake to lowercase for Pydantic model
    mapped_tags = []
    for tag in tags_data:
        mapped_tag = {
            'id': tag['ID'],
            'name': tag['NAME'],
            'created_at': tag['CREATED_AT']
        }
        mapped_tags.append(models.Tag(**mapped_tag))
    return mapped_tags

@app.delete("/api/tags/{tag_id}")
async def delete_tag(
    tag_id: str,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Delete a tag"""
    db = get_database()
    
    # Check if tag exists
    existing = db.execute_query("SELECT * FROM TAGS WHERE ID = %s", (tag_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    # Delete tag (CASCADE will delete parameter_tags)
    db.execute_non_query("DELETE FROM TAGS WHERE ID = %s", (tag_id,))
    
    return models.APIResponse(message="Tag deleted successfully")

@app.get("/test-name-field")
async def test_name_field():
    """Test endpoint to verify name field functionality"""
    return {"test": "name field endpoint", "name": "test_value"}

# --- Search and Filter Endpoints ---
@app.post("/api/parameters/search")
async def search_parameters(
    filter_params: models.ParameterFilter,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Search parameters with filters"""
    db = get_database()
    
    # Build dynamic query
    where_conditions = []
    params = []
    
    if filter_params.solution_id:
        where_conditions.append("p.ID IN (SELECT PARAMETER_ID FROM SOLUTION_PARAMETERS WHERE SOLUTION_ID = %s)")
        params.append(filter_params.solution_id)
    
    if filter_params.key_pattern:
        where_conditions.append("p.KEY ILIKE %s")
        params.append(f"%{filter_params.key_pattern}%")
    
    if filter_params.is_secret is not None:
        where_conditions.append("p.IS_SECRET = %s")
        params.append(filter_params.is_secret)
    
    base_query = """
        SELECT DISTINCT p.ID, p.NAME, p.KEY, p.VALUE, p.DESCRIPTION, p.IS_SECRET, p.CREATED_AT, p.UPDATED_AT
        FROM PARAMETERS p
    """
    
    if filter_params.tags:
        base_query += """
            JOIN PARAMETER_TAGS pt ON p.ID = pt.PARAMETER_ID
            JOIN TAGS t ON pt.TAG_ID = t.ID
        """
        tag_conditions = " OR ".join(["t.NAME = %s"] * len(filter_params.tags))
        where_conditions.append(f"({tag_conditions})")
        params.extend(filter_params.tags)
    
    if where_conditions:
        base_query += " WHERE " + " AND ".join(where_conditions)
    
    base_query += " ORDER BY p.KEY"
    
    parameters_data = db.execute_query(base_query, tuple(params))
    
    # Get tags for each parameter
    result_parameters = []
    for param_data in parameters_data:
        tags_data = db.execute_query("""
            SELECT t.ID, t.NAME, t.CREATED_AT 
            FROM TAGS t 
            JOIN PARAMETER_TAGS pt ON t.ID = pt.TAG_ID 
            WHERE pt.PARAMETER_ID = %s
        """, (param_data['ID'],))
        
        # Map uppercase column names from Snowflake to lowercase for Pydantic model
        tags = []
        for tag in tags_data:
            mapped_tag = {
                'id': tag['ID'],
                'name': tag['NAME'],
                'created_at': tag['CREATED_AT']
            }
            tags.append(models.Tag(**mapped_tag))
        
        # Manually construct parameter dict to ensure all fields are included
        parameter_dict = {
            "id": param_data['ID'],
            "name": param_data.get('NAME'),
            "key": param_data['KEY'],
            "value": param_data['VALUE'],
            "description": param_data['DESCRIPTION'],
            "is_secret": param_data['IS_SECRET'],
            "created_at": param_data['CREATED_AT'].isoformat() if param_data['CREATED_AT'] else None,
            "updated_at": param_data['UPDATED_AT'].isoformat() if param_data['UPDATED_AT'] else None,
            "tags": [{"id": tag.id, "name": tag.name, "created_at": tag.created_at.isoformat()} for tag in tags]
        }
        result_parameters.append(parameter_dict)
    
    return result_parameters

# --- Bulk Operations ---
@app.post("/api/parameters/bulk")
async def bulk_parameter_operation(
    operation: models.BulkParameterOperation,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Perform bulk operations on parameters"""
    db = get_database()
    
    if operation.operation == "delete":
        # Delete multiple parameters
        for param_id in operation.parameter_ids:
            db.execute_non_query("DELETE FROM PARAMETERS WHERE ID = %s", (param_id,))
        return models.APIResponse(message=f"Deleted {len(operation.parameter_ids)} parameters")
    
    elif operation.operation == "tag":
        # Add tags to multiple parameters
        if not operation.tags:
            raise HTTPException(status_code=400, detail="Tags required for tag operation")
        
        for tag_name in operation.tags:
            # Get or create tag
            tag_data = db.execute_query("SELECT ID FROM TAGS WHERE NAME = %s", (tag_name,))
            if tag_data:
                tag_id = tag_data[0]['ID']
            else:
                tag_id = str(uuid.uuid4())
                db.execute_non_query("INSERT INTO TAGS (ID, NAME) VALUES (%s, %s)", (tag_id, tag_name))
            
            # Associate tag with all parameters
            for param_id in operation.parameter_ids:
                try:
                    db.execute_non_query(
                        "INSERT INTO PARAMETER_TAGS (PARAMETER_ID, TAG_ID) VALUES (%s, %s)",
                        (param_id, tag_id)
                    )
                except:
                    # Ignore if association already exists
                    pass
        
        return models.APIResponse(message=f"Tagged {len(operation.parameter_ids)} parameters")
    
    elif operation.operation == "untag":
        # Remove tags from multiple parameters
        if not operation.tags:
            raise HTTPException(status_code=400, detail="Tags required for untag operation")
        
        for tag_name in operation.tags:
            tag_data = db.execute_query("SELECT ID FROM TAGS WHERE NAME = %s", (tag_name,))
            if tag_data:
                tag_id = tag_data[0]['ID']
                for param_id in operation.parameter_ids:
                    db.execute_non_query(
                        "DELETE FROM PARAMETER_TAGS WHERE PARAMETER_ID = %s AND TAG_ID = %s",
                        (param_id, tag_id)
                    )
        
        return models.APIResponse(message=f"Untagged {len(operation.parameter_ids)} parameters")
    
    else:
        raise HTTPException(status_code=400, detail="Invalid operation")

# --- Health Check Endpoint ---
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    db = get_database()
    db_healthy = db.validate_connection() if db.connection else False
    
    return {
        "status": "healthy" if db_healthy else "unhealthy",
        "database": "connected" if db_healthy else "disconnected",
        "timestamp": datetime.now().isoformat()
    }

# --- Frontend Static Files ---
if os.path.exists("frontend/build"):
    app.mount("/static", StaticFiles(directory="frontend/build/static"), name="static")
    
    @app.get("/")
    async def serve_frontend():
        return FileResponse("frontend/build/index.html")
    
    @app.get("/{path:path}")
    async def serve_frontend_routes(path: str):
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        return FileResponse("frontend/build/index.html")

# --- Solution-Parameter Association Endpoints ---
@app.post("/api/solutions/{solution_id}/parameters/{parameter_id}")
async def assign_parameter_to_solution(
    solution_id: str,
    parameter_id: str,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Assign an existing parameter to a solution"""
    db = get_database()
    
    # Check if solution exists
    solution_check = db.execute_query("SELECT ID FROM SOLUTIONS WHERE ID = %s", (solution_id,))
    if not solution_check:
        raise HTTPException(status_code=404, detail="Solution not found")
    
    # Check if parameter exists
    parameter_check = db.execute_query("SELECT ID FROM PARAMETERS WHERE ID = %s", (parameter_id,))
    if not parameter_check:
        raise HTTPException(status_code=404, detail="Parameter not found")
    
    # Check if association already exists
    existing = db.execute_query(
        "SELECT * FROM SOLUTION_PARAMETERS WHERE SOLUTION_ID = %s AND PARAMETER_ID = %s",
        (solution_id, parameter_id)
    )
    if existing:
        return models.APIResponse(message="Parameter already assigned to solution")
    
    # Create association
    db.execute_non_query(
        "INSERT INTO SOLUTION_PARAMETERS (SOLUTION_ID, PARAMETER_ID) VALUES (%s, %s)",
        (solution_id, parameter_id)
    )
    
    return models.APIResponse(message="Parameter assigned to solution successfully")

@app.delete("/api/solutions/{solution_id}/parameters/{parameter_id}")
async def remove_parameter_from_solution(
    solution_id: str,
    parameter_id: str,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Remove a parameter from a solution"""
    db = get_database()
    
    result = db.execute_non_query(
        "DELETE FROM SOLUTION_PARAMETERS WHERE SOLUTION_ID = %s AND PARAMETER_ID = %s",
        (solution_id, parameter_id)
    )
    
    if result == 0:
        raise HTTPException(status_code=404, detail="Parameter assignment not found")
    
    return models.APIResponse(message="Parameter removed from solution successfully")

@app.get("/api/parameters/unassigned", response_model=List[models.Parameter])
async def get_unassigned_parameters(
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get all parameters that are not assigned to any solution"""
    db = get_database()
    
    query = """
        SELECT p.ID, p.NAME, p.KEY, p.VALUE, p.DESCRIPTION, p.IS_SECRET, p.CREATED_AT, p.UPDATED_AT
        FROM PARAMETERS p
        WHERE p.ID NOT IN (SELECT PARAMETER_ID FROM SOLUTION_PARAMETERS)
        ORDER BY p.KEY
    """
    
    parameters_data = db.execute_query(query)
    parameters = []
    
    for param_data in parameters_data:
        # Get tags for this parameter
        tags_data = db.execute_query("""
            SELECT t.ID, t.NAME, t.CREATED_AT 
            FROM TAGS t 
            JOIN PARAMETER_TAGS pt ON t.ID = pt.TAG_ID 
            WHERE pt.PARAMETER_ID = %s
        """, (param_data['ID'],))
        
        # Map uppercase column names from Snowflake to lowercase for Pydantic model
        tags = []
        for tag in tags_data:
            mapped_tag = {
                'id': tag['ID'],
                'name': tag['NAME'],
                'created_at': tag['CREATED_AT']
            }
            tags.append(models.Tag(**mapped_tag))
        
        parameter = models.Parameter(
            id=param_data['ID'],
            name=param_data.get('NAME'),
            key=param_data['KEY'],
            value=param_data['VALUE'],
            description=param_data['DESCRIPTION'],
            is_secret=param_data['IS_SECRET'],
            created_at=param_data['CREATED_AT'],
            updated_at=param_data['UPDATED_AT'],
            tags=tags
        )
        parameters.append(parameter)
    
    return parameters

# --- Container Services Endpoints ---
@app.get("/api/container-services", response_model=List[models.ContainerService])
async def get_container_services(current_user: models.User = Depends(auth.get_current_active_user)):
    """Get all container services"""
    db = get_database()
    try:
        services_data = db.get_container_services()
        services = []
        for service_data in services_data:
            # Map service data to ContainerService model
            service = models.ContainerService(
                name=service_data['name'],
                compute_pool=service_data['compute_pool'],
                status=service_data['status'],
                spec=service_data.get('spec', ''),
                min_instances=service_data.get('min_instances', 1),
                max_instances=service_data.get('max_instances', 1),
                created_at=service_data.get('created_at', datetime.now()),
                updated_at=service_data.get('updated_at'),
                endpoint_url=service_data.get('endpoint_url'),
                dns_name=service_data.get('dns_name')
            )
            services.append(service)
        return services
    except Exception as e:
        logger.error(f"Error getting container services: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve container services")

@app.get("/api/container-services/{service_name}", response_model=models.ContainerService)
async def get_container_service(
    service_name: str,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Get a specific container service"""
    db = get_database()
    service_data = db.get_container_service_details(service_name)
    if not service_data:
        raise HTTPException(status_code=404, detail="Container service not found")
    
    return models.ContainerService(
        name=service_data['name'],
        compute_pool=service_data['compute_pool'],
        status=service_data['status'],
        spec=service_data.get('spec', ''),
        min_instances=service_data.get('min_instances', 1),
        max_instances=service_data.get('max_instances', 1),
        created_at=service_data.get('created_at', datetime.now()),
        updated_at=service_data.get('updated_at'),
        endpoint_url=service_data.get('endpoint_url'),
        dns_name=service_data.get('dns_name')
    )

@app.post("/api/container-services/{service_name}/start")
async def start_container_service(
    service_name: str,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Start/Resume a container service"""
    db = get_database()
    success = db.start_container_service(service_name)
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to start container service {service_name}")
    
    return models.APIResponse(message=f"Container service {service_name} started successfully")

@app.post("/api/container-services/{service_name}/stop")
async def stop_container_service(
    service_name: str,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Stop/Suspend a container service"""
    db = get_database()
    success = db.stop_container_service(service_name)
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to stop container service {service_name}")
    
    return models.APIResponse(message=f"Container service {service_name} stopped successfully")

@app.get("/api/compute-pools", response_model=List[models.ComputePool])
async def get_compute_pools(current_user: models.User = Depends(auth.get_current_active_user)):
    """Get all compute pools"""
    db = get_database()
    try:
        pools_data = db.get_compute_pools()
        pools = []
        for pool_data in pools_data:
            pool = models.ComputePool(
                name=pool_data['name'],
                state=pool_data['state'],
                min_nodes=pool_data['min_nodes'],
                max_nodes=pool_data['max_nodes'],
                instance_family=pool_data['instance_family'],
                created_at=pool_data.get('created_at', datetime.now())
            )
            pools.append(pool)
        return pools
    except Exception as e:
        logger.error(f"Error getting compute pools: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve compute pools")

if __name__ == "__main__":
    import uvicorn
    
    # Check database connection before starting the server
    check_database_connection()
    
    logger.info("🚀 Starting FastAPI server...")
    logger.info("📡 Backend will be available at: http://localhost:8000")
    logger.info("📚 API Documentation at: http://localhost:8000/docs")
    logger.info("🛑 Press Ctrl+C to stop the server")
    
    uvicorn.run(app, host="0.0.0.0", port=8000) 