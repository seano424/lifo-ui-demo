# LIFO AI Engine - Unified Python Setup Guide

## 🎯 Overview

The LIFO AI Engine now uses a **single, unified Python environment** for both the FastAPI backend (`lifo_api`) and the data processing core (`lifo_ai_core`). This eliminates the complexity of managing multiple virtual environments and simplifies development, testing, and deployment.

## ✨ Benefits of Unified Setup

- **🔄 Single Environment**: One virtual environment for all Python components
- **📦 No Duplicate Dependencies**: Optimized dependency management
- **🚀 Simplified Development**: No environment switching required
- **🏗️ Easier Deployment**: Single requirements.txt file
- **🧪 Unified Testing**: Run all tests from one environment
- **⚡ Modern Tooling**: Uses `pyproject.toml` and `uv` for faster installs

## 🚀 Quick Setup (Recommended)

### Automatic Setup Script

```bash
# Run the automated setup script
./scripts/setup-python-env.sh
```

This script will:
- ✅ Check Python 3.12 is installed
- ✅ Create a unified virtual environment (`.venv`)
- ✅ Install all dependencies using `uv` (faster than pip)
- ✅ Install packages in development mode
- ✅ Provide next steps

## 🔧 Manual Setup

### Prerequisites

- **Python 3.12+** (specified in `.python-version`)
- **Git** for version control

### Step 1: Create Virtual Environment

```bash
# Create virtual environment
python3.12 -m venv .venv

# Activate it
source .venv/bin/activate  # Linux/macOS
# or
.venv\Scripts\activate     # Windows
```

### Step 2: Install Dependencies

```bash
# Upgrade pip and install uv (faster dependency resolver)
pip install --upgrade pip uv

# Install all dependencies
uv pip install -r requirements.txt

# Install packages in development mode (for proper imports)
uv pip install -e .
```

### Step 3: Verify Installation

```bash
# Check Python packages are accessible
python -c "from lifo_api.app.main import app; print('✅ lifo_api imports work')"
python -c "from lifo_ai_core.etl.processor import CSVProcessor; print('✅ lifo_ai_core imports work')"
```

## 📁 New Project Structure

```
lifo-app/
├── requirements.txt              # 🆕 Unified dependencies
├── pyproject.toml               # 🆕 Modern Python project config
├── .python-version              # 🆕 Python version (3.12)
├── ruff.toml                    # 🆕 Unified linting config
├── mypy.ini                     # 🆕 Unified type checking
├── .venv/                       # ✨ Single virtual environment
├── lifo_api/                    # FastAPI backend
│   ├── app/                     # Application code
│   ├── tests/                   # API tests
│   ├── requirements.txt.backup  # 📄 Backup of old requirements
│   ├── ruff.toml.backup        # 📄 Backup of old config
│   └── mypy.ini.backup         # 📄 Backup of old config
├── lifo_ai_core/               # Data processing core
│   ├── etl/                    # ETL modules
│   ├── database/               # Database operations
│   ├── utils/                  # Utilities
│   └── requirements.txt.backup # 📄 Backup of old requirements
└── scripts/
    └── setup-python-env.sh    # 🆕 Automated setup script
```

## 🏃‍♂️ Development Workflow

### Running the Application

```bash
# Activate environment (if not already active)
source .venv/bin/activate

# Run FastAPI development server
cd lifo_api
python -m uvicorn app.main:app --reload --port 8000

# Or run with hot reload for both API and core changes
uvicorn app.main:app --reload --reload-dir ../lifo_ai_core
```

### Running Tests

```bash
# All tests
pytest

# API tests only
pytest lifo_api/tests/

# Core tests only (if they exist)
pytest lifo_ai_core/tests/

# With coverage
pytest --cov=lifo_api --cov=lifo_ai_core --cov-report=html
```

### Code Quality

