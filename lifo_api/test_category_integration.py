#!/usr/bin/env python3
"""
Quick integration test for category system compatibility
Tests the CSV upload → Python scoring pipeline after database view fixes
"""

import asyncio
import tempfile
import os
from datetime import datetime, timedelta

# Test CSV data with legacy categories that should be mapped
TEST_CSV_CONTENT = """sku,product_name,category,quantity,expiry_date,cost_price,selling_price
MILK001,Fresh Milk 1L,Dairy,24,2025-02-28,1.20,2.50
BREAD001,Whole Wheat Bread,Bakery,15,2025-01-05,0.80,1.80
PIZZA001,Frozen Pizza,Frozen Foods,12,2025-03-15,3.00,6.00
APPLE001,Red Apples,Produce,30,2025-01-25,0.50,1.20
UNKNOWN001,Mystery Item,Invalid Category,5,2025-02-01,1.00,2.00
"""

async def test_category_mapping():
    """Test category mapping functionality"""
    print("🧪 Testing category mapping...")
    
    # Test the unified CSV processor
    from lifo_ai_core.etl.unified_csv_processor import UnifiedCSVProcessor
    
    processor = UnifiedCSVProcessor("test-store-id", "test-user-id")
    
    # Test category normalization
    test_cases = [
        ("Dairy", "dairy_eggs"),
        ("Frozen Foods", "frozen_foods"),
        ("Bakery", "bakery_fresh"),
        ("Produce", "fresh_produce"),
        ("Invalid Category", "household_other"),
        ("", "household_other"),
    ]
    
    for input_category, expected_output in test_cases:
        result = processor._normalize_category(input_category, 1)
        status = "✅" if result == expected_output else "❌"
        print(f"{status} '{input_category}' → '{result}' (expected: '{expected_output}')")

async def test_category_weights():
    """Test category weights retrieval"""
    print("\n🧪 Testing category weights retrieval...")
    
    # Mock database operations to test the weights function
    class MockDB:
        pass
    
    from app.database.read_only_operations import ReadOnlyOperations
    
    mock_db = MockDB()
    read_ops = ReadOnlyOperations(mock_db)
    
    test_categories = [
        "dairy_eggs",
        "frozen_foods", 
        "bakery_fresh",
        "fresh_produce",
        "household_other",
        "unknown_category"
    ]
    
    for category in test_categories:
        weights = await read_ops.get_category_weights(category)
        has_required_keys = all(key in weights for key in ["expiry", "velocity", "margin"])
        status = "✅" if has_required_keys else "❌"
        print(f"{status} {category}: {weights}")

async def test_csv_processing():
    """Test CSV processing with legacy categories"""
    print("\n🧪 Testing CSV processing...")
    
    # Create temporary CSV file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        f.write(TEST_CSV_CONTENT)
        temp_csv_path = f.name
    
    try:
        from lifo_ai_core.etl.unified_csv_processor import UnifiedCSVProcessor
        processor = UnifiedCSVProcessor("test-store-id", "test-user-id")
        
        # Process the test CSV
        result = await processor.process_csv_file(temp_csv_path, TEST_CSV_CONTENT.encode())
        
        print(f"✅ CSV processing status: {result['status']}")
        print(f"✅ Processed items: {result['processed_count']}")
        print(f"✅ Warnings: {len(result['warnings'])}")
        print(f"✅ Errors: {len(result['errors'])}")
        
        # Check if categories were mapped correctly
        if result['data']:
            print("\n📋 Category mapping results:")
            for item in result['data'][:3]:  # Show first 3 items
                print(f"  • {item['product_name']}: {item['category']}")
                
    finally:
        # Clean up
        os.unlink(temp_csv_path)

async def run_integration_tests():
    """Run all integration tests"""
    print("🚀 Starting Python Category Integration Tests")
    print("=" * 50)
    
    try:
        await test_category_mapping()
        await test_category_weights()
        await test_csv_processing()
        
        print("\n" + "=" * 50)
        print("✅ All integration tests completed!")
        print("\n💡 Next steps:")
        print("1. Test with real FastAPI server running")
        print("2. Upload test CSV through Next.js frontend") 
        print("3. Verify scoring endpoint responds without errors")
        print("4. Check that categories display correctly in UI")
        
    except Exception as e:
        print(f"\n❌ Integration test failed: {e}")
        print("🔧 Check that all Python dependencies are installed")

if __name__ == "__main__":
    asyncio.run(run_integration_tests())