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
        
        # Insert default data (tags, solutions, parameters)
        logger.info("📝 Inserting default data...")
        db.insert_default_data()
        logger.info("✅ Default data inserted successfully!")
        
        # Note: User management removed - using Snowflake authentication only
        logger.info("✅ Authentication configured for Snowflake-only access")
        
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
async def login_for_access_token(login_data: models.SnowflakeLogin):
    """Authenticate with Snowflake and return access token"""
    try:
        # Create auth token using Snowflake credentials
        access_token = auth.create_auth_token(login_data)
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        logger.error(f"Authentication failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed. Please check your Snowflake credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

@app.get("/api/user/me", response_model=models.SnowflakeUser)
async def get_current_user_info(current_user: dict = Depends(auth.get_current_user)):
    """Get current user information"""
    return models.SnowflakeUser(
        username=current_user["username"],
        account=current_user["account"]
    )

# --- User Management Endpoints ---
@app.get("/api/users", response_model=List[models.User])
async def get_users(current_user: dict = Depends(auth.get_current_user)):
    """Get all users (admin only)"""
    # Note: Simplified authentication - all authenticated users have access
    
    db = get_database()
    users = auth.get_all_users(db)
    return users

@app.post("/api/users", response_model=models.User)
async def create_user(
    user_data: models.UserCreate,
    current_user: dict = Depends(auth.get_current_user)
):
    """Create a new user (admin only)"""
    # Note: Simplified authentication - all authenticated users have access
    
    db = get_database()
    try:
        new_user = auth.create_user(db, user_data)
        # Convert UserInDB to User for response
        user_response = models.User(
            id=new_user.id,
            username=new_user.username,
            email=new_user.email,
            first_name=new_user.first_name,
            last_name=new_user.last_name,
            role=new_user.role,
            is_active=new_user.is_active,
            is_sso_user=new_user.is_sso_user,
            sso_provider=new_user.sso_provider,
            sso_user_id=new_user.sso_user_id,
            use_snowflake_auth=new_user.use_snowflake_auth,
            last_login=new_user.last_login,
            created_at=new_user.created_at,
            updated_at=new_user.updated_at
        )
        return user_response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/api/users/{user_id}", response_model=models.User)
async def get_user(
    user_id: str,
    current_user: dict = Depends(auth.get_current_user)
):
    """Get user by ID (admin or self)"""
    # Role check removed for simplified Snowflake auth
    if False:  # Disabled
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own profile"
        )
    
    db = get_database()
    user = auth.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Convert UserInDB to User for response
    user_response = models.User(
        id=user.id,
        username=user.username,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        is_active=user.is_active,
        is_sso_user=user.is_sso_user,
        sso_provider=user.sso_provider,
        sso_user_id=user.sso_user_id,
        use_snowflake_auth=user.use_snowflake_auth,
        last_login=user.last_login,
        created_at=user.created_at,
        updated_at=user.updated_at
    )
    return user_response

@app.put("/api/users/{user_id}", response_model=models.User)
async def update_user(
    user_id: str,
    user_update: models.UserUpdate,
    current_user: dict = Depends(auth.get_current_user)
):
    """Update user (admin or self)"""
    # Users can update their own profile, but only admins can change roles or other users
    # Role check removed for simplified Snowflake auth
    if False:  # Disabled
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own profile"
        )
    
    # Non-admin users cannot change role or admin-only fields
    if current_user.role != "admin" and current_user.id == user_id:
        if user_update.role is not None or user_update.is_active is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot change role or status fields"
            )
    
    db = get_database()
    updated_user = auth.update_user(db, user_id, user_update)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Convert UserInDB to User for response
    user_response = models.User(
        id=updated_user.id,
        username=updated_user.username,
        email=updated_user.email,
        first_name=updated_user.first_name,
        last_name=updated_user.last_name,
        role=updated_user.role,
        is_active=updated_user.is_active,
        is_sso_user=updated_user.is_sso_user,
        sso_provider=updated_user.sso_provider,
        sso_user_id=updated_user.sso_user_id,
        use_snowflake_auth=updated_user.use_snowflake_auth,
        last_login=updated_user.last_login,
        created_at=updated_user.created_at,
        updated_at=updated_user.updated_at
    )
    return user_response

@app.delete("/api/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(auth.get_current_user)
):
    """Delete user (admin only)"""
    # Role check removed for simplified Snowflake auth
    if False:  # Disabled
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can delete users"
        )
    
    # Role check removed for simplified Snowflake auth
    if False:  # Disabled
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )
    
    db = get_database()
    user = auth.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    auth.delete_user(db, user_id)
    return {"message": "User deleted successfully"}

@app.post("/api/users/password-reset-request")
async def request_password_reset(request: models.PasswordResetRequest):
    """Request password reset token"""
    db = get_database()
    reset_token = auth.generate_password_reset_token(db, request.username)
    
    if reset_token:
        # In a real application, you would send this token via email
        # For now, we'll just return it (not secure for production)
        logger.info(f"Password reset token for {request.username}: {reset_token}")
        return {"message": "Password reset token generated", "reset_token": reset_token}
    else:
        return {"message": "If the user exists and is eligible for password reset, a token has been generated"}

@app.post("/api/users/password-reset")
async def reset_password(reset_data: models.PasswordReset):
    """Reset user password with token"""
    db = get_database()
    success = auth.reset_password(
        db, 
        reset_data.username, 
        reset_data.new_password, 
        reset_data.reset_token
    )
    
    if success:
        return {"message": "Password reset successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token or unable to reset password"
        )

@app.post("/api/users/{user_id}/reset-password")
async def admin_reset_password(
    user_id: str,
    new_password_data: dict,
    current_user: dict = Depends(auth.get_current_user)
):
    """Admin reset user password (admin only)"""
    # Role check removed for simplified Snowflake auth
    if False:  # Disabled
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can reset passwords"
        )
    
    db = get_database()
    user = auth.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    success = auth.reset_password(db, user.username, new_password_data["new_password"])
    
    if success:
        return {"message": "Password reset successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to reset password (user may be SSO or Snowflake auth)"
        )

