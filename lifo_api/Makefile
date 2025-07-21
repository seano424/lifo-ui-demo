# LIFO API - Development Commands

.PHONY: help install dev-setup lint format type-check test clean run dev

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies with uv
	uv sync

dev-install: ## Install development dependencies
	uv sync --dev

lint: ## Run linting with ruff
	uv run ruff check .

lint-fix: ## Run linting with auto-fix
	uv run ruff check --fix .

format: ## Format code with ruff
	uv run ruff format .

format-check: ## Check code formatting
	uv run ruff format --check .

type-check: ## Run type checking with mypy
	uv run mypy .

test: ## Run tests
	uv run pytest

test-cov: ## Run tests with coverage
	uv run pytest --cov=lifo_api --cov-report=html

quality: ## Run all quality checks (lint, format, type-check)
	uv run ruff check .
	uv run ruff format --check .
	uv run mypy .

clean: ## Clean up generated files
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	rm -rf .pytest_cache/
	rm -rf htmlcov/
	rm -rf .coverage
	rm -rf .mypy_cache/

dev-setup: ## Run development setup
	./scripts/dev-setup.sh

run: ## Run API server in development mode
	uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev: run ## Alias for run