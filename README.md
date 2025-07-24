# Configuration Manager

A full-stack application for managing configuration parameters stored in Snowflake, with a FastAPI backend and React frontend.

## Features

- **Snowflake Integration**: Connects to Snowflake database for configuration storage
- **Automatic Schema Creation**: Creates APP.CONFIG schema and tables on initialization
- **Multi-Table Configuration**: Supports different types of configuration data
- **Web-Based UI**: Modern React frontend with Ant Design components
- **Authentication**: JWT-based authentication with default credentials
- **CRUD Operations**: Full create, read, update, delete functionality
- **Real-time Updates**: Live configuration management

## Architecture

### Backend (FastAPI)
- **Database**: Snowflake with APP.CONFIG schema
- **Tables**:
  - `APP_SETTINGS`: General application configuration (key-value pairs)
  - `DATABASE_SETTINGS`: Database connection configurations
  - `API_SETTINGS`: External API configurations
  - `FEATURE_FLAGS`: Application feature flags with rollout percentages

### Frontend (React)
- **Framework**: React 18 with React Router
- **UI Library**: Ant Design
- **State Management**: React Context API
- **HTTP Client**: Axios

## 🔧 Database Connection Validation

The application now includes robust database connection validation to ensure reliable operation:

### ✅ **Startup Validation**
- **Connection Test**: Validates Snowflake connection on application startup
- **Query Validation**: Executes test query (`SELECT 1`) to ensure database responsiveness  
- **Fail-Fast Behavior**: Application stops with clear error message if database is unreachable
- **Schema Initialization**: Validates schema creation and table setup

### 🏥 **Health Check Enhancement**
- **GET `/api/health`**: Enhanced endpoint with detailed database status
- **Connection Status**: Reports actual connection state
- **Validation Status**: Shows whether database queries are working
- **Degraded State**: Distinguishes between partial and complete failures

```json
{
  "status": "healthy",
  "service": "Configuration Manager", 
  "version": "1.0.0",
  "database": {
    "status": "healthy",
    "connection": true,
    "validation": true
  }
}
```

### 🛡️ **Error Handling**
- **Graceful Failures**: Clear error messages with proper logging
- **Connection Cleanup**: Automatic cleanup of partial connections on failure
- **Detailed Logging**: Step-by-step startup process with emojis for clarity

### 🧪 **Testing**
Run the database validation tests:
```bash
python3 test_db_validation.py
```

This validates:
- ✅ Successful connection scenarios
- ❌ Failed connection handling  
- 🚀 Startup validation process
- 🏥 Health endpoint behavior

---

## Prerequisites

- Python 3.8+
- Node.js 16+
- Snowflake account with appropriate permissions
- Git

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd slack_agent_server
```

### 2. Setup (One-time)

Run the setup script to create virtual environment and install dependencies:

```bash
# Make setup script executable and run it
chmod +x setup.sh
./setup.sh
```

This will:
- Create a Python virtual environment (`.venv`)
- Install all Python dependencies
- Install Node.js dependencies
- Create `.env` file from template
- Create `secrets` directory for keypair files

**Manual Setup (Alternative):**

```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Copy and configure environment variables
cp .env.example .env

# Install frontend dependencies
cd frontend && npm install && cd ..
```

Edit `.env` file with your Snowflake credentials:

```env
SNOWFLAKE_ACCOUNT=your_account.region
SNOWFLAKE_USER=your_username
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=APP
SNOWFLAKE_SCHEMA=CONFIG
SNOWFLAKE_ROLE=ACCOUNTADMIN
SECRET_KEY=your-secret-key-change-in-production
DEFAULT_USERNAME=admin
DEFAULT_PASSWORD=password123
```

**Alternative: Keypair Authentication (More Secure)**

For enhanced security, you can use keypair authentication instead of passwords:

```env
# Comment out SNOWFLAKE_PASSWORD and use these instead:
# SNOWFLAKE_PRIVATE_KEY_PATH=/path/to/your/private_key.p8
# SNOWFLAKE_PRIVATE_KEY_PASSPHRASE=your_key_passphrase_if_encrypted
```

See [Keypair Setup Guide](docs/KEYPAIR_SETUP.md) for detailed instructions.

### 3. Start the Application

**Using the startup script (Recommended):**
```bash
# Start both backend and frontend
./start.sh
```

**Manual startup:**
```bash
# Backend (Terminal 1) - activate virtual environment first
source .venv/bin/activate
python main.py

# Frontend (Terminal 2)
cd frontend && npm start
```

The backend will start at `http://localhost:8000`
The frontend will start at `http://localhost:3000`

## Default Credentials

- **Username**: `admin`
- **Password**: `password123`

## Database Schema

The application automatically creates the following schema in Snowflake:

### APP_SETTINGS
```sql
CREATE TABLE APP_SETTINGS (
    ID NUMBER AUTOINCREMENT PRIMARY KEY,
    CONFIG_KEY VARCHAR(255) NOT NULL UNIQUE,
    CONFIG_VALUE VARCHAR(500),
    CONFIG_TYPE VARCHAR(50) DEFAULT 'string',
    DESCRIPTION VARCHAR(1000),
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    UPDATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);
```

### DATABASE_SETTINGS
```sql
CREATE TABLE DATABASE_SETTINGS (
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
);
```