# --- Solution Endpoints ---
@app.post("/api/solutions", response_model=models.Solution)
async def create_solution(
    solution: models.SolutionCreate, 
    current_user: dict = Depends(auth.get_current_user)
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
async def get_solutions(current_user: dict = Depends(auth.get_current_user)):
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
    current_user: dict = Depends(auth.get_current_user)
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
    current_user: dict = Depends(auth.get_current_user)
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
    current_user: dict = Depends(auth.get_current_user)
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

@app.get("/api/solutions/{solution_id}/export")
async def export_solution_config(
    solution_id: str,
    format: str = "json",
    current_user: dict = Depends(auth.get_current_user)
):
    """Export solution configuration for application usage"""
    from fastapi.responses import Response
    import json
    import yaml
    
    db = get_database()
    
    # Get solution details
    solution_data = db.execute_query("SELECT * FROM SOLUTIONS WHERE ID = %s", (solution_id,))
    if not solution_data:
        raise HTTPException(status_code=404, detail="Solution not found")
    
    solution = solution_data[0]
    
    # Get solution parameters with their tags
    params_query = """
    SELECT p.*, 
           LISTAGG(t.NAME, ',') WITHIN GROUP (ORDER BY t.NAME) as tag_names
    FROM PARAMETERS p
    JOIN SOLUTION_PARAMETERS sp ON p.ID = sp.PARAMETER_ID
    LEFT JOIN PARAMETER_TAGS pt ON p.ID = pt.PARAMETER_ID
    LEFT JOIN TAGS t ON pt.TAG_ID = t.ID
    WHERE sp.SOLUTION_ID = %s
    GROUP BY p.ID, p.NAME, p.KEY, p.VALUE, p.DESCRIPTION, p.IS_SECRET, p.CREATED_AT, p.UPDATED_AT
    ORDER BY p.KEY
    """
    
    params_data = db.execute_query(params_query, (solution_id,))
    
    # Build configuration structure
    config = {
        "solution": {
            "id": solution['ID'],
            "name": solution['NAME'],
            "description": solution.get('DESCRIPTION', ''),
            "created_at": solution['CREATED_AT'].isoformat() if solution['CREATED_AT'] else None,
            "exported_at": datetime.now().isoformat()
        },
        "parameters": {},
        "metadata": {
            "parameter_count": len(params_data),
            "secret_parameter_count": len([p for p in params_data if p.get('IS_SECRET', False)]),
            "tags": []
        }
    }
    
    # Process parameters
    all_tags = set()
    for param in params_data:
        param_config = {
            "value": param.get('VALUE', ''),
            "description": param.get('DESCRIPTION', ''),
            "is_secret": bool(param.get('IS_SECRET', False)),
            "name": param.get('NAME', ''),
            "tags": []
        }
        
        # Add tags if they exist
        if param.get('TAG_NAMES'):
            param_tags = [tag.strip() for tag in param['TAG_NAMES'].split(',') if tag.strip()]
            param_config["tags"] = param_tags
            all_tags.update(param_tags)
        
        # For secret parameters, don't include the actual value in export
        if param_config["is_secret"]:
            param_config["value"] = "*** HIDDEN ***"
            param_config["_note"] = "Secret parameter value not exported for security"
        
        config["parameters"][param['KEY']] = param_config
    
    config["metadata"]["tags"] = sorted(list(all_tags))
    
    # Format response based on requested format
    if format.lower() == "yaml":
        content = yaml.dump(config, default_flow_style=False, sort_keys=False)
        media_type = "application/x-yaml"
        filename = f"{solution['NAME'].replace(' ', '_')}_config.yaml"
    elif format.lower() == "env":
        # Environment variable format
        lines = [f"# Configuration for {solution['NAME']}"]
        lines.append(f"# Generated on {datetime.now().isoformat()}")
        lines.append("")
        
        for key, param in config["parameters"].items():
            if param["description"]:
                lines.append(f"# {param['description']}")
            if param["is_secret"]:
                lines.append(f"# SECRET: {key}=<your_secret_value_here>")
            else:
                lines.append(f"{key}={param['value']}")
            lines.append("")
        
        content = "\n".join(lines)
        media_type = "text/plain"
        filename = f"{solution['NAME'].replace(' ', '_')}_config.env"
    elif format.lower() == "properties":
        # Java properties format
        lines = [f"# Configuration for {solution['NAME']}"]
        lines.append(f"# Generated on {datetime.now().isoformat()}")
        lines.append("")
        
        for key, param in config["parameters"].items():
            if param["description"]:
                lines.append(f"# {param['description']}")
            if param["is_secret"]:
                lines.append(f"# {key}=<your_secret_value_here>")
            else:
                # Escape special characters for properties format
                value = str(param['value']).replace('\\', '\\\\').replace('=', '\\=').replace(':', '\\:')
                lines.append(f"{key}={value}")
            lines.append("")
        
        content = "\n".join(lines)
        media_type = "text/plain"
        filename = f"{solution['NAME'].replace(' ', '_')}_config.properties"
    else:
        # Default to JSON
        content = json.dumps(config, indent=2, default=str)
        media_type = "application/json"
        filename = f"{solution['NAME'].replace(' ', '_')}_config.json"
    
    # Return file download response
    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Content-Type": f"{media_type}; charset=utf-8"
        }
    )

# --- Solution API Key Endpoints ---
@app.post("/api/solutions/{solution_id}/api-keys", response_model=models.SolutionAPIKeyResponse)
async def create_solution_api_key(
    solution_id: str,
    key_data: models.CreateSolutionAPIKey,
    current_user: dict = Depends(auth.get_current_user)
):
    """Create a new API key for a solution"""
    import secrets
    import hashlib
    from datetime import datetime, timedelta
    
    db = get_database()
    
    # Check if solution exists
    solution_data = db.execute_query("SELECT * FROM SOLUTIONS WHERE ID = %s", (solution_id,))
    if not solution_data:
        raise HTTPException(status_code=404, detail="Solution not found")
    
    # Generate secure API key
    api_key = f"sol_{secrets.token_urlsafe(32)}"
    
    # Calculate expiration date if specified
    expires_at = None
    if key_data.expires_days:
        expires_at = datetime.now() + timedelta(days=key_data.expires_days)
    
    # Create API key
    api_key_id = db.create_solution_api_key(
        solution_id=solution_id,
        key_name=key_data.key_name,
        api_key=api_key,
        expires_at=expires_at
    )
    
    return models.SolutionAPIKeyResponse(
        id=api_key_id,
        solution_id=solution_id,
        key_name=key_data.key_name,
        api_key=api_key,
        is_active=True,
        created_at=datetime.now(),
        expires_at=expires_at
    )

@app.get("/api/solutions/{solution_id}/api-keys", response_model=List[models.SolutionAPIKeyList])
async def get_solution_api_keys(
    solution_id: str,
    current_user: dict = Depends(auth.get_current_user)
):
    """Get all API keys for a solution"""
    db = get_database()
    
    # Check if solution exists
    solution_data = db.execute_query("SELECT * FROM SOLUTIONS WHERE ID = %s", (solution_id,))
    if not solution_data:
        raise HTTPException(status_code=404, detail="Solution not found")
    
    api_keys = db.get_solution_api_keys(solution_id)
    
    return [
        models.SolutionAPIKeyList(
            id=key['ID'],
            solution_id=key['SOLUTION_ID'],
            key_name=key['KEY_NAME'],
            api_key_preview=f"...{key['API_KEY'][-4:]}" if key['API_KEY'] else "...",
            is_active=key['IS_ACTIVE'],
            created_at=key['CREATED_AT'],
            last_used=key['LAST_USED'],
            expires_at=key['EXPIRES_AT']
        )
        for key in api_keys
    ]

