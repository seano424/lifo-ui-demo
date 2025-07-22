# Python Development Setup - LIFO.AI

This document describes the modern Python development setup using `uv` and `ruff` for the LIFO.AI project.

## Overview

We've migrated from traditional pip + virtualenv + black/flake8/isort to a modern, fast toolchain:

- **uv**: Ultra-fast Python package installer and resolver (replaces pip + virtualenv)
- **ruff**: Extremely fast Python linter and formatter (replaces black + isort + flake8 + many others)
- **mypy**: Static type checker (unchanged)
- **pytest**: Testing framework (unchanged)

## Prerequisites

### Install uv

```bash
# On macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# On Windows
powershell -c "irm https://astral.sh/uv/install.sh | iex"

# Add to PATH (restart shell or run):
export PATH="$HOME/.cargo/bin:$PATH"
```

## Quick Start

### LIFO AI Core

```bash
cd lifo_ai_core

# Setup development environment
./scripts/dev-setup.sh

# Or manually:
uv sync --dev                    # Install dependencies
uv run ruff check .              # Lint code
uv run ruff format .             # Format code
uv run mypy .                    # Type check
uv run pytest                   # Run tests
```

### LIFO API

```bash
cd lifo_api

# Setup development environment
./scripts/dev-setup.sh

# Run development server
make run
# or: uv run uvicorn app.main:app --reload
```

## Development Commands

Both projects include Makefiles with common commands:

```bash
make help          # Show available commands
make dev-install   # Install development dependencies
make lint          # Run linting
make lint-fix      # Run linting with auto-fix
make format        # Format code
make format-check  # Check code formatting
make type-check    # Run type checking
make test          # Run tests
make test-cov      # Run tests with coverage
make quality       # Run all quality checks
make clean         # Clean up generated files
```

## Project Structure

```
lifo_ai_core/
├── pyproject.toml          # Project configuration & dependencies
├── uv.lock                 # Lock file (auto-generated)
├── Makefile               # Development commands
├── scripts/
│   └── dev-setup.sh       # Development setup script
└── ...

lifo_api/
├── pyproject.toml          # Project configuration & dependencies
├── uv.lock                 # Lock file (auto-generated)
├── Makefile               # Development commands
├── scripts/
│   └── dev-setup.sh       # Development setup script
└── ...
```

## Configuration

### Ruff Configuration

Ruff is configured in each `pyproject.toml` file with:

- **Line length**: 88 characters (Black compatible)
- **Target Python version**: 3.8+
- **Selected rules**: Comprehensive set including:
  - pycodestyle (E, W)
  - pyflakes (F) 
  - isort (I)
  - flake8-bugbear (B)
  - flake8-comprehensions (C4)
  - pyupgrade (UP)
  - pep8-naming (N)
  - flake8-bandit (S) for security
  - And more...

### MyPy Configuration

Type checking is configured with strict settings:
- `check_untyped_defs = true`
- `disallow_untyped_defs = true`
- `disallow_incomplete_defs = true`
- `warn_redundant_casts = true`
- `strict_optional = true`

## Dependency Management

### Adding Dependencies

```bash
# Production dependency
uv add pandas>=2.0.0

# Development dependency  
uv add --dev pytest>=7.0.0

# Optional dependency group
uv add --optional ml scikit-learn>=1.3.0
```

### Updating Dependencies

```bash
uv sync                     # Install/update from lock file
uv lock                     # Update lock file
uv lock --upgrade           # Update all to latest versions
uv lock --upgrade-package pandas  # Update specific package
```

### Removing Dependencies

```bash
uv remove pandas
uv remove --dev pytest
```

## Code Quality

### Pre-commit Hooks

Install pre-commit hooks to run checks before each commit:

```bash
# Install pre-commit (once)
uv tool install pre-commit

# Install hooks for this repo
pre-commit install

# Run hooks manually
pre-commit run --all-files
```

### Manual Quality Checks

```bash
# Lint and fix auto-fixable issues
uv run ruff check --fix .

# Format code
uv run ruff format .

# Type check
uv run mypy .

# Run all quality checks
make quality
```

## Testing

### Running Tests

```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=lifo_ai_core

# Run specific test file
uv run pytest tests/test_processor.py

# Run with verbose output
uv run pytest -v
```

### Test Configuration

Tests are configured in `pyproject.toml`:
- Test discovery: `tests/` directory
- Coverage reporting
- Async test support via pytest-asyncio

## CI/CD

GitHub Actions workflows automatically:
- Run tests on Python 3.9, 3.10, 3.11, 3.12
- Check code quality with ruff
- Validate type annotations with mypy  
- Run security scans
- Generate coverage reports

## Migration Notes

### From pip to uv

- `pip install -r requirements.txt` → `uv sync`
- `pip install package` → `uv add package`
- Virtual environments are managed automatically by uv

### From black/isort/flake8 to ruff

- `black .` → `uv run ruff format .`
- `isort .` → `uv run ruff check --select I --fix .`
- `flake8 .` → `uv run ruff check .`
- All-in-one: `uv run ruff check --fix . && uv run ruff format .`

## Performance Benefits

- **uv**: 10-100x faster than pip for dependency resolution
- **ruff**: 10-100x faster than equivalent tools
- **Combined**: Dramatically faster development workflow

## Troubleshooting

### Common Issues

1. **uv not found**: Ensure uv is installed and in PATH
2. **Virtual environment issues**: Delete `.venv` and run `uv sync`
3. **Lock file conflicts**: Run `uv lock` to regenerate
4. **Import errors**: Ensure virtual environment is activated or use `uv run`

### Getting Help

```bash
uv --help                  # General help
uv add --help              # Command-specific help
uv run ruff --help         # Tool-specific help
make help                  # Project commands
```

## Legacy Files

The following files are no longer needed but kept for reference:
- `requirements.txt` (replaced by pyproject.toml)
- `setup.py` (replaced by pyproject.toml)
- `.flake8`, `black.toml`, `isort.cfg` (replaced by ruff config in pyproject.toml)

These can be removed once the migration is fully validated.