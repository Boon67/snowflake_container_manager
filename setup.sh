#!/bin/bash

# Configuration Manager Setup Script
# Run this script once to set up your development environment

echo "🛠️  Setting up Configuration Manager..."

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed. Please install Node.js 16 or higher."
    exit 1
fi

echo "✅ Python 3 version: $(python3 --version)"
echo "✅ Node.js version: $(node --version)"

# Create virtual environment
if [ ! -d ".venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv .venv
    echo "✅ Virtual environment created at .venv/"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source .venv/bin/activate

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your Snowflake credentials."
else
    echo "✅ .env file already exists"
fi

# Create secrets directory
if [ ! -d "secrets" ]; then
    echo "🔐 Creating secrets directory..."
    mkdir -p secrets
    echo "✅ Secrets directory created"
else
    echo "✅ Secrets directory already exists"
fi

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
    echo "✅ Node.js dependencies installed"
else
    echo "✅ Node.js dependencies already installed"
fi
cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit .env file with your Snowflake credentials"
echo "   2. (Optional) Set up keypair authentication:"
echo "      - Generate keys: openssl genrsa -aes256 -out secrets/snowflake_private_key.p8 2048"
echo "      - See docs/KEYPAIR_SETUP.md for detailed instructions"
echo "   3. Start the application: ./start.sh"
echo ""
echo "📚 Documentation:"
echo "   - README.md - Main documentation"
echo "   - docs/KEYPAIR_SETUP.md - Keypair authentication setup"
echo "   - secrets/README.md - Secrets management guide"
echo ""
echo "🔑 Default credentials:"
echo "   Username: admin"
echo "   Password: password123" 