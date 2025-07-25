#!/bin/bash

# Unified Solution Configuration Manager - Development Backend Script
# This script starts only the backend server for development

set -e  # Exit on any error

echo "🚀 Starting Configuration Manager Backend (Development Mode)..."
echo ""

# Check if virtual environment exists
if [ ! -d "backend/.venv" ]; then
    echo "❌ Virtual environment not found in backend/.venv. Please run ./setup.sh first."
    exit 1
fi

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo "❌ .env file not found in backend/. Please run ./setup.sh first."
    exit 1
fi

echo "🐍 Activating virtual environment..."
source backend/.venv/bin/activate

echo "⚙️ Loading environment variables..."
export $(cat backend/.env | grep -v '^#' | xargs)

echo "🔧 Starting FastAPI backend server..."
echo "📡 Backend will be available at: http://localhost:8000"
echo "📚 API Documentation at: http://localhost:8000/docs"
echo "🛑 Press Ctrl+C to stop the server"
echo ""

# Start the backend server with auto-reload for development
cd backend
python main.py
cd ..

echo ""
echo "👋 Backend server stopped."
deactivate 