#!/usr/bin/env python3
"""
Quick test to verify YYYY/MM/DD date extraction for clear_expiry_date image
"""

import asyncio
import sys
import os

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.date_extraction_service import get_date_extraction_service

async def test_yyyy_format():
    """Test the new YYYY/MM/DD format support"""

    # Simulate the text blocks from clear_expiry_date.jpg with current dates
    from datetime import datetime, timedelta

    # Use realistic dates - production 6 months ago, expiry 6 months from now
    prod_date = (datetime.now() - timedelta(days=180)).strftime("%Y/%m/%d")
    exp_date = (datetime.now() + timedelta(days=180)).strftime("%Y/%m/%d")

    test_blocks = [
        f"PRO: {prod_date}",
        f"EXP: {exp_date}(Y/M/D)",
        "some other text",
        "gettyimages credit stamp text"
    ]

    # Also test individual blocks to isolate the issue
    individual_tests = [
        [f"EXP: {exp_date}(Y/M/D)"],
        [f"PRO: {prod_date}"]
    ]

    print("🧪 Testing YYYY/MM/DD Date Extraction")
    print("=" * 50)

    service = get_date_extraction_service()

    try:
        print(f"📝 Testing with blocks:")
        for i, block in enumerate(test_blocks, 1):
            print(f"   {i}. '{block}'")

        results = await service.extract_dates_from_text_blocks(test_blocks, preferred_region='EU')

        print(f"\n📊 Found {len(results)} dates:")

        for i, result in enumerate(results, 1):
            print(f"\n{i}. Date: {result.date}")
            print(f"   Type: {result.date_type}")
            print(f"   Format: {result.format_detected}")
            print(f"   Raw Text: {result.raw_text}")
            print(f"   Confidence: {result.confidence}")

        # Expected results for clear_expiry_date
        print(f"\n✅ Expected Results:")
        print(f"   - Should find 2 dates")
        print(f"   - PRO: {prod_date.replace('/', '-')} (manufactured)")
        print(f"   - EXP: {exp_date.replace('/', '-')} (expiry)")

        # Validate results
        found_expiry = any(r.date_type == 'expiry' and exp_date.replace('/', '-') in str(r.date) for r in results)
        found_production = any(r.date_type == 'manufactured' and prod_date.replace('/', '-') in str(r.date) for r in results)

        print(f"\n🎯 Validation:")
        print(f"   Found Expiry Date: {'✅' if found_expiry else '❌'}")
        print(f"   Found Production Date: {'✅' if found_production else '❌'}")

        if found_expiry and found_production:
            print(f"\n🎉 SUCCESS: clear_expiry_date image should now work correctly!")
        else:
            print(f"\n❌ ISSUE: Some dates not detected as expected")

        # Test individual blocks to isolate the issue
        print(f"\n🔍 Testing individual blocks:")
        for i, test_set in enumerate(individual_tests, 1):
            print(f"\n   Test {i}: {test_set}")
            individual_results = await service.extract_dates_from_text_blocks(test_set, preferred_region='EU')
            print(f"   Results: {len(individual_results)} dates found")
            for result in individual_results:
                print(f"     - {result.date} ({result.date_type}) from '{result.raw_text}'")

    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_yyyy_format())