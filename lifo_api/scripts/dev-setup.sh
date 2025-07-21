#!/bin/bash
# Development setup script for LIFO API

set -e

echo "🚀 Setting up LIFO API development environment..."

# Install uv if not already installed
if ! command -v uv &> /dev/null; then
    echo "📦 Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
fi

# Create virtual environment and install dependencies
echo "📚 Installing dependencies with uv..."
uv sync --dev

echo "🔍 Running initial code quality checks..."
uv run ruff check .
uv run ruff format --check .
uv run mypy .

echo "🧪 Running tests..."
uv run pytest

echo "✅ Development environment setup complete!"
echo ""
echo "To activate the virtual environment:"
echo "  source .venv/bin/activate"
echo ""
echo "Available commands:"
echo "  uv run ruff check .           # Check code quality"
echo "  uv run ruff format .          # Format code"  
echo "  uv run ruff check --fix .     # Fix auto-fixable issues"
echo "  uv run mypy .                 # Type checking"
echo "  uv run pytest                 # Run tests"
echo "  uv run uvicorn app.main:app --reload  # Run development server"