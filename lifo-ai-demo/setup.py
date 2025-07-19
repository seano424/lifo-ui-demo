"""
Setup script for LIFO.AI Demo System
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="lifo-ai-demo",
    version="1.0.0",
    author="LIFO.AI Team",
    author_email="demo@lifo.ai",
    description="Interactive Jupyter notebook demo system for LIFO.AI CSV processing and AI scoring",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/lifo-ai/lifo-ai-demo",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Intended Audience :: End Users/Desktop",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Topic :: Office/Business :: Financial :: Point-Of-Sale",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    python_requires=">=3.8",
    install_requires=requirements,
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-asyncio>=0.21.0",
            "black>=23.0.0",
            "isort>=5.12.0",
            "flake8>=6.0.0",
        ],
        "full": [
            "python-magic>=0.4.27",
            "chardet>=5.0.0",
            "rich>=13.0.0",
            "tqdm>=4.65.0",
            "statsmodels>=0.14.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "lifo-demo=lifo_ai_core.etl.unified_csv_processor:main",
        ],
    },
    package_data={
        "lifo_ai_demo": [
            "data/clean_data/*.csv",
            "data/messy_data/*.csv",
            "data/edge_cases/*.csv",
            "notebooks/*.ipynb",
        ],
    },
    include_package_data=True,
    zip_safe=False,
)