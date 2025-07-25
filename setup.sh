#!/bin/bash

# Unified Solution Configuration Manager - Setup Script
# This script sets up the complete development environment

set -e  # Exit on any error

echo "🚀 Setting up Unified Solution Configuration Manager..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ and try again."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ and try again."
    exit 1
fi

echo "✅ Python and Node.js are available"
echo ""

# 1. Create Python virtual environment in backend directory
echo "🐍 Creating Python virtual environment..."
if [ ! -d "backend/.venv" ]; then
    cd backend
    python3 -m venv .venv
    cd ..
    echo "✅ Virtual environment created in backend/.venv"
else
    echo "✅ Virtual environment already exists in backend/.venv"
fi

# 2. Activate virtual environment and install Python dependencies
echo "📦 Installing Python dependencies..."
source backend/.venv/bin/activate
cd backend
pip install --upgrade pip
pip install -r requirements.txt
cd ..
echo "✅ Python dependencies installed"
echo ""

# 3. Setup environment variables
echo "⚙️ Setting up environment configuration..."
if [ ! -f "backend/.env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example backend/.env
        echo "✅ Created backend/.env file from template"
        echo "⚠️  Please edit backend/.env file with your Snowflake credentials before running the application"
    else
        echo "❌ .env.example not found. Please create backend/.env manually."
        exit 1
    fi
else
    echo "✅ backend/.env file already exists"
fi
echo ""

# 4. Install Node.js dependencies
echo "🌐 Installing frontend dependencies..."
cd frontend
npm install
echo "✅ Frontend dependencies installed"
echo ""

# 5. Build frontend for production (optional)
echo "🏗️ Building frontend for production..."
npm run build
echo "✅ Frontend built successfully"
cd ..
echo ""

# 6. Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p secrets
if [ ! -f "secrets/README.md" ]; then
    cat > secrets/README.md << 'EOF'
# Secrets Directory

This directory is for storing sensitive files like:
- Snowflake private keys for keypair authentication
- SSL certificates
- Other sensitive configuration files

## Important Security Notes:
- This directory is in .gitignore to prevent committing secrets
- Set proper file permissions (600) for private keys
- Use strong passphrases for encrypted private keys

## Keypair Authentication Setup:
1. Place your Snowflake private key (PEM format) in this directory
2. Set SNOWFLAKE_PRIVATE_KEY_PATH in .env to point to the key file
3. Set SNOWFLAKE_PRIVATE_KEY_PASSPHRASE if your key is encrypted
4. Set SNOWFLAKE_AUTH_METHOD=keypair in .env

Example .env configuration:
```
SNOWFLAKE_AUTH_METHOD=keypair
SNOWFLAKE_PRIVATE_KEY_PATH=secrets/snowflake_private_key.pem
SNOWFLAKE_PRIVATE_KEY_PASSPHRASE=your_passphrase_if_encrypted
```
EOF
fi
echo "✅ Secrets directory configured"
echo ""

# 7. Display setup completion and next steps
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Edit .env file with your Snowflake credentials:"
echo "   - SNOWFLAKE_ACCOUNT=your_account"
echo "   - SNOWFLAKE_USER=your_username"
echo "   - SNOWFLAKE_PASSWORD=your_password (or use keypair auth)"
echo "   - SNOWFLAKE_WAREHOUSE=your_warehouse"
echo "   - SNOWFLAKE_DATABASE=your_database"
echo ""
echo "2. (Optional) For keypair authentication:"
echo "   - Place private key in secrets/ directory"
echo "   - Set SNOWFLAKE_AUTH_METHOD=keypair in .env"
echo "   - Set SNOWFLAKE_PRIVATE_KEY_PATH and SNOWFLAKE_PRIVATE_KEY_PASSPHRASE"
echo ""
echo "3. Start the application:"
echo "   ./start.sh"
echo ""
echo "4. Access the application:"
echo "   - Backend API: http://localhost:8000"
echo "   - Frontend UI: http://localhost:3000"
echo "   - API Documentation: http://localhost:8000/docs"
echo ""
echo "5. Default login credentials:"
echo "   - Username: admin"
echo "   - Password: admin"
echo ""
echo "📚 For more information, see README.md"
echo ""
echo "🔒 Security Reminder:"
echo "   - Change default credentials in production"
echo "   - Use strong JWT secret key"
echo "   - Consider using keypair authentication for enhanced security"
echo ""
deactivate
echo "✨ Setup complete! Run './start.sh' to start the application." 