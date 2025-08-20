#!/bin/bash
# LIFO AI Engine - Unified Python Environment Setup
# This script sets up a single Python environment for both lifo_api and lifo_ai_core

set -e  # Exit on any error

echo "🚀 Setting up LIFO AI Engine Python Environment"
echo "================================================"

# Check Python version
if ! command -v python3.12 &> /dev/null; then
    echo "❌ Python 3.12 is required but not found"
    echo "Please install Python 3.12 first"
    exit 1
fi

echo "✅ Python 3.12 found"

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python3.12 -m venv .venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔗 Activating virtual environment..."
source .venv/bin/activate

# Upgrade pip and install uv for faster dependency resolution
echo "⬆️ Upgrading pip and installing uv..."
pip install --upgrade pip
pip install uv

# Install dependencies using uv (much faster than pip)
echo "📚 Installing dependencies..."
uv pip install -r requirements.txt

# Install packages in development mode for easier imports
echo "🔧 Installing packages in development mode..."
uv pip install -e .

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Your unified Python environment is ready!"
echo ""
echo "To activate the environment:"
echo "  source .venv/bin/activate"
echo ""
echo "To run the FastAPI server:"
echo "  cd lifo_api && python -m uvicorn app.main:app --reload"
echo ""
echo "To run tests:"
echo "  pytest                    # All tests"
echo "  pytest lifo_api/tests/   # API tests only"
echo "  pytest lifo_ai_core/     # Core tests only"
echo ""
echo "To check code quality:"
echo "  ruff check .              # Linting"
echo "  mypy .                    # Type checking"
echo ""