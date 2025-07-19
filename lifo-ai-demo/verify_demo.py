#!/usr/bin/env python3
"""
Comprehensive verification script for LIFO.AI Demo System
"""

import os
import sys
import json
from pathlib import Path

def verify_structure():
    """Verify the demo directory structure"""
    print("📁 Verifying directory structure...")
    
    required_dirs = [
        "notebooks",
        "data/clean_data",
        "data/messy_data", 
        "data/edge_cases",
        "lifo_ai_core/etl",
        "lifo_ai_core/scoring",
        "lifo_ai_core/utils",
        "utils",
        "config",
        "outputs/processed_data",
        "outputs/reports",
        "outputs/visualizations"
    ]
    
    missing_dirs = []
    for dir_path in required_dirs:
        if not os.path.exists(dir_path):
            missing_dirs.append(dir_path)
        else:
            print(f"✅ {dir_path}")
    
    if missing_dirs:
        print(f"❌ Missing directories: {missing_dirs}")
        return False
    
    return True

def verify_files():
    """Verify required files exist"""
    print("\n📄 Verifying required files...")
    
    required_files = [
        "README.md",
        "requirements.txt",
        "setup.py",
        "test_installation.py",
        "INSTALL.md",
        
        # Core library files
        "lifo_ai_core/__init__.py",
        "lifo_ai_core/etl/__init__.py",
        "lifo_ai_core/etl/unified_csv_processor.py",
        "lifo_ai_core/scoring/__init__.py",
        "lifo_ai_core/scoring/engine.py",
        "lifo_ai_core/utils/__init__.py",
        "lifo_ai_core/utils/logger.py",
        
        # Utility files
        "utils/__init__.py",
        "utils/api_client.py",
        "utils/data_generator.py",
        "utils/visualization.py",
        
        # Configuration
        "config/demo_config.py",
        
        # Sample data
        "data/clean_data/perfect_inventory.csv",
        "data/clean_data/small_store_sample.csv",
        "data/messy_data/mixed_formats.csv",
        "data/messy_data/missing_columns.csv",
        "data/messy_data/duplicate_skus.csv",
        "data/messy_data/invalid_data.csv",
        "data/edge_cases/security_test.csv",
        "data/edge_cases/empty_file.csv",
        "data/edge_cases/single_row.csv",
        
        # Notebooks
        "notebooks/01_CSV_Processing_Demo.ipynb",
        "notebooks/02_API_Integration_Demo.ipynb",
        "notebooks/03_Scoring_Algorithm_Demo.ipynb"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
        else:
            print(f"✅ {file_path}")
    
    if missing_files:
        print(f"❌ Missing files: {missing_files}")
        return False
    
    return True

def verify_notebooks():
    """Verify notebook structure and content"""
    print("\n📓 Verifying notebook structure...")
    
    notebook_paths = [
        "notebooks/01_CSV_Processing_Demo.ipynb",
        "notebooks/02_API_Integration_Demo.ipynb",
        "notebooks/03_Scoring_Algorithm_Demo.ipynb"
    ]
    
    for notebook_path in notebook_paths:
        try:
            with open(notebook_path, 'r') as f:
                nb_data = json.load(f)
                
            cell_count = len(nb_data.get('cells', []))
            print(f"✅ {notebook_path}: {cell_count} cells")
            
            # Check for reasonable number of cells
            if cell_count < 5:
                print(f"⚠️ {notebook_path}: Low cell count ({cell_count})")
        
        except Exception as e:
            print(f"❌ {notebook_path}: Error reading - {e}")
            return False
    
    return True

def verify_data_files():
    """Verify data file content"""
    print("\n📊 Verifying data files...")
    
    try:
        # Check if we can read the CSV files
        import pandas as pd
        
        data_files = [
            "data/clean_data/perfect_inventory.csv",
            "data/messy_data/mixed_formats.csv"
        ]
        
        for file_path in data_files:
            try:
                df = pd.read_csv(file_path)
                print(f"✅ {file_path}: {df.shape[0]} rows, {df.shape[1]} columns")
            except Exception as e:
                print(f"❌ {file_path}: Error reading - {e}")
                return False
        
        return True
        
    except ImportError:
        print("⚠️ pandas not available, skipping data file verification")
        return True

def calculate_demo_stats():
    """Calculate comprehensive demo statistics"""
    print("\n📈 Demo System Statistics:")
    
    # Count files by type
    file_counts = {
        'notebooks': 0,
        'data_files': 0,
        'python_files': 0,
        'config_files': 0,
        'docs': 0,
        'total': 0
    }
    
    for root, dirs, files in os.walk('.'):
        # Skip hidden directories and __pycache__
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != '__pycache__']
        
        for file in files:
            if file.startswith('.'):
                continue
                
            file_counts['total'] += 1
            
            if file.endswith('.ipynb'):
                file_counts['notebooks'] += 1
            elif file.endswith('.csv'):
                file_counts['data_files'] += 1
            elif file.endswith('.py'):
                file_counts['python_files'] += 1
            elif file.endswith('.md'):
                file_counts['docs'] += 1
            elif file.endswith(('.json', '.yml', '.yaml', '.toml')):
                file_counts['config_files'] += 1
    
    print(f"   📓 Notebooks: {file_counts['notebooks']}")
    print(f"   📊 Data files: {file_counts['data_files']}")
    print(f"   🐍 Python files: {file_counts['python_files']}")
    print(f"   📄 Documentation: {file_counts['docs']}")
    print(f"   ⚙️ Config files: {file_counts['config_files']}")
    print(f"   📁 Total files: {file_counts['total']}")
    
    return file_counts

def main():
    """Run comprehensive verification"""
    print("🔍 LIFO.AI Demo System Verification")
    print("=" * 45)
    
    tests = [
        ("Directory structure", verify_structure),
        ("Required files", verify_files),
        ("Notebook structure", verify_notebooks),
        ("Data files", verify_data_files)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name} PASSED")
            else:
                print(f"❌ {test_name} FAILED")
        except Exception as e:
            print(f"❌ {test_name} ERROR: {e}")
    
    # Calculate statistics
    stats = calculate_demo_stats()
    
    print(f"\n🎯 VERIFICATION SUMMARY:")
    print(f"   Tests passed: {passed}/{total}")
    print(f"   Demo completeness: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("\n🎉 Demo system verification successful!")
        print("📝 The demo is ready for use.")
        print("\n🚀 Quick start:")
        print("   1. Install dependencies: pip install -r requirements.txt")
        print("   2. Test installation: python test_installation.py")
        print("   3. Start Jupyter: jupyter notebook")
        print("   4. Open notebooks/01_CSV_Processing_Demo.ipynb")
    else:
        print("\n⚠️ Demo system has issues.")
        print("🔧 Please check the failed tests and fix any missing components.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)