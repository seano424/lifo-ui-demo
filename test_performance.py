#!/usr/bin/env python3
"""
Performance test script for CSV upload optimization
Measures the time taken to upload and process the sample CSV
"""

import time
import json
import requests

# Test configuration
API_BASE_URL = "http://localhost:8000/api/v1"
CSV_FILE_PATH = "/home/slim/lifo-app/test_data/csv/sample_inventory.csv"
STORE_ID = "e3b41480-79a3-4cb7-8151-3fe014a1b60f"
TOKEN = "eyJhbGciOiJIUzI1NiIsImtpZCI6InZhVU5ERFJESkxZOURsSnAiLCJ0eXAiOiJKV1QifQ.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzI2Mzc5MTM1LCJpYXQiOjE3MjYzNzU1MzUsImlzcyI6Imh0dHBzOi8vanJnbWV0ZHNvaG93dHhpY2txaWouc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6IjQyMGQxNDBjLTIzODYtNGQ4NS05ZDBkLWE2OWJiZDM4NDI3NiIsImVtYWlsIjoic2xpbWFuZS5sYWtAb3V0bG9vay5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6InN1cGFiYXNlIiwicHJvdmlkZXJzIjpbInN1cGFiYXNlIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoic2xpbWFuZS5sYWtAb3V0bG9vay5jb20iLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiNDIwZDE0MGMtMjM4Ni00ZDg1LTlkMGQtYTY5YmJkMzg0Mjc2In0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6WyJwYXNzd29yZCJdLCJzZXNzaW9uX2lkIjoiZGVhN2Y2MjUtOGY5MC00OTFjLWJhNDQtYjdiMGU5MWI3Zjk4IiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.Z1YJNk_h2QQIxDnJNmb1MHQS0ZDJ8dN4IzRdL2i7m2k"

def test_csv_upload_performance():
    """Test CSV upload performance with timing"""
    print("=" * 60)
    print("CSV Upload Performance Test")
    print("=" * 60)
    
    # Prepare the request
    headers = {
        "Authorization": f"Bearer {TOKEN}"
    }
    
    files = {
        "file": ("sample_inventory.csv", open(CSV_FILE_PATH, "rb"), "text/csv")
    }
    
    data = {
        "store_id": STORE_ID,
        "chunk_size": "50"  # Default chunk size for comparison
    }
    
    url = f"{API_BASE_URL}/csv-upload/upload-and-create-batches"
    
    print(f"Testing: {url}")
    print(f"Store ID: {STORE_ID}")
    print(f"CSV File: {CSV_FILE_PATH}")
    print(f"Chunk Size: 50")
    print("-" * 60)
    
    # Measure performance
    start_time = time.time()
    
    try:
        response = requests.post(url, headers=headers, files=files, data=data, timeout=60)
        end_time = time.time()
        
        total_time_ms = (end_time - start_time) * 1000
        
        print(f"Response Status: {response.status_code}")
        print(f"Total Processing Time: {total_time_ms:.2f} ms")
        print(f"Total Processing Time: {total_time_ms/1000:.2f} seconds")
        
        if response.status_code == 200:
            result = response.json()
            
            # Extract performance metrics
            batch_creation = result.get("batch_creation", {})
            csv_processing = result.get("csv_processing", {})
            
            print("\n📊 Performance Metrics:")
            print(f"  • CSV Rows Processed: {csv_processing.get('processed_rows', 'N/A')}")
            print(f"  • Batches Created: {batch_creation.get('successful_batches', 'N/A')}")
            print(f"  • Success Rate: {batch_creation.get('success_rate', 'N/A')}%")
            print(f"  • Failed Batches: {batch_creation.get('failed_batches', 'N/A')}")
            
            # Performance breakdown
            if hasattr(result, "processing_metadata"):
                metadata = result.get("processing_metadata", {})
                if "total_chunks" in metadata:
                    print(f"  • Total Chunks: {metadata['total_chunks']}")
            
            print("\n🚀 Performance Analysis:")
            if total_time_ms < 1000:
                performance_rating = "🟢 EXCELLENT"
            elif total_time_ms < 5000:
                performance_rating = "🟡 GOOD"
            elif total_time_ms < 10000:
                performance_rating = "🟠 ACCEPTABLE"
            else:
                performance_rating = "🔴 NEEDS IMPROVEMENT"
            
            print(f"  • Overall Rating: {performance_rating}")
            
            items_per_second = csv_processing.get('processed_rows', 0) / (total_time_ms / 1000) if total_time_ms > 0 else 0
            print(f"  • Throughput: {items_per_second:.2f} items/second")
            
            # Expected vs actual
            expected_time_optimized = 1000  # Target: < 1 second for 8 items
            improvement = "IMPROVED" if total_time_ms < expected_time_optimized else "NEEDS WORK"
            print(f"  • Target vs Actual: {expected_time_optimized}ms target vs {total_time_ms:.2f}ms actual")
            print(f"  • Optimization Status: {improvement}")
            
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out after 60 seconds")
    except Exception as e:
        print(f"❌ Error during request: {str(e)}")
    
    finally:
        files["file"][1].close()
    
    print("=" * 60)

def test_small_batch_chunks():
    """Test with smaller chunk sizes to compare performance"""
    print("\nTesting different chunk sizes...")
    
    chunk_sizes = [2, 5, 10, 50]
    
    for chunk_size in chunk_sizes:
        print(f"\n🧪 Testing with chunk_size={chunk_size}")
        
        headers = {
            "Authorization": f"Bearer {TOKEN}"
        }
        
        files = {
            "file": ("sample_inventory.csv", open(CSV_FILE_PATH, "rb"), "text/csv")
        }
        
        data = {
            "store_id": STORE_ID,
            "chunk_size": str(chunk_size)
        }
        
        url = f"{API_BASE_URL}/csv-upload/upload-and-create-batches"
        
        start_time = time.time()
        
        try:
            response = requests.post(url, headers=headers, files=files, data=data, timeout=30)
            end_time = time.time()
            
            total_time_ms = (end_time - start_time) * 1000
            
            if response.status_code == 200:
                result = response.json()
                batch_creation = result.get("batch_creation", {})
                
                print(f"  ✅ Chunk {chunk_size}: {total_time_ms:.2f}ms, Success Rate: {batch_creation.get('success_rate', 0)}%")
            else:
                print(f"  ❌ Chunk {chunk_size}: Failed ({response.status_code})")
                
        except Exception as e:
            print(f"  ❌ Chunk {chunk_size}: Error - {str(e)}")
        
        finally:
            files["file"][1].close()

if __name__ == "__main__":
    # Main performance test
    test_csv_upload_performance()
    
    # Chunk size comparison
    test_small_batch_chunks()
    
    print("\n✨ Performance testing completed!")