```bash
# Linting (unified config)
ruff check .
ruff check . --fix  # Auto-fix issues

# Type checking (unified config)
mypy .

# Format code
ruff format .
```

## 🔄 Migration from Old Setup

### What Changed

| Before | After |
|--------|-------|
| Two `requirements.txt` files | ✨ Single `requirements.txt` |
| Two virtual environments | ✨ Single `.venv` directory |
| Path manipulation for imports | ✨ Proper Python packages |
| Separate ruff/mypy configs | ✨ Unified configuration |
| Manual dependency management | ✨ Modern `pyproject.toml` |

### Import Changes

**Old Import Pattern:**
```python
# lifo_api/app/api/v1/csv_upload.py
sys.path.insert(0, str(lifo_core_path))
from etl.unified_csv_processor import UnifiedCSVProcessor
```

**New Import Pattern:**
```python
# lifo_api/app/api/v1/csv_upload.py
from lifo_ai_core.etl.unified_csv_processor import UnifiedCSVProcessor
```

### Backup Files

All old configuration files have been backed up with `.backup` extension:
- `lifo_api/requirements.txt.backup`
- `lifo_api/ruff.toml.backup`
- `lifo_api/mypy.ini.backup`
- `lifo_ai_core/requirements.txt.backup`

## 🚀 Deployment Changes

### Docker/Production

```dockerfile
# Dockerfile example
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install uv && uv pip install --system -r requirements.txt

COPY . .
RUN pip install -e .

CMD ["uvicorn", "lifo_api.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables

No changes to environment variables - all existing `.env` files continue to work.

## 🧪 Testing the Setup

### Quick Verification

```bash
# Test that both components can import each other
python -c "
import sys
print(f'Python: {sys.version}')

from lifo_api.app.main import app
print('✅ FastAPI app imports successfully')

from lifo_ai_core.etl.unified_csv_processor import UnifiedCSVProcessor
print('✅ CSV processor imports successfully')

from lifo_ai_core.database.operations import InventoryOperations
print('✅ Database operations imports successfully')

print('🎉 All imports working correctly!')
"
```

### Integration Test

```bash
# Run a quick integration test
cd lifo_api
python -c "
from app.api.v1.csv_upload import router
print('✅ CSV upload endpoint can import UnifiedCSVProcessor')
"
```

## 🔧 Troubleshooting

### Common Issues

**❌ Import Error: `ModuleNotFoundError: No module named 'lifo_ai_core'`**
```bash
# Solution: Install in development mode
pip install -e .
```

**❌ `uv` command not found**
```bash
# Solution: Install uv
pip install uv
```

**❌ Python 3.12 not found**
```bash
# Solution: Install Python 3.12
# Ubuntu/Debian:
sudo apt update && sudo apt install python3.12 python3.12-venv

# macOS with Homebrew:
brew install python@3.12

# Windows: Download from python.org
```

**❌ Tests can't find modules**
```bash
# Solution: Run tests from project root, not subdirectories
cd /path/to/lifo-app  # Project root
pytest  # Not from lifo_api or lifo_ai_core subdirectories
```

### Getting Help

1. **Check Virtual Environment**: `which python` should point to `.venv/bin/python`
2. **Check Installed Packages**: `pip list | grep -E "(lifo|fastapi|pandas)"`
3. **Verify Project Structure**: Make sure you're in the project root
4. **Check Import Paths**: Use `python -c "import sys; print(sys.path)"` to debug

## 📚 Related Documentation

- **[Main Documentation Hub](./README.md)** - All documentation
- **[FastAPI Microservice Guide](./COMPREHENSIVE_FASTAPI_MICROSERVICE_DOCUMENTATION.md)** - Complete API documentation
- **[Development Setup](./COMPLETE_SETUP_TESTING_GUIDE.md)** - Full setup including frontend
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment

---

**🎉 Welcome to the unified LIFO AI Engine Python environment!** This setup provides a much cleaner, faster, and more maintainable development experience.