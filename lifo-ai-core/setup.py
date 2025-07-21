#!/usr/bin/env python3

from setuptools import find_packages, setup

setup(
    name="lifo-ai-core",
    version="0.1.0",
    description="LIFO AI Core - Food waste reduction engine",
    author="LIFO.AI",
    author_email="tech@lifo.ai",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "pandas>=2.0.0",
        "numpy>=1.24.0",
        "pydantic>=2.0.0",
        "pydantic-settings>=2.0.0",
        "python-dotenv>=1.0.0",
        "python-dateutil>=2.8.0",
        "psycopg2-binary>=2.9.0",
        "sqlalchemy>=2.0.0",
        "asyncpg>=0.28.0",
        "typer>=0.9.0",
        "rich>=13.0.0",
        "loguru>=0.7.0",
        "openpyxl>=3.1.0",
        "xlrd>=2.0.0",
        "chardet>=5.0.0",
        "scikit-learn>=1.3.0",
        "joblib>=1.3.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.21.0",
            "pytest-cov>=4.0.0",
            "factory-boy>=3.3.0",
            "black>=23.0.0",
            "isort>=5.12.0",
            "flake8>=6.0.0",
            "mypy>=1.5.0",
        ]
    },
    entry_points={
        "console_scripts": [
            "lifo-scorer=lifo_ai_core.scoring.engine:main",
            "lifo-etl=lifo_ai_core.etl.processor:main",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
)