@app.delete("/api/solutions/{solution_id}/api-keys/{api_key_id}")
async def delete_solution_api_key(
    solution_id: str,
    api_key_id: str,
    current_user: dict = Depends(auth.get_current_user)
):
    """Delete an API key"""
    db = get_database()
    db.delete_solution_api_key(api_key_id)
    return models.APIResponse(message="API key deleted successfully")

@app.patch("/api/solutions/{solution_id}/api-keys/{api_key_id}/toggle")
async def toggle_solution_api_key(
    solution_id: str,
    api_key_id: str,
    is_active: bool,
    current_user: dict = Depends(auth.get_current_user)
):
    """Enable/disable an API key"""
    db = get_database()
    db.toggle_solution_api_key(api_key_id, is_active)
    return models.APIResponse(message="API key updated successfully")

# --- Public API Key Export Endpoint (No Authentication Required) ---
@app.get("/api/public/solutions/config")
async def get_solution_config_by_api_key(
    api_key: str,
    format: str = "json"
):
    """Get solution configuration using API key (no authentication required)"""
    from fastapi.responses import Response
    import json
    import yaml
    
    db = get_database()
    
    # Validate API key
    key_info = db.validate_solution_api_key(api_key)
    if not key_info:
        raise HTTPException(status_code=401, detail="Invalid or expired API key")
    
    solution_id = key_info['SOLUTION_ID']
    
    # Get solution details
    solution_data = db.execute_query("SELECT * FROM SOLUTIONS WHERE ID = %s", (solution_id,))
    if not solution_data:
        raise HTTPException(status_code=404, detail="Solution not found")
    
    solution = solution_data[0]
    
    # Get solution parameters
    params_query = """
    SELECT p.KEY, p.VALUE
    FROM PARAMETERS p
    JOIN SOLUTION_PARAMETERS sp ON p.ID = sp.PARAMETER_ID
    WHERE sp.SOLUTION_ID = %s
    ORDER BY p.KEY
    """
    
    params_data = db.execute_query(params_query, (solution_id,))
    
    # Build simple key-value configuration structure
    # For public API, include all values including secrets for environment configuration
    config = {}
    
    # Process parameters - just key-value pairs with secrets in plain text
    for param in params_data:
        config[param['KEY']] = param.get('VALUE', '')
    
    # Format response based on requested format
    if format.lower() == "yaml":
        content = yaml.dump(config, default_flow_style=False, sort_keys=False)
        media_type = "application/x-yaml"
        filename = f"{solution['NAME'].replace(' ', '_')}_config.yaml"
    elif format.lower() == "env":
        # Environment variable format
        lines = [f"# Configuration for {solution['NAME']}"]
        lines.append(f"# Generated on {datetime.now().isoformat()}")
        lines.append("")
        
        for key, value in config.items():
            lines.append(f"{key}={value}")
        
        content = "\n".join(lines)
        media_type = "text/plain"
        filename = f"{solution['NAME'].replace(' ', '_')}_config.env"
    elif format.lower() == "properties":
        # Java properties format
        lines = [f"# Configuration for {solution['NAME']}"]
        lines.append(f"# Generated on {datetime.now().isoformat()}")
        lines.append("")
        
        for key, value in config.items():
            # Escape special characters for properties format
            escaped_value = str(value).replace('\\', '\\\\').replace('=', '\\=').replace(':', '\\:')
            lines.append(f"{key}={escaped_value}")
        
        content = "\n".join(lines)
        media_type = "text/plain"
        filename = f"{solution['NAME'].replace(' ', '_')}_config.properties"
    else:
        # Default to JSON
        content = json.dumps(config, indent=2, default=str)
        media_type = "application/json"
        filename = f"{solution['NAME'].replace(' ', '_')}_config.json"
    
    # Return file download response
    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Content-Type": f"{media_type}; charset=utf-8"
        }
    )

