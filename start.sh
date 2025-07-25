#!/bin/bash

# Configuration Manager Startup Script

echo "🚀 Starting Configuration Manager..."

# Check if required files exist
if [ ! -f "backend/.env" ]; then
    echo "⚠️  backend/.env file not found. Copying from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example backend/.env
    else
        echo "❌ .env.example file not found. Please create backend/.env manually."
        exit 1
    fi
    echo "✅ Please edit backend/.env file with your Snowflake credentials before running again."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "backend/.venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    cd backend
    python3 -m venv .venv
    cd ..
    echo "✅ Virtual environment created at backend/.venv/"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source backend/.venv/bin/activate

# Check if Python dependencies are installed
if ! python -c "import fastapi" &> /dev/null; then
    echo "📦 Installing Python dependencies..."
    cd backend
    pip install --upgrade pip
    pip install -r requirements.txt
    cd ..
fi

# Check if Node.js dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    cd frontend
    npm install
    cd ..
fi

echo "🔧 Starting backend server..."
# Start backend in background (with virtual environment activated)
cd backend
python3 main.py &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 3

echo "🎨 Starting frontend development server..."
# Start frontend
cd frontend
npm start &
FRONTEND_PID=$!

echo ""
echo "🎉 Configuration Manager is starting up!"
echo ""
echo "📊 Backend API: http://localhost:8000"
echo "🌐 Frontend UI: http://localhost:3000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "🔑 Default Login Credentials:"
echo "   Username: admin"
echo "   Password: password123"
echo ""
echo "💡 Press Ctrl+C to stop both servers"

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup when script is interrupted
trap cleanup SIGINT

# Wait for background processes
wait 