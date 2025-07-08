#!/usr/bin/env python3
"""
Setup script for LIFO AI Core development environment
"""

import os
import sys
import subprocess
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        logger.error("Python 3.8 or higher is required")
        sys.exit(1)
    logger.info(f"Python version: {sys.version}")

def check_and_create_venv():
    """Check if virtual environment exists, create if not"""
    venv_path = Path("venv")
    
    if not venv_path.exists():
        logger.info("Creating virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", "venv"], check=True)
        logger.info("Virtual environment created")
    else:
        logger.info("Virtual environment already exists")
    
    return venv_path

def get_pip_path(venv_path: Path):
    """Get the path to pip in the virtual environment"""
    if os.name == 'nt':  # Windows
        return venv_path / "Scripts" / "pip"
    else:  # Unix/Linux/MacOS
        return venv_path / "bin" / "pip"

def install_dependencies(venv_path: Path):
    """Install Python dependencies"""
    pip_path = get_pip_path(venv_path)
    requirements_path = Path("requirements.txt")
    
    if not requirements_path.exists():
        logger.error("requirements.txt not found")
        sys.exit(1)
    
    logger.info("Installing dependencies...")
    subprocess.run([
        str(pip_path), "install", "-r", str(requirements_path)
    ], check=True)
    logger.info("Dependencies installed")

def setup_directories():
    """Create necessary directories"""
    directories = [
        "logs",
        "data/input",
        "data/output", 
        "data/processed",
        "models",
        "temp"
    ]
    
    for directory in directories:
        dir_path = Path(directory)
        dir_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Directory created/verified: {directory}")

def create_env_file():
    """Create .env file from template if it doesn't exist"""
    env_file = Path(".env")
    env_example = Path(".env.example")
    
    if not env_file.exists():
        if env_example.exists():
            # Copy from example
            with open(env_example, 'r') as src, open(env_file, 'w') as dst:
                dst.write(src.read())
            logger.info(".env file created from .env.example")
        else:
            # Create basic template
            env_content = """# LIFO AI Core Environment Variables
DATABASE_URL=postgresql://user:password@localhost:5432/lifo_db
LIFO_LOG_LEVEL=INFO
LIFO_DEBUG=True
LIFO_ENVIRONMENT=development
"""
            with open(env_file, 'w') as f:
                f.write(env_content)
            logger.info(".env file created with template")
        
        logger.warning("Please update .env file with your actual configuration")
    else:
        logger.info(".env file already exists")

def run_basic_tests():
    """Run basic tests to verify setup"""
    logger.info("Running basic setup verification...")
    
    try:
        # Test imports
        import pandas
        import pydantic
        import asyncpg
        logger.info("✓ Core dependencies import successfully")
        
        # Test configuration
        from lifo_ai_core.config.settings import get_settings
        settings = get_settings()
        logger.info("✓ Configuration loads successfully")
        
        # Test logger
        from lifo_ai_core.utils.logger import get_logger
        test_logger = get_logger()
        logger.info("✓ Logger initializes successfully")
        
        logger.info("🎉 Setup verification completed successfully!")
        
    except ImportError as e:
        logger.error(f"Import error: {e}")
        logger.error("Some dependencies may not be installed correctly")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Setup verification failed: {e}")
        sys.exit(1)

def print_next_steps():
    """Print next steps for the user"""
    print("\n" + "="*60)
    print("🎉 LIFO AI Core setup completed successfully!")
    print("="*60)
    print("\nNext steps:")
    print("1. Activate the virtual environment:")
    if os.name == 'nt':
        print("   venv\\Scripts\\activate")
    else:
        print("   source venv/bin/activate")
    
    print("\n2. Update .env file with your database configuration")
    print("\n3. Test the setup:")
    print("   python -c \"from lifo_ai_core import InventoryScorer; print('All good!')\"")
    print("\n4. Run CSV processor test:")
    print("   python -m lifo_ai_core.etl.processor --help")
    print("\n5. Run scoring engine test:")
    print("   python -m lifo_ai_core.scoring.engine --help")
    print("\n" + "="*60)

def main():
    """Main setup function"""
    logger.info("Starting LIFO AI Core setup...")
    
    # Change to script directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir.parent)
    
    try:
        check_python_version()
        venv_path = check_and_create_venv()
        install_dependencies(venv_path)
        setup_directories()
        create_env_file()
        run_basic_tests()
        print_next_steps()
        
    except subprocess.CalledProcessError as e:
        logger.error(f"Command failed: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        logger.info("Setup cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()