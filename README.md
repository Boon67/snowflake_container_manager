# Snowflake Container Manager

A comprehensive Snowflake management system for container services, compute pools, network security, analytics, and configuration management. Built with FastAPI and React, featuring Snowflake-native authentication and modern UI components.

## Features

### ☁️ **Container Services Management**
- Monitor and manage container services
- Compute pool creation and management
- Image repository and container image tracking
- Service status monitoring and control

### 🔒 **Network Security**
- Network policies management with detailed information
- Network rules configuration and monitoring
- Policy status tracking and tooltips with detailed descriptions
- Sortable tables with comprehensive policy data

### 📊 **Analytics Dashboard**
- Real-time credit usage tracking (compute pools and warehouses)
- Storage usage analytics with database breakdowns
- Monthly/weekly/daily reporting periods
- Interactive charts and summary statistics

### ⚙️ **Solution Configuration Management**
- Create and manage configuration solutions
- Dynamic key-value parameter storage with tagging
- API key generation for third-party access
- Export configurations in multiple formats (JSON, YAML, ENV, Properties)

### 🏷️ **Tag Management**
- Create and manage tags for organization
- Associate tags with parameters
- Expandable tag views with parameter listings

### 🔐 **Security**
- **Snowflake-native authentication** - No separate user management
- Remember account and username preferences
- API keys for secure third-party configuration access
- Secret parameters with plaintext export for environment configs

### 🎨 **Modern UI**
- Clean header-only navigation (no sidebar)
- Dark/Light theme toggle in user preferences
- Responsive design with Ant Design components
- User preferences dropdown menu

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │  FastAPI        │    │   Snowflake     │
│   (Frontend)    │◄──►│  (Backend)      │◄──►│   (Database)    │
│                 │    │                 │    │                 │
│ • Overview      │    │ • Snowflake Auth│    │ • Native Tables │
│ • Solutions     │    │ • Container APIs│    │ • Compute Pools │
│ • Containers    │    │ • Network APIs  │    │ • Images/Repos  │
│ • Network Sec   │    │ • Analytics APIs│    │ • Network Policies
│ • Analytics     │    │ • Config Export │    │ • Usage Data    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Database Schema

The application uses Snowflake's native container and compute functionality plus custom configuration tables:

```sql
-- Custom Configuration Tables
SOLUTIONS (ID, NAME, DESCRIPTION, CREATED_AT, UPDATED_AT)
PARAMETERS (ID, KEY, VALUE, DESCRIPTION, IS_SECRET, NAME, CREATED_AT, UPDATED_AT)
SOLUTION_PARAMETERS (SOLUTION_ID, PARAMETER_ID)
TAGS (ID, NAME, CREATED_AT)
PARAMETER_TAGS (PARAMETER_ID, TAG_ID)
SOLUTION_API_KEYS (ID, SOLUTION_ID, KEY_NAME, API_KEY, IS_ACTIVE, CREATED_AT, LAST_USED, EXPIRES_AT)

-- Snowflake Native Resources (accessed via SQL)
-- SHOW COMPUTE POOLS
-- SHOW CONTAINER SERVICES  
-- SHOW IMAGE REPOSITORIES
-- SHOW IMAGES IN REPOSITORY
-- SHOW NETWORK POLICIES
-- SHOW NETWORK RULES
-- ACCOUNT_USAGE views for analytics
```

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Snowflake account with container services enabled
- Snowflake keypair authentication setup (see `docs/KEYPAIR_SETUP.md`)

### 1. Environment Setup
```bash
# Clone and setup
git clone https://github.com/Boon67/snowflake_container_manager.git
cd snowflake_container_manager

# Copy environment template
cp .env.example backend/.env
```

### 2. Configure Snowflake Authentication
```bash
# Edit backend/.env with your Snowflake credentials
SNOWFLAKE_ACCOUNT=your_account
SNOWFLAKE_USER=your_username
SNOWFLAKE_WAREHOUSE=your_warehouse
SNOWFLAKE_DATABASE=APPS
SNOWFLAKE_SCHEMA=CONFIG

# Keypair Authentication (recommended)
SNOWFLAKE_PRIVATE_KEY_PATH=secrets/snowflake_private_key.pem
# SNOWFLAKE_PRIVATE_KEY_PASSPHRASE=optional_passphrase

# JWT Secret for session management
SECRET_KEY=your_secret_key_here
```

