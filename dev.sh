#!/bin/bash

# Development script for running just the backend server
# Useful for developers who want to run frontend separately

echo "🔧 Starting Configuration Manager Backend (Development Mode)..."

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment not found. Please run ./setup.sh first."
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please run ./setup.sh first."
    exit 1
fi

# Activate virtual environment
echo "🐍 Activating virtual environment..."
source .venv/bin/activate

# Check if dependencies are installed
if ! python -c "import fastapi" &> /dev/null; then
    echo "📦 Installing missing dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt
fi

echo "🚀 Starting backend server..."
echo "📊 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo "💡 Press Ctrl+C to stop the server"
echo ""

# Start the backend server
python main.py 