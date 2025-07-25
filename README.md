# Unified Solution Configuration Manager

A comprehensive solution configuration management system with dynamic tagging and key-value parameter storage, backed by Snowflake and built with FastAPI and React.

## Features

### 🏗️ **Solution Management**
- Create and manage configuration solutions
- Each solution acts as a container for related parameters
- Full CRUD operations with UUID-based identifiers

### ⚙️ **Dynamic Parameters**
- Key-value configuration parameters that can be shared across solutions
- Rich metadata including descriptions and secret marking
- Dynamic tagging system for organization and filtering
- Full-text search capabilities

### 🏷️ **Dynamic Tags**
- Create tags on-the-fly
- Associate multiple tags with parameters
- Use for filtering, organizing, and categorizing configurations
- Bulk tagging and untagging operations

### 🔍 **Advanced Search & Filtering**
- Filter parameters by solution, tags, key patterns
- Search across secret and non-secret parameters
- Bulk operations for mass management

### 🔒 **Security**
- JWT-based authentication
- Mark sensitive parameters as secrets
- Snowflake keypair authentication support (auto-detected)
- Environment-based configuration
- Automatic database and schema creation

### 🎨 **Modern UI**
- Dark-themed responsive interface
- Real-time statistics and overview
- Comprehensive management dashboards
- Built with Ant Design and TypeScript

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │  FastAPI        │    │   Snowflake     │
│   (Frontend)    │◄──►│  (Backend)      │◄──►│   (Database)    │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • Authentication│    │ • SOLUTIONS     │
│ • Solution Mgmt │    │ • CRUD APIs     │    │ • PARAMETERS    │
│ • Parameter Mgmt│    │ • Search/Filter │    │ • TAGS          │
│ • Tag Mgmt      │    │ • Bulk Ops      │    │ • PARAMETER_TAGS│
│ • Auth & Routes │    │ • Health Check  │    │ • USERS         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Database Schema

```sql
-- Solutions: Top-level configuration containers
SOLUTIONS (ID, NAME, DESCRIPTION, CREATED_AT, UPDATED_AT)

-- Parameters: Key-value pairs that can be shared across solutions
PARAMETERS (ID, KEY, VALUE, DESCRIPTION, IS_SECRET, CREATED_AT, UPDATED_AT)

-- Solution-Parameter associations (many-to-many)
SOLUTION_PARAMETERS (SOLUTION_ID, PARAMETER_ID)

-- Tags: Dynamic labels for organization
TAGS (ID, NAME, CREATED_AT)

-- Parameter-Tag relationships
PARAMETER_TAGS (PARAMETER_ID, TAG_ID)

-- Users: Authentication
USERS (ID, USERNAME, HASHED_PASSWORD, CREATED_AT)
```

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Snowflake account with database access

### 1. Environment Setup
```bash
# Clone and setup
git clone <repository>
cd slack_agent_server

# Copy environment template
cp .env.example backend/.env
```

### 2. Configure Environment Variables
```bash
# Edit backend/.env with your Snowflake credentials
SNOWFLAKE_ACCOUNT=your_account
SNOWFLAKE_USER=your_username
SNOWFLAKE_WAREHOUSE=your_warehouse
SNOWFLAKE_DATABASE=your_database
SNOWFLAKE_SCHEMA=CONFIG

# Authentication (choose one method):
# Option 1: Password Authentication
SNOWFLAKE_PASSWORD=your_password

# Option 2: Keypair Authentication (preferred for production)
# SNOWFLAKE_PRIVATE_KEY_PATH=secrets/snowflake_private_key.pem
# SNOWFLAKE_PRIVATE_KEY_PASSPHRASE=optional_passphrase

# Authentication settings
SECRET_KEY=your_secret_key
DEFAULT_USERNAME=admin
DEFAULT_PASSWORD=admin
```

**Note**: The application will automatically create the database and schema if they don't exist, so you only need to ensure your Snowflake user has the necessary permissions.

### 3. Backend Setup
```bash
# Create virtual environment and install dependencies
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt

# Run backend
python main.py
# Backend will be available at http://localhost:8000
```

### 4. Frontend Setup
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm start
# Frontend will be available at http://localhost:3000
```

### 5. Production Deployment
```bash
# Make setup script executable
chmod +x setup.sh

# Run setup (creates venv, installs deps, builds frontend)
./setup.sh

# Start application
./start.sh
```

## Development

### Project Structure
```
slack_agent_server/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── models.py            # Pydantic data models
│   ├── database.py          # Snowflake connection and queries
│   ├── auth.py              # JWT authentication
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Environment variables
│   ├── .venv/               # Python virtual environment
│   └── secrets/             # Private keys for keypair auth
├── frontend/                # React TypeScript app
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API service layer
│   │   ├── contexts/        # React contexts
│   │   └── App.tsx          # Main app component
│   ├── package.json         # Node dependencies
│   └── tsconfig.json        # TypeScript config
├── setup.sh                 # Setup script
├── start.sh                 # Start script
├── dev.sh                   # Development backend script
└── .env.example             # Environment template
```

### Development Scripts

#### Backend Only (Development)
```bash
# Start only the backend server for API development
./dev.sh
```

#### Full Application
```bash
# Start both backend and frontend servers
./start.sh
```

#### Setup Environment
```bash
# Set up development environment
./setup.sh
``` 