**Note**: The application will automatically create the `APPS` database and `CONFIG` schema if they don't exist.

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
# API docs at http://localhost:8000/docs
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

## Usage

### Authentication
1. Navigate to `http://localhost:3000`
2. Login with your Snowflake credentials
3. Account name is remembered automatically
4. Optional username remembering with checkbox

### Configuration Export
Generate API keys for third-party access to your configurations:

1. Go to **Solutions** → Edit a solution → **API Keys** tab
2. Click **Generate API Key**
3. Copy the generated key
4. Use the public endpoint:
   ```
   GET /api/public/solutions/config?api_key=YOUR_KEY&format=json
   ```

**Available formats**: `json`, `yaml`, `env`, `properties`

**Example response** (simple key-value pairs with secrets included):
```json
{
  "app_name": "Configuration Manager",
  "environment": "production",
  "secret_key": "actual-secret-value",
  "db_connection_timeout": "30"
}
```

### Tab Navigation
- **Overview**: Dashboard with system statistics
- **Solutions**: Configuration management with parameters and tags
- **Container Services**: Compute pools, image repositories, container images
- **Network Security**: Network policies and rules management
- **Analytics**: Credit usage, storage analytics, and reporting

### User Preferences
Click on your user icon in the header to access:
- **Theme Toggle**: Switch between light and dark modes
- **Logout**: Sign out of the application

## Development

### Project Structure
```
snowflake_container_manager/
├── backend/
│   ├── main.py              # FastAPI application with all endpoints
│   ├── models.py            # Pydantic data models
│   ├── database.py          # Snowflake connection and queries
│   ├── auth.py              # Snowflake authentication
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Environment variables
│   ├── .venv/               # Python virtual environment
│   └── secrets/             # Private keys for keypair auth
├── frontend/                # React TypeScript app
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Dashboard.tsx           # Main layout (header-only)
│   │   │   ├── Overview.tsx            # Dashboard overview
│   │   │   ├── SolutionManager.tsx     # Solutions and configuration
│   │   │   ├── ContainerServiceManager.tsx # Container services
│   │   │   ├── NetworkManager.tsx      # Network security
│   │   │   ├── Analytics.tsx           # Analytics dashboard
│   │   │   └── Login.tsx               # Snowflake authentication
│   │   ├── services/        # API service layer
│   │   ├── contexts/        # React contexts (Auth, Theme)
│   │   └── App.tsx          # Main app component
│   ├── package.json         # Node dependencies (with proxy config)
│   └── tsconfig.json        # TypeScript config
├── docs/                    # Documentation
│   └── KEYPAIR_SETUP.md     # Snowflake keypair setup guide
├── setup.sh                 # Setup script
├── start.sh                 # Start script
└── dev.sh                   # Development backend script
```

### Key Features Implemented
- ✅ Snowflake-native authentication (no separate user management)
- ✅ Simple key-value configuration export with secrets
- ✅ Header-only navigation (sidebar removed)
- ✅ User preferences dropdown with theme toggle
- ✅ Tag management with expandable parameter views
- ✅ Network policy tooltips with detailed information
- ✅ Analytics tab moved to last position
- ✅ Comprehensive container services management
- ✅ API key generation for third-party access

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

## API Endpoints

### Authentication
- `POST /api/token` - Snowflake authentication
- `GET /api/user/me` - Get current user info

### Public Configuration Access
- `GET /api/public/solutions/config` - Export solution config (requires API key)

### Solutions & Configuration
- `GET /api/solutions` - List solutions
- `POST /api/solutions` - Create solution
- `GET /api/parameters` - List parameters
- `GET /api/tags` - List tags

### Container Services
- `GET /api/compute-pools` - List compute pools
- `GET /api/container-services` - List container services
- `GET /api/image-repositories` - List image repositories
- `GET /api/images` - List container images

### Network Security
- `GET /api/network-policies` - List network policies
- `GET /api/network-rules` - List network rules

### Analytics
- `POST /api/analytics/credit-usage` - Get credit usage data
- `POST /api/analytics/storage-usage` - Get storage usage data
- `POST /api/analytics/warehouse-credit-usage` - Get warehouse credit usage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Your License Here]