### API_SETTINGS
```sql
CREATE TABLE API_SETTINGS (
    ID NUMBER AUTOINCREMENT PRIMARY KEY,
    API_NAME VARCHAR(255) NOT NULL UNIQUE,
    ENDPOINT_URL VARCHAR(500),
    API_KEY VARCHAR(255),
    TIMEOUT_SECONDS NUMBER DEFAULT 30,
    RATE_LIMIT NUMBER,
    ACTIVE BOOLEAN DEFAULT TRUE,
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    UPDATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);
```

### FEATURE_FLAGS
```sql
CREATE TABLE FEATURE_FLAGS (
    ID NUMBER AUTOINCREMENT PRIMARY KEY,
    FEATURE_NAME VARCHAR(255) NOT NULL UNIQUE,
    ENABLED BOOLEAN DEFAULT FALSE,
    DESCRIPTION VARCHAR(1000),
    ROLLOUT_PERCENTAGE NUMBER DEFAULT 0,
    ENVIRONMENT VARCHAR(50) DEFAULT 'production',
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    UPDATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with username/password
- `GET /api/auth/me` - Get current user information

### Configuration Management
- `GET /api/config/tables` - Get configuration tables metadata
- `GET /api/config/app-settings` - Get all application settings
- `POST /api/config/app-settings` - Create new application setting
- `PUT /api/config/app-settings/{id}` - Update application setting
- `DELETE /api/config/app-settings/{id}` - Delete application setting

Similar endpoints exist for:
- `/api/config/database-settings`
- `/api/config/api-settings`
- `/api/config/feature-flags`

### Health Check
- `GET /api/health` - System and database health check

## Usage Examples

### Managing Application Settings

1. **Navigate to App Settings**: Click on "App Settings" in the sidebar
2. **Add New Setting**: Click "Add Setting" button
3. **Fill Form**:
   - Configuration Key: `MAX_UPLOAD_SIZE`
   - Value: `10485760`
   - Type: `number`
   - Description: `Maximum file upload size in bytes`
4. **Save**: Click OK to save the setting

### Managing Feature Flags

1. **Navigate to Feature Flags**: Click on "Feature Flags" in the sidebar
2. **Add New Flag**: Click "Add Feature Flag" button
3. **Configure**:
   - Feature Name: `NEW_DASHBOARD`
   - Description: `Enable new dashboard UI`
   - Environment: `development`
   - Rollout Percentage: `25%`
   - Enabled: `true`
4. **Save**: Click OK to create the flag

## Security Considerations

- Change default credentials in production
- Use strong JWT secret key
- **Use keypair authentication for Snowflake** (more secure than passwords)
- Implement proper Snowflake role-based access control
- Use environment variables for sensitive data
- Enable HTTPS in production
- Protect private keys with appropriate file permissions (600)
- Use encrypted private keys with strong passphrases

## Development

### Available Scripts

- `./setup.sh` - One-time setup (creates venv, installs dependencies)
- `./start.sh` - Start both backend and frontend servers
- `./dev.sh` - Start only the backend server (for development)

### Virtual Environment

The project uses a Python virtual environment (`.venv`) to isolate dependencies:

```bash
# Activate virtual environment manually
source .venv/bin/activate

# Deactivate when done
deactivate
```

### Project Structure

```
slack_agent_server/
├── main.py              # FastAPI application
├── database.py          # Snowflake connection and operations
├── models.py           # Pydantic models
├── auth.py             # Authentication logic
├── requirements.txt    # Python dependencies
├── .env               # Environment variables
├── setup.sh           # One-time setup script
├── start.sh           # Start both frontend and backend
├── dev.sh             # Development backend-only script
├── .venv/             # Python virtual environment
├── secrets/           # Private keys and certificates
│   └── README.md      # Secrets management guide
├── docs/
│   └── KEYPAIR_SETUP.md # Keypair authentication guide
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/     # React components
    │   ├── contexts/      # React contexts
    │   ├── services/      # API services
    │   ├── App.js
    │   └── index.js
    ├── package.json
    └── ...
```

### Adding New Configuration Tables

1. **Backend**: Update `database.py` to create new table in `create_config_tables()`
2. **Models**: Add Pydantic models in `models.py`
3. **API**: Add new endpoints in `main.py`
4. **Frontend**: Create new component and add to dashboard routing

## Troubleshooting

### Common Issues

1. **Snowflake Connection Failed**
   - Verify credentials in `.env` file
   - Check network connectivity
   - Ensure Snowflake account is active

2. **Frontend Build Issues**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility

3. **Authentication Issues**
   - Verify JWT secret key is set
   - Check default credentials

### Logs

- Backend logs: Check terminal output where `main.py` is running
- Frontend logs: Check browser console for React errors

## Production Deployment

1. **Environment Variables**: Set production values in `.env`
2. **Build Frontend**: Run `npm run build` in frontend directory
3. **Serve Static Files**: Configure FastAPI to serve React build files
4. **Database**: Ensure Snowflake production environment is configured
5. **Security**: Change default credentials and JWT secret

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check this README first
2. Review the troubleshooting section
3. Check the API documentation at `http://localhost:8000/docs`
4. Submit an issue on GitHub 