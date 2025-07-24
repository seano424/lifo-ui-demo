#!/bin/bash

echo "🚀 LIFO AI Authenticated API Testing Setup"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "test_auth_helper.py" ]; then
    echo "❌ Please run this script from the lifo-app root directory"
    exit 1
fi

# Setup virtual environment and install dependencies
echo "📦 Setting up virtual environment and dependencies..."

# Check if lifo_api virtual environment exists
if [ ! -d "lifo_api/.venv" ]; then
    echo "❌ Virtual environment not found in lifo_api/.venv"
    echo "Please setup the API environment first:"
    echo "cd lifo_api && uv venv && source .venv/bin/activate && uv pip install -r requirements.txt"
    exit 1
fi

# Activate virtual environment and install testing dependencies
cd lifo_api

echo "Installing testing dependencies with uv..."
uv pip install PyJWT[cryptography] requests python-dotenv

source .venv/bin/activate

# Go back to root directory but keep venv activated
cd ..

# Check for environment files
echo "🔍 Checking environment configuration..."
if [ -f ".env.local" ]; then
    echo "✅ Found .env.local"
    # Export environment variables for the scripts
    export $(grep -v '^#' .env.local | xargs)
elif [ -f "lifo_api/.env.local" ]; then
    echo "✅ Found lifo_api/.env.local"
    export $(grep -v '^#' lifo_api/.env.local | xargs)
else
    echo "⚠️ No .env.local file found. Environment variables may not be loaded."
fi

# Check if the API server is running
echo "🔍 Checking if API server is running..."
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo "✅ API server is running"
else
    echo "⚠️ API server not detected. Starting it..."
    
    # Start API server in background (venv already activated)
    echo "📡 Starting API server..."
    cd lifo_api
    uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload &
    API_PID=$!
    echo "API Server PID: $API_PID"
    cd ..
    
    # Wait for server to start
    echo "⏳ Waiting for server to start..."
    sleep 5
    
    # Check if server started successfully
    if curl -s http://localhost:8001/health > /dev/null 2>&1; then
        echo "✅ API server started successfully"
    else
        echo "❌ Failed to start API server"
        kill $API_PID 2>/dev/null
        exit 1
    fi
fi

# Generate authentication tokens (using activated venv)
echo "🎫 Generating authentication tokens..."
python test_auth_helper.py

if [ $? -eq 0 ]; then
    echo "✅ Authentication tokens generated"
else
    echo "❌ Failed to generate authentication tokens"
    echo "Check your .env.local file for SUPABASE_JWT_SECRET"
    echo "Current SUPABASE_JWT_SECRET: ${SUPABASE_JWT_SECRET:0:20}..." 
    exit 1
fi

# Run authenticated API tests (using activated venv)
echo "🧪 Running authenticated API tests..."
python test_api_with_auth.py

# Save test results
echo "💾 Test results saved"

# Clean up (optional - comment out if you want to keep server running)
if [ ! -z "$API_PID" ]; then
    echo "🧹 Cleaning up..."
    echo "Stopping API server (PID: $API_PID)"
    kill $API_PID 2>/dev/null
fi

# Deactivate virtual environment
deactivate 2>/dev/null

echo ""
echo "🎉 Testing completed!"
echo ""
echo "📋 Next steps:"
echo "1. Check the test output above for any failures"
echo "2. If tests fail with 401 errors, check your SUPABASE_JWT_SECRET"
echo "3. If tests fail with 500 errors, check the API server logs"
echo "4. Use the generated tokens in /tmp/lifo_test_tokens.json for manual testing"
echo ""
echo "🔧 Manual testing example:"
echo "# Activate environment first:"
echo "cd lifo_api && source .venv/bin/activate"
echo '# Then test:'
echo 'TOKEN=$(cat /tmp/lifo_test_tokens.json | jq -r .user_token)'
echo 'curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/stores'
echo ""
echo "📁 Environment files checked:"
if [ -f ".env.local" ]; then
    echo "✅ .env.local (root)"
fi
if [ -f "lifo_api/.env.local" ]; then
    echo "✅ lifo_api/.env.local" 
fi