# --- Parameter Endpoints ---
@app.post("/api/parameters", response_model=models.Parameter)
async def create_parameter(
    parameter: models.ParameterCreate,
    current_user: dict = Depends(auth.get_current_user)
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
    current_user: dict = Depends(auth.get_current_user)
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
    current_user: dict = Depends(auth.get_current_user)
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
    current_user: dict = Depends(auth.get_current_user)
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
async def get_tags(current_user: dict = Depends(auth.get_current_user)):
    """Get all tags"""
    logger.info(f"🏷️ Getting tags for user: {current_user.get('username')}")
    db = get_database()
    tags_data = db.execute_query("SELECT * FROM TAGS ORDER BY NAME")
    logger.info(f"🏷️ Raw tags data from database: {tags_data}")
    # Map uppercase column names from Snowflake to lowercase for Pydantic model
    mapped_tags = []
    for tag in tags_data:
        mapped_tag = {
            'id': tag['ID'],
            'name': tag['NAME'],
            'created_at': tag['CREATED_AT']
        }
        mapped_tags.append(models.Tag(**mapped_tag))
    logger.info(f"🏷️ Returning {len(mapped_tags)} tags")
    return mapped_tags

@app.delete("/api/tags/{tag_id}")
async def delete_tag(
    tag_id: str,
    current_user: dict = Depends(auth.get_current_user)
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
    current_user: dict = Depends(auth.get_current_user)
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
    current_user: dict = Depends(auth.get_current_user)
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
    current_user: dict = Depends(auth.get_current_user)
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
    current_user: dict = Depends(auth.get_current_user)
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
    current_user: dict = Depends(auth.get_current_user)
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
async def get_container_services(current_user: dict = Depends(auth.get_current_user)):
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
    current_user: dict = Depends(auth.get_current_user)
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
    current_user: dict = Depends(auth.get_current_user)
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
    current_user: dict = Depends(auth.get_current_user)
):
    """Stop/Suspend a container service"""
    db = get_database()
    success = db.stop_container_service(service_name)
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to stop container service {service_name}")
    
    return models.APIResponse(message=f"Container service {service_name} stopped successfully")

@app.post("/api/container-services")
async def create_container_service(
    service_data: models.ContainerServiceCreate,
    current_user: dict = Depends(auth.get_current_user)
):
    """Create a new container service on a compute pool"""
    db = get_database()
    try:
        # Validate service name upfront
        if '-' in service_data.name:
            logger.warning(f"Service name '{service_data.name}' contains hyphens, will be replaced with underscores")
        
        success = db.create_container_service(
            service_data.name,
            service_data.compute_pool,
            service_data.spec or "",
            service_data.min_instances or 1,
            service_data.max_instances or 1
        )
        if not success:
            # The database method already logged the specific error
            # Check if it's a validation/client error vs server error
            raise Exception("Container service creation failed")
        
        # Use the sanitized name in the response
        final_name = service_data.name.replace('-', '_') if '-' in service_data.name else service_data.name
        return models.APIResponse(message=f"Container service {final_name} created successfully")
    except ValueError as ve:
        # Handle validation errors with 400 Bad Request
        logger.error(f"Validation error creating container service: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        error_msg = str(e)
        if "Image repository" in error_msg and "does not exist" in error_msg:
            raise HTTPException(
                status_code=400, 
                detail="Image repository not found. Please ensure the image path in your specification is correct and the repository exists."
            )
        elif "Compute pool" in error_msg and "does not exist" in error_msg:
            raise HTTPException(
                status_code=400, 
                detail=f"Compute pool '{service_data.compute_pool}' not found or not accessible."
            )
        elif "syntax error" in error_msg.lower():
            raise HTTPException(
                status_code=400, 
                detail="Syntax error in service specification. Please check your YAML specification format."
            )
        elif "not authorized" in error_msg.lower() or "does not exist" in error_msg.lower():
            raise HTTPException(
                status_code=400, 
                detail="Resource not found or access denied. Please check your permissions and ensure all referenced resources exist."
            )
        else:
            logger.error(f"Error creating container service: {e}")
            raise HTTPException(status_code=500, detail=f"Internal server error while creating container service")

@app.delete("/api/container-services/{service_name}")
async def delete_container_service(
    service_name: str,
    current_user: dict = Depends(auth.get_current_user)
):
    """Delete a container service"""
    db = get_database()
    try:
        success = db.drop_container_service(service_name)
        if not success:
            raise HTTPException(status_code=500, detail=f"Failed to delete container service {service_name}")
        
        return models.APIResponse(message=f"Container service {service_name} deleted successfully")
    except Exception as e:
        logger.error(f"Error deleting container service: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete container service: {str(e)}")

@app.get("/api/compute-pools", response_model=List[models.ComputePool])
async def get_compute_pools(current_user: dict = Depends(auth.get_current_user)):
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

@app.post("/api/compute-pools/{pool_name}/suspend")
async def suspend_compute_pool(
    pool_name: str,
    current_user: dict = Depends(auth.get_current_user)
):
    """Suspend a compute pool"""
    db = get_database()
    success = db.suspend_compute_pool(pool_name)
    
    if success:
        return models.APIResponse(message=f"Compute pool {pool_name} suspended successfully")
    else:
        raise HTTPException(status_code=500, detail=f"Failed to suspend compute pool {pool_name}")

@app.post("/api/compute-pools/{pool_name}/resume")
async def resume_compute_pool(
    pool_name: str,
    current_user: dict = Depends(auth.get_current_user)
):
    """Resume a compute pool"""
    db = get_database()
    success = db.resume_compute_pool(pool_name)
    
    if success:
        return models.APIResponse(message=f"Compute pool {pool_name} resumed successfully")
    else:
        raise HTTPException(status_code=500, detail=f"Failed to resume compute pool {pool_name}")

@app.post("/api/compute-pools")
async def create_compute_pool(
    pool_data: models.ComputePoolCreate,
    current_user: dict = Depends(auth.get_current_user)
):
    """Create a new compute pool"""
    db = get_database()
    try:
        success = db.create_compute_pool(
            pool_data.name,
            pool_data.instance_family,
            pool_data.min_nodes,
            pool_data.max_nodes,
            pool_data.auto_resume,
            pool_data.auto_suspend_secs
        )
        if not success:
            raise HTTPException(status_code=500, detail=f"Failed to create compute pool {pool_data.name}")
        
        return models.APIResponse(message=f"Compute pool {pool_data.name} created successfully")
    except Exception as e:
        logger.error(f"Error creating compute pool: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create compute pool: {str(e)}")

@app.delete("/api/compute-pools/{pool_name}")
async def delete_compute_pool(
    pool_name: str,
    current_user: dict = Depends(auth.get_current_user)
):
    """Delete a compute pool"""
    db = get_database()
    try:
        success = db.drop_compute_pool(pool_name)
        if not success:
            raise HTTPException(status_code=500, detail=f"Failed to delete compute pool {pool_name}")
        
        return models.APIResponse(message=f"Compute pool {pool_name} deleted successfully")
    except Exception as e:
        logger.error(f"Error deleting compute pool: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete compute pool: {str(e)}")

@app.get("/api/compute-pools/{pool_name}")
async def describe_compute_pool(
    pool_name: str,
    current_user: dict = Depends(auth.get_current_user)
):
    """Get detailed information about a compute pool"""
    db = get_database()
    try:
        pool_details = db.describe_compute_pool(pool_name)
        if not pool_details:
            raise HTTPException(status_code=404, detail=f"Compute pool {pool_name} not found or no details available")
        
        return {"success": True, "data": pool_details}
    except Exception as e:
        logger.error(f"Error describing compute pool: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to describe compute pool: {str(e)}")

@app.get("/api/compute-pools/{pool_name}/logs")
async def get_compute_pool_logs(
    pool_name: str,
    limit: int = 100,
    current_user: dict = Depends(auth.get_current_user)
):
    """Get logs for a compute pool"""
    db = get_database()
    logs = db.get_compute_pool_logs(pool_name, limit)
    
    return {
        "pool_name": pool_name,
        "logs": logs,
        "total_count": len(logs)
    }

# --- Repository and Image Endpoints ---
@app.get("/api/image-repositories")
async def get_image_repositories(
    current_user: dict = Depends(auth.get_current_user)
):
    """Get all image repositories"""
    db = get_database()
    try:
        repositories = db.get_image_repositories()
        return repositories
    except Exception as e:
        logger.error(f"Error getting image repositories: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve image repositories")

@app.get("/api/image-repositories/{repository_name}/images")
async def get_repository_images(
    repository_name: str,
    database_name: str = None,
    schema_name: str = None,
    current_user: dict = Depends(auth.get_current_user)
):
    """Get all images in a specific repository"""
    db = get_database()
    try:
        images = db.get_repository_images(repository_name, database_name, schema_name)
        return images
    except Exception as e:
        logger.error(f"Error getting images for repository {repository_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve images for repository {repository_name}")

@app.get("/api/images")
async def get_all_images(
    current_user: dict = Depends(auth.get_current_user)
):
    """Get all images across all repositories"""
    db = get_database()
    try:
        images = db.get_all_images()
        return images
    except Exception as e:
        logger.error(f"Error getting all images: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve images")

@app.post("/api/image-repositories")
async def create_image_repository(
    repo_data: models.ImageRepositoryCreate,
    current_user: dict = Depends(auth.get_current_user)
):
    """Create a new image repository"""
    db = get_database()
    try:
        success = db.create_image_repository(
            repo_data.name,
            repo_data.database,
            repo_data.schema
        )
        if not success:
            raise HTTPException(status_code=500, detail=f"Failed to create image repository {repo_data.name}")
        
        return models.APIResponse(message=f"Image repository {repo_data.name} created successfully")
    except Exception as e:
        logger.error(f"Error creating image repository: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create image repository: {str(e)}")

@app.delete("/api/image-repositories/{repository_name}")
async def delete_image_repository(
    repository_name: str,
    database_name: str = None,
    schema_name: str = None,
    current_user: dict = Depends(auth.get_current_user)
):
    """Delete an image repository"""
    db = get_database()
    try:
        success = db.drop_image_repository(repository_name, database_name, schema_name)
        if not success:
            raise HTTPException(status_code=500, detail=f"Failed to delete image repository {repository_name}")
        
        return models.APIResponse(message=f"Image repository {repository_name} deleted successfully")
    except Exception as e:
        logger.error(f"Error deleting image repository: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete image repository: {str(e)}")

@app.get("/api/databases")
async def get_databases(
    current_user: dict = Depends(auth.get_current_user)
):
    """Get all available databases"""
    db = get_database()
    try:
        databases = db.get_databases()
        return {"success": True, "data": databases}
    except Exception as e:
        logger.error(f"Error getting databases: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve databases")

@app.get("/api/databases/{database_name}/schemas")
async def get_schemas(
    database_name: str,
    current_user: dict = Depends(auth.get_current_user)
):
    """Get all schemas for a specific database"""
    db = get_database()
    try:
        schemas = db.get_schemas(database_name)
        return {"success": True, "data": schemas}
    except Exception as e:
        logger.error(f"Error getting schemas for database {database_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve schemas for database {database_name}")

# Network Rules Endpoints
@app.get("/api/network-rules")
async def get_network_rules(
    current_user: dict = Depends(auth.get_current_user)
):
    """Get all network rules"""
    db = get_database()
    try:
        rules = db.get_network_rules()
        return {"success": True, "data": rules}
    except Exception as e:
        logger.error(f"Error getting network rules: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve network rules")

@app.post("/api/network-rules")
async def create_network_rule(
    rule_data: models.NetworkRuleCreate,
    current_user: dict = Depends(auth.get_current_user)
):
    """Create a new network rule"""
    db = get_database()
    try:
        success = db.create_network_rule(
            rule_data.name,
            rule_data.type,
            rule_data.mode,
            rule_data.value_list,
            rule_data.comment
        )
        if not success:
            raise HTTPException(status_code=500, detail="Failed to create network rule")
        
        return models.APIResponse(message=f"Network rule {rule_data.name} created successfully")
    except ValueError as e:
        # Client errors (permissions, validation, etc.)
        logger.warning(f"Client error creating network rule: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Server errors
        logger.error(f"Error creating network rule: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create network rule: {str(e)}")

@app.put("/api/network-rules/{rule_name}")
async def update_network_rule(
    rule_name: str,
    rule_data: models.NetworkRuleUpdate,
    current_user: dict = Depends(auth.get_current_user)
):
    """Update an existing network rule"""
    db = get_database()
    try:
        success = db.update_network_rule(
            rule_name,
            rule_data.value_list,
            rule_data.comment
        )
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update network rule")
        
        return models.APIResponse(message=f"Network rule {rule_name} updated successfully")
    except Exception as e:
        logger.error(f"Error updating network rule: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update network rule: {str(e)}")

@app.delete("/api/network-rules/{rule_name}")
async def delete_network_rule(
    rule_name: str,
    current_user: dict = Depends(auth.get_current_user)
):
    """Delete a network rule"""
    db = get_database()
    try:
        success = db.delete_network_rule(rule_name)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete network rule")
        
        return models.APIResponse(message=f"Network rule {rule_name} deleted successfully")
    except ValueError as e:
        # Client errors (rule doesn't exist, not authorized, etc.)
        logger.warning(f"Client error deleting network rule: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Server errors
        logger.error(f"Error deleting network rule: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete network rule: {str(e)}")

@app.get("/api/network-rules/{rule_name}")
async def describe_network_rule(
    rule_name: str,
    current_user: dict = Depends(auth.get_current_user)
):
    """Get detailed information about a network rule"""
    db = get_database()
    try:
        details = db.describe_network_rule(rule_name)
        return {"success": True, "data": details}
    except Exception as e:
        logger.error(f"Error describing network rule: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to describe network rule: {str(e)}")

# Network Policies Endpoints
@app.get("/api/network-policies")
async def get_network_policies(
    current_user: dict = Depends(auth.get_current_user)
):
    """Get all network policies"""
    db = get_database()
    try:
        policies = db.get_network_policies()
        return {"success": True, "data": policies}
    except Exception as e:
        logger.error(f"Error getting network policies: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve network policies")

@app.post("/api/network-policies")
async def create_network_policy(
    policy_data: models.NetworkPolicyCreate,
    current_user: dict = Depends(auth.get_current_user)
):
    """Create a new network policy"""
    db = get_database()
    try:
        success = db.create_network_policy(
            policy_data.name,
            policy_data.allowed_network_rules,
            policy_data.blocked_network_rules,
            policy_data.allowed_ip_list,
            policy_data.blocked_ip_list,
            policy_data.comment
        )
        if not success:
            raise HTTPException(status_code=500, detail="Failed to create network policy")
        
        return models.APIResponse(message=f"Network policy {policy_data.name} created successfully")
    except ValueError as e:
        # Client errors (permissions, validation, etc.)
        logger.warning(f"Client error creating network policy: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Server errors
        logger.error(f"Error creating network policy: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create network policy: {str(e)}")

@app.put("/api/network-policies/{policy_name}")
async def update_network_policy(
    policy_name: str,
    policy_data: models.NetworkPolicyUpdate,
    current_user: dict = Depends(auth.get_current_user)
):
    """Update an existing network policy"""
    db = get_database()
    try:
        success = db.update_network_policy(
            policy_name,
            policy_data.allowed_network_rules,
            policy_data.blocked_network_rules,
            policy_data.allowed_ip_list,
            policy_data.blocked_ip_list,
            policy_data.comment
        )
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update network policy")
        
        return models.APIResponse(message=f"Network policy {policy_name} updated successfully")
    except Exception as e:
        logger.error(f"Error updating network policy: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update network policy: {str(e)}")

@app.delete("/api/network-policies/{policy_name}")
async def delete_network_policy(
    policy_name: str,
    current_user: dict = Depends(auth.get_current_user)
):
    """Delete a network policy"""
    db = get_database()
    try:
        success = db.delete_network_policy(policy_name)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete network policy")
        
        return models.APIResponse(message=f"Network policy {policy_name} deleted successfully")
    except ValueError as e:
        # Client errors (policy attached, doesn't exist, etc.)
        logger.warning(f"Client error deleting network policy: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Server errors
        logger.error(f"Error deleting network policy: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete network policy: {str(e)}")

@app.get("/api/network-policies/{policy_name}")
async def describe_network_policy(
    policy_name: str,
    current_user: dict = Depends(auth.get_current_user)
):
    """Get detailed information about a network policy"""
    db = get_database()
    try:
        details = db.describe_network_policy(policy_name)
        return {"success": True, "data": details}
    except Exception as e:
        logger.error(f"Error describing network policy: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to describe network policy: {str(e)}")

@app.get("/api/debug/policy-details/{policy_name}")
async def debug_policy_details(policy_name: str):
    """Debug endpoint to test policy details"""
    db = get_database()
    try:
        # Test policy details
        details = db.describe_network_policy(policy_name)
        
        # Also get the policy from the list for comparison
        policies = db.get_network_policies()
        policy_info = None
        for policy in policies:
            if policy.get('name') == policy_name:
                policy_info = policy
                break
        
        return {
            "policy_name": policy_name,
            "policy_details": details,
            "policy_from_list": policy_info,
            "all_policies": policies,  # Added this to see all available policies
            "total_policies": len(policies)
        }
    except Exception as e:
        return {"error": f"Failed to get policy details: {str(e)}"}

@app.get("/api/network-policy-help")
async def network_policy_help():
    """Help endpoint explaining network policy deletion restrictions"""
    return {
        "title": "Network Policy Deletion Guidelines",
        "issue": "Cannot delete network policies that are currently attached to the account",
        "explanation": "Snowflake prevents deletion of network policies that are actively being used by the account for security reasons.",
        "solution_steps": [
            "1. Check if the policy is attached to the account using: SHOW PARAMETERS LIKE 'NETWORK_POLICY' IN ACCOUNT",
            "2. If attached, unset it first using: ALTER ACCOUNT UNSET NETWORK_POLICY",  
            "3. Then you can delete the policy using: DROP NETWORK POLICY <policy_name>",
            "4. Alternatively, create a new policy and set it before removing the old one"
        ],
        "sql_examples": {
            "check_current_policy": "SHOW PARAMETERS LIKE 'NETWORK_POLICY' IN ACCOUNT;",
            "unset_policy": "ALTER ACCOUNT UNSET NETWORK_POLICY;",
            "delete_policy": "DROP NETWORK POLICY ALLOW_EXTERNAL_ACCESS;"
        },
        "note": "This is a Snowflake security feature to prevent accidental removal of active network security policies."
    }



@app.get("/api/network-policy-status")
async def get_network_policy_status(
    current_user: dict = Depends(auth.get_current_user)
):
    """Get the currently active network policy"""
    db = get_database()
    try:
        current_policy = db.get_current_network_policy()
        return {
            "current_policy": current_policy,
            "is_enabled": bool(current_policy),
            "message": f"Current network policy: {current_policy}" if current_policy else "No network policy currently enabled"
        }
    except Exception as e:
        logger.error(f"Error getting network policy status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get network policy status: {str(e)}")

@app.post("/api/network-policies/{policy_name}/enable")
async def enable_network_policy(
    policy_name: str,
    current_user: dict = Depends(auth.get_current_user)
):
    """Enable (attach) a network policy to the account"""
    db = get_database()
    try:
        success = db.enable_network_policy(policy_name)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to enable network policy")
        
        return models.APIResponse(message=f"Network policy {policy_name} enabled successfully")
    except ValueError as e:
        # Client errors (policy doesn't exist, not authorized, etc.)
        logger.warning(f"Client error enabling network policy: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Server errors
        logger.error(f"Error enabling network policy: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to enable network policy: {str(e)}")

@app.post("/api/network-policies/disable")
async def disable_network_policy(
    current_user: dict = Depends(auth.get_current_user)
):
    """Disable (unset) the current network policy from the account"""
    db = get_database()
    try:
        success = db.disable_network_policy()
        if not success:
            raise HTTPException(status_code=500, detail="Failed to disable network policy")
        
        return models.APIResponse(message="Network policy disabled successfully")
    except ValueError as e:
        # Client errors (not authorized, etc.)
        logger.warning(f"Client error disabling network policy: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Server errors
        logger.error(f"Error disabling network policy: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to disable network policy: {str(e)}")

@app.get("/api/debug/network-policy-status")
async def debug_network_policy_status():
    """Debug endpoint to test network policy status without authentication"""
    db = get_database()
    try:
        current_policy = db.get_current_network_policy()
        return {
            "current_policy": current_policy,
            "is_enabled": bool(current_policy),
            "message": f"Current network policy: {current_policy}" if current_policy else "No network policy currently enabled"
        }
    except Exception as e:
        logger.error(f"Error getting network policy status: {e}")
        return {"error": f"Failed to get network policy status: {str(e)}"}

# --- Analytics Endpoints ---
@app.post("/api/analytics/credit-usage", response_model=List[models.CreditUsage])
async def get_credit_usage(
    filter_params: models.CreditUsageFilter,
    current_user: dict = Depends(auth.get_current_user)
):
    """Get credit usage data for compute pools"""
    db = get_database()
    try:
        usage_data = db.get_credit_usage(
            start_date=filter_params.start_date,
            end_date=filter_params.end_date,
            period_type=filter_params.period_type,
            compute_pool_names=filter_params.compute_pool_names
        )
        
        credit_usage = []
        for usage in usage_data:
            credit = models.CreditUsage(
                compute_pool_name=usage['compute_pool_name'],
                date=usage['date'],
                credits_used=usage['credits_used'],
                credits_billed=usage['credits_billed'],
                period_type=usage['period_type']
            )
            credit_usage.append(credit)
        
        return credit_usage
    except Exception as e:
        logger.error(f"Error getting credit usage: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve credit usage data")

@app.post("/api/analytics/credit-usage-summary")
async def get_credit_usage_summary(
    filter_params: models.CreditUsageFilter,
    current_user: dict = Depends(auth.get_current_user)
):
    """Get credit usage summary for compute pools"""
    db = get_database()
    try:
        summary_data = db.get_credit_usage_summary(
            start_date=filter_params.start_date,
            end_date=filter_params.end_date,
            period_type=filter_params.period_type,
            compute_pool_names=filter_params.compute_pool_names
        )
        
        return {"success": True, "data": summary_data}
    except Exception as e:
        logger.error(f"Error getting credit usage summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve credit usage summary")

@app.post("/api/analytics/daily-credit-rollup")
async def get_daily_credit_rollup(
    filter_params: models.CreditUsageFilter,
    current_user: dict = Depends(auth.get_current_user)
):
    """Get daily credit usage rollup with aggregated metrics"""
    try:
        db = get_database()
        
        start_date = None
        end_date = None
        if filter_params.start_date:
            start_date = datetime.fromisoformat(filter_params.start_date.replace('Z', '+00:00'))
        if filter_params.end_date:
            end_date = datetime.fromisoformat(filter_params.end_date.replace('Z', '+00:00'))
        
        rollup_data = db.get_daily_credit_rollup(
            start_date=start_date,
            end_date=end_date,
            compute_pool_names=filter_params.compute_pool_names
        )
        
        return {
            "period_type": "daily_rollup",
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "data": rollup_data
        }
    except Exception as e:
        logger.error(f"Error in daily credit rollup endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve daily credit rollup: {str(e)}")

@app.post("/api/analytics/hourly-heatmap")
async def get_hourly_heatmap(
    filter_params: models.CreditUsageFilter,
    current_user: dict = Depends(auth.get_current_user)
):
    """Get hourly credit usage data for heatmap visualization"""
    try:
        db = get_database()
        
        start_date = None
        end_date = None
        if filter_params.start_date:
            start_date = datetime.fromisoformat(filter_params.start_date.replace('Z', '+00:00'))
        if filter_params.end_date:
            end_date = datetime.fromisoformat(filter_params.end_date.replace('Z', '+00:00'))
        
        heatmap_data = db.get_hourly_heatmap_data(
            start_date=start_date,
            end_date=end_date,
            compute_pool_names=filter_params.compute_pool_names
        )
        
        return {
            "period_type": "hourly_heatmap", 
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "data": heatmap_data
        }
    except Exception as e:
        logger.error(f"Error in hourly heatmap endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve hourly heatmap: {str(e)}")

# --- Warehouse Analytics Endpoints ---
@app.post("/api/analytics/warehouse-credit-usage")
async def get_warehouse_credit_usage(
    filter_params: models.CreditUsageFilter,
    current_user: dict = Depends(auth.get_current_user)
):
    """Get credit usage data for warehouses"""
    db = get_database()
    try:
        logger.info(f"Warehouse credit usage request: {filter_params}")
        
        start_date = None
        end_date = None
        if filter_params.start_date:
            # Handle both string and datetime inputs
            if isinstance(filter_params.start_date, str):
                start_date = datetime.fromisoformat(filter_params.start_date.replace('Z', '+00:00'))
            else:
                start_date = filter_params.start_date
        if filter_params.end_date:
            # Handle both string and datetime inputs
            if isinstance(filter_params.end_date, str):
                end_date = datetime.fromisoformat(filter_params.end_date.replace('Z', '+00:00'))
            else:
                end_date = filter_params.end_date
        
        logger.info(f"Parsed dates: start={start_date}, end={end_date}, period={filter_params.period_type}, warehouses={filter_params.compute_pool_names}")
        
        usage_data = db.get_warehouse_credit_usage(
            start_date=start_date,
            end_date=end_date,
            period_type=filter_params.period_type,
            warehouse_names=filter_params.compute_pool_names  # Reuse the filter field for warehouse names
        )
        
        logger.info(f"Warehouse query completed successfully: {len(usage_data)} records")
        return usage_data
    except Exception as e:
        logger.error(f"Error getting warehouse credit usage: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to retrieve warehouse credit usage data")

@app.post("/api/analytics/warehouse-credit-usage-summary")
async def get_warehouse_credit_usage_summary(
    filter_params: models.CreditUsageFilter,
    current_user: dict = Depends(auth.get_current_user)
):
    """Get warehouse credit usage summary"""
    db = get_database()
    try:
        # Handle both string and datetime inputs for start_date and end_date
        start_date = filter_params.start_date
        end_date = filter_params.end_date
        
        if isinstance(filter_params.start_date, str):
            start_date = datetime.fromisoformat(filter_params.start_date.replace('Z', '+00:00'))
        if isinstance(filter_params.end_date, str):
            end_date = datetime.fromisoformat(filter_params.end_date.replace('Z', '+00:00'))
        
        summary = db.get_warehouse_credit_usage_summary(
            start_date=start_date,
            end_date=end_date,
            period_type=filter_params.period_type,
            warehouse_names=filter_params.compute_pool_names  # Reuse field for warehouse names
        )
        
        return {"success": True, "data": summary}
    except Exception as e:
        logger.error(f"Error getting warehouse credit usage summary: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to retrieve warehouse credit usage summary")

# Storage Analytics Endpoints
@app.post("/api/analytics/storage-usage")
async def get_storage_usage(
    filter_params: models.CreditUsageFilter,
    current_user: dict = Depends(auth.get_current_user)
):
    """Get storage usage data"""
    db = get_database()
    try:
        # Handle both string and datetime inputs for start_date and end_date
        start_date = filter_params.start_date
        end_date = filter_params.end_date
        
        if isinstance(filter_params.start_date, str):
            start_date = datetime.fromisoformat(filter_params.start_date.replace('Z', '+00:00'))
        if isinstance(filter_params.end_date, str):
            end_date = datetime.fromisoformat(filter_params.end_date.replace('Z', '+00:00'))
        
        logger.info(f"Storage usage request: start_date={start_date} end_date={end_date} period_type='{filter_params.period_type}'")
        
        storage_usage = db.get_storage_usage(
            start_date=start_date,
            end_date=end_date,
            period_type=filter_params.period_type
        )
        
        logger.info(f"Storage usage query completed successfully: {len(storage_usage)} records")
        return {"success": True, "data": storage_usage}
    except Exception as e:
        logger.error(f"Error getting storage usage: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to retrieve storage usage data")

@app.post("/api/analytics/storage-usage-summary")
async def get_storage_usage_summary(
    filter_params: models.CreditUsageFilter,
    current_user: dict = Depends(auth.get_current_user)
):
    """Get storage usage summary"""
    db = get_database()
    try:
        # Handle both string and datetime inputs for start_date and end_date
        start_date = filter_params.start_date
        end_date = filter_params.end_date
        
        if isinstance(filter_params.start_date, str):
            start_date = datetime.fromisoformat(filter_params.start_date.replace('Z', '+00:00'))
        if isinstance(filter_params.end_date, str):
            end_date = datetime.fromisoformat(filter_params.end_date.replace('Z', '+00:00'))
        
        summary = db.get_storage_usage_summary(
            start_date=start_date,
            end_date=end_date,
            period_type=filter_params.period_type
        )
        
        return {"success": True, "data": summary}
    except Exception as e:
        logger.error(f"Error getting storage usage summary: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to retrieve storage usage summary")

@app.post("/api/analytics/database-storage-usage")
async def get_database_storage_usage(
    filter_params: models.CreditUsageFilter,
    current_user: dict = Depends(auth.get_current_user)
):
    """Get database storage usage data"""
    db = get_database()
    try:
        # Handle both string and datetime inputs for start_date and end_date
        start_date = filter_params.start_date
        end_date = filter_params.end_date
        
        if isinstance(filter_params.start_date, str):
            start_date = datetime.fromisoformat(filter_params.start_date.replace('Z', '+00:00'))
        if isinstance(filter_params.end_date, str):
            end_date = datetime.fromisoformat(filter_params.end_date.replace('Z', '+00:00'))
        
        logger.info(f"Database storage usage request: start_date={start_date} end_date={end_date} period_type='{filter_params.period_type}' databases={filter_params.compute_pool_names}")
        
        database_storage = db.get_database_storage_usage(
            start_date=start_date,
            end_date=end_date,
            period_type=filter_params.period_type,
            database_names=filter_params.compute_pool_names  # Reuse field for database names
        )
        
        logger.info(f"Database storage usage query completed successfully: {len(database_storage)} records")
        return {"success": True, "data": database_storage}
    except Exception as e:
        logger.error(f"Error getting database storage usage: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve database storage usage data")

# Test endpoint for network rules debugging  
@app.get("/api/debug/network-rules")
async def debug_network_rules():
    """Debug endpoint to check network rules connectivity and privileges"""
    db = get_database()
    try:
        # Test basic connectivity
        test_query = "SELECT CURRENT_USER(), CURRENT_ROLE(), CURRENT_ACCOUNT()"
        basic_info = db.execute_query(test_query)
        
        # Test if we can show network rules
        try:
            rules_query = "SHOW NETWORK RULES IN ACCOUNT"
            rules = db.execute_query(rules_query)
            network_rules_status = f"SUCCESS: Found {len(rules)} network rules"
        except Exception as e:
            network_rules_status = f"ERROR: {str(e)}"
            
        # Test if we can show network policies
        try:
            policies_query = "SHOW NETWORK POLICIES IN ACCOUNT"  
            policies = db.execute_query(policies_query)
            network_policies_status = f"SUCCESS: Found {len(policies)} network policies"
        except Exception as e:
            network_policies_status = f"ERROR: {str(e)}"
            
        return {
            "basic_info": basic_info[0] if basic_info else "No basic info",
            "network_rules_status": network_rules_status,
            "network_policies_status": network_policies_status
        }
    except Exception as e:
        return {"error": f"Database connection failed: {str(e)}"}

@app.get("/api/debug/rule-details")
async def debug_rule_details():
    """Debug endpoint to test rule details"""
    db = get_database()
    try:
        # Get first rule
        rules = db.get_network_rules()
        if rules:
            first_rule = rules[0]
            rule_name = first_rule.get('name')
            
            # Test rule details
            if rule_name:
                details = db.describe_network_rule(rule_name)
                return {
                    "rule_list_sample": first_rule,
                    "rule_details": details,
                    "total_rules": len(rules)
                }
            else:
                return {"error": "No rule name found"}
        else:
            return {"error": "No rules found"}
    except Exception as e:
        return {"error": f"Failed to get rule details: {str(e)}"}

@app.get("/api/debug/rule-qualified-name/{rule_name}")
async def debug_rule_qualified_name(rule_name: str):
    """Debug endpoint to test qualified name building for network rules"""
    db = get_database()
    try:
        # Get all rules
        rules = db.get_network_rules()
        
        # Find the specific rule
        rule_info = None
        for rule in rules:
            if rule.get('name') == rule_name:
                rule_info = rule
                break
        
        if not rule_info:
            return {"error": f"Rule {rule_name} not found"}
        
        # Build qualified name
        database_name = rule_info.get('database_name', '')
        schema_name = rule_info.get('schema_name', '')
        
        if database_name and schema_name:
            qualified_name = f"{database_name}.{schema_name}.{rule_name}"
        else:
            qualified_name = rule_name
            
        return {
            "rule_name": rule_name,
            "database_name": database_name,
            "schema_name": schema_name,
            "qualified_name": qualified_name,
            "rule_info": rule_info
        }
    except Exception as e:
        return {"error": f"Failed to get qualified name: {str(e)}"}

@app.get("/api/debug/create-test-policy")
async def debug_create_test_policy():
    """Debug endpoint to create a test policy with network rules"""
    db = get_database()
    try:
        # Create test policy with network rules
        test_policy_data = {
            "allowed_network_rules": ["SLACK_ACCESS_RULE"],
            "blocked_network_rules": [],
            "allowed_ip_list": ["192.168.1.0/24"],
            "blocked_ip_list": [],
            "comment": "Test policy for debugging"
        }
        
        result = db.create_network_policy("TEST_DEBUG_POLICY", test_policy_data)
        
        if result:
            # Now describe it to see the field names
            details = db.describe_network_policy("TEST_DEBUG_POLICY")
            return {
                "created": True,
                "policy_details": details
            }
        else:
            return {"created": False, "error": "Failed to create test policy"}
        
    except Exception as e:
        return {"error": f"Failed to create test policy: {str(e)}"}

@app.get("/api/debug/policy-details/{policy_name}")
async def debug_policy_details(policy_name: str):
    """Debug endpoint to test policy details"""
    db = get_database()
    try:
        # Test policy details
        details = db.describe_network_policy(policy_name)
        
        # Also get the policy from the list for comparison
        policies = db.get_network_policies()
        policy_info = None
        for policy in policies:
            if policy.get('name') == policy_name:
                policy_info = policy
                break
        
        return {
            "policy_name": policy_name,
            "policy_details": details,
            "policy_from_list": policy_info,
            "all_policies": policies,  # Added this to see all available policies
            "total_policies": len(policies)
        }
    except Exception as e:
        return {"error": f"Failed to get policy details: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    
    # Check database connection before starting the server
    check_database_connection()
    
    logger.info("🚀 Starting FastAPI server...")
    logger.info("📡 Backend will be available at: http://localhost:8000")
    logger.info("📚 API Documentation at: http://localhost:8000/docs")
    logger.info("🛑 Press Ctrl+C to stop the server")
    
    uvicorn.run(app, host="0.0.0.0", port=8000) 