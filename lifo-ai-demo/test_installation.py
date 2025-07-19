#!/usr/bin/env python3
"""
Test script to verify LIFO.AI Demo installation
"""

import sys
import os

def test_basic_imports():
    """Test basic Python imports"""
    print("🔍 Testing basic Python imports...")
    
    try:
        import pandas as pd
        print(f"✅ pandas {pd.__version__}")
    except ImportError as e:
        print(f"❌ pandas failed: {e}")
        return False
    
    try:
        import numpy as np
        print(f"✅ numpy {np.__version__}")
    except ImportError as e:
        print(f"❌ numpy failed: {e}")
        return False
    
    try:
        import matplotlib
        print(f"✅ matplotlib {matplotlib.__version__}")
    except ImportError as e:
        print(f"❌ matplotlib failed: {e}")
        return False
    
    try:
        import seaborn as sns
        print(f"✅ seaborn {sns.__version__}")
    except ImportError as e:
        print(f"❌ seaborn failed: {e}")
        return False
    
    try:
        import requests
        print(f"✅ requests {requests.__version__}")
    except ImportError as e:
        print(f"❌ requests failed: {e}")
        return False
    
    return True

def test_lifo_core_imports():
    """Test LIFO.AI core imports"""
    print("\n🔍 Testing LIFO.AI core imports...")
    
    # Add current directory to path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, current_dir)
    
    try:
        from lifo_ai_core.etl.unified_csv_processor import UnifiedCSVProcessor
        print("✅ UnifiedCSVProcessor imported successfully")
    except ImportError as e:
        print(f"❌ UnifiedCSVProcessor failed: {e}")
        return False
    
    try:
        from lifo_ai_core.scoring.engine import ScoringEngine
        print("✅ ScoringEngine imported successfully")
    except ImportError as e:
        print(f"❌ ScoringEngine failed: {e}")
        return False
    
    try:
        from lifo_ai_core.utils.logger import setup_logger
        print("✅ setup_logger imported successfully")
    except ImportError as e:
        print(f"❌ setup_logger failed: {e}")
        return False
    
    return True

def test_data_files():
    """Test that sample data files exist"""
    print("\n🔍 Testing sample data files...")
    
    required_files = [
        "data/clean_data/perfect_inventory.csv",
        "data/clean_data/small_store_sample.csv",
        "data/messy_data/mixed_formats.csv",
        "data/edge_cases/security_test.csv"
    ]
    
    all_exist = True
    for file_path in required_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} - Not found")
            all_exist = False
    
    return all_exist

def test_notebook_files():
    """Test that notebook files exist"""
    print("\n🔍 Testing notebook files...")
    
    required_notebooks = [
        "notebooks/01_CSV_Processing_Demo.ipynb",
        "notebooks/02_API_Integration_Demo.ipynb", 
        "notebooks/03_Scoring_Algorithm_Demo.ipynb"
    ]
    
    all_exist = True
    for notebook_path in required_notebooks:
        if os.path.exists(notebook_path):
            print(f"✅ {notebook_path}")
        else:
            print(f"❌ {notebook_path} - Not found")
            all_exist = False
    
    return all_exist

def test_processor_functionality():
    """Test basic processor functionality"""
    print("\n🔍 Testing processor functionality...")
    
    try:
        from lifo_ai_core.etl.unified_csv_processor import UnifiedCSVProcessor
        
        # Test processor creation
        processor = UnifiedCSVProcessor(store_id="test-store")
        print("✅ Processor created successfully")
        
        # Test with sample data if available
        if os.path.exists("data/clean_data/perfect_inventory.csv"):
            result = processor.process_csv_file("data/clean_data/perfect_inventory.csv")
            if result['status'] == 'success':
                print(f"✅ CSV processing successful: {result['processed_count']} items processed")
            else:
                print(f"⚠️ CSV processing completed with status: {result['status']}")
        else:
            print("⚠️ No sample data file found for testing")
        
        return True
        
    except Exception as e:
        print(f"❌ Processor test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 LIFO.AI Demo Installation Test")
    print("=" * 40)
    
    tests = [
        ("Basic Python imports", test_basic_imports),
        ("LIFO.AI core imports", test_lifo_core_imports),
        ("Sample data files", test_data_files),
        ("Notebook files", test_notebook_files),
        ("Processor functionality", test_processor_functionality)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n📊 {test_name}:")
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name} PASSED")
            else:
                print(f"❌ {test_name} FAILED")
        except Exception as e:
            print(f"❌ {test_name} ERROR: {e}")
    
    print(f"\n🎯 SUMMARY: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Installation is ready.")
        print("\n🚀 Next steps:")
        print("   1. Start Jupyter: jupyter notebook")
        print("   2. Open notebooks/01_CSV_Processing_Demo.ipynb")
        print("   3. Run the demo!")
    else:
        print("⚠️ Some tests failed. Please check the installation.")
        print("\n🔧 Troubleshooting:")
        print("   1. Install dependencies: pip install -r requirements.txt")
        print("   2. Check file paths and permissions")
        print("   3. Ensure you're running from the lifo-ai-demo directory")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)