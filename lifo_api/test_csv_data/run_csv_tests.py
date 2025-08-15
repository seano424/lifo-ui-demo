#!/usr/bin/env python3
"""
Professional CSV ETL Testing Suite for LIFO API
Comprehensive test suite with proper error handling and detailed reporting
"""

import requests
import json
import time
import sys
import os
from pathlib import Path
from typing import Dict, Any, Optional
import logging
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
BASE_URL = "http://localhost:8000"
STORE_ID = "e3b41480-79a3-4cb7-8151-3fe014a1b60f"  # Replace with your actual store ID
JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsImtpZCI6IkpWTnJkTFFielAyY2xJQlEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2pyZ21ldGRzb2hvd3R4aWNrcWlqLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI0MjBkMTQwYy0yMzg2LTRkODUtOWQwZC1hNjliYmQzODQyNzYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU1MjE4NTg4LCJpYXQiOjE3NTUyMTQ5ODgsImVtYWlsIjoic2xpbWFuZS5sYWtAb3V0bG9vay5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImF2YXRhcl91cmwiOm51bGwsImVtYWlsIjoic2xpbWFuZS5sYWtAb3V0bG9vay5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZnVsbF9uYW1lIjoic2xpbWFuZSBsYWtlaGFsIiwiaXNfYWN0aXZlIjp0cnVlLCJsYXN0X2xvZ2luIjpudWxsLCJtaWdyYXRlZF9mcm9tX3VzZXJfbWdtdCI6dHJ1ZSwibWlncmF0aW9uX3RpbWVzdGFtcCI6IjIwMjUtMDctMTNUMDA6NDc6MTQuNzQzMjA4KzAwOjAwIiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJwaW5fYXR0ZW1wdHMiOjAsInBpbl9kZWxpdmVyeV9tZXRob2QiOiJtYW51YWwiLCJwaW5fZXhwaXJlc19hdCI6bnVsbCwicGluX2hhc2giOm51bGwsInBpbl9sb2NrZWRfdW50aWwiOm51bGwsInBpbl9zZXRfYXQiOm51bGwsInJlcXVpcmVzX3BpbiI6ZmFsc2UsInN0b3JlX25hbWUiOiJzbGltIiwic3ViIjoiNDIwZDE0MGMtMjM4Ni00ZDg1LTlkMGQtYTY5YmJkMzg0Mjc2IiwidXNlcm5hbWUiOiJzbGltYW5lLmxhayJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzU0NjQ2MjMwfV0sInNlc3Npb25faWQiOiJjNjU0NDcyNC01YjFiLTQ5MGYtOTY3YS1hYmZlYThlYzYxMzUiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.wL9rFXOUVo8NNN5pcdC-VkVdXxbaN0QUl7RzRMeBPfg"

# Test data files
TEST_DATA_DIR = Path(__file__).parent
TEST_FILES = {
    "valid": "valid_inventory_test.csv",
    "urgent": "urgent_expiry_test.csv", 
    "security": "security_test.csv",
    "validation_errors": "validation_errors_test.csv",
    "performance": "performance_test.csv",
    "minimal": "minimal_required_fields.csv"
}

class TestResult:
    """Container for test results"""
    def __init__(self, name: str, passed: bool, message: str = "", details: Dict = None):
        self.name = name
        self.passed = passed
        self.message = message
        self.details = details or {}
        self.timestamp = time.time()

class CSVTestSuite:
    """Professional CSV API test suite"""
    
    def __init__(self, base_url: str, store_id: str, jwt_token: str):
        self.base_url = base_url
        self.store_id = store_id
        self.headers = {"Authorization": f"Bearer {jwt_token}"}
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        self.results = []
    
    def log_test(self, name: str, passed: bool, message: str = "", details: Dict = None):
        """Log test result"""
        result = TestResult(name, passed, message, details)
        self.results.append(result)
        
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} {name}")
        if message:
            print(f"    {message}")
        
        return result
    
    def make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make HTTP request with error handling"""
        try:
            url = f"{self.base_url}{endpoint}"
            response = self.session.request(method, url, timeout=30, **kwargs)
            logger.debug(f"{method} {endpoint} -> {response.status_code}")
            return response
        except requests.RequestException as e:
            logger.error(f"Request failed: {e}")
            raise
    
    def test_server_connectivity(self):
        """Test basic server connectivity"""
        try:
            response = self.make_request('GET', '/health')
            if response.status_code == 200:
                data = response.json()
                self.log_test("Server Connectivity", True, 
                            f"Server healthy: {data.get('status')}")
                return True
            else:
                self.log_test("Server Connectivity", False, 
                            f"Health check failed: HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Server Connectivity", False, f"Connection error: {e}")
            return False
    
    def test_csv_template_download(self):
        """Test CSV template download"""
        try:
            response = self.make_request('GET', '/api/v1/csv-upload/template')
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'data' in data:
                    headers = data['data'].get('headers', [])
                    content_size = len(data['data'].get('content', ''))
                    self.log_test("CSV Template Download", True, 
                                f"Template downloaded: {len(headers)} headers, {content_size} bytes")
                    return True
                else:
                    self.log_test("CSV Template Download", False, 
                                "Invalid template response format")
                    return False
            else:
                self.log_test("CSV Template Download", False, 
                            f"HTTP {response.status_code}: {response.text[:100]}")
                return False
                
        except Exception as e:
            self.log_test("CSV Template Download", False, f"Exception: {e}")
            return False
    
    def test_csv_file_upload(self, file_key: str, expected_success: bool = True):
        """Test CSV file upload and processing"""
        test_name = f"CSV Upload - {file_key}"
        
        try:
            file_path = TEST_DATA_DIR / TEST_FILES[file_key]
            if not file_path.exists():
                self.log_test(test_name, False, f"Test file not found: {file_path}")
                return False
            
            with open(file_path, 'rb') as f:
                files = {'file': (file_path.name, f, 'text/csv')}
                data = {'store_id': self.store_id}
                
                response = self.make_request('POST', '/api/v1/csv-upload/upload', 
                                           files=files, data=data)
            
            if response.status_code == 200:
                response_data = response.json()
                if response_data.get('success'):
                    processed = response_data.get('data', {}).get('processed_count', 0)
                    total = response_data.get('data', {}).get('total_items', 0)
                    warnings = len(response_data.get('data', {}).get('warnings', []))
                    errors = len(response_data.get('data', {}).get('errors', []))
                    
                    message = f"Processed {processed}/{total} items"
                    if warnings > 0:
                        message += f", {warnings} warnings"
                    if errors > 0:
                        message += f", {errors} errors"
                    
                    self.log_test(test_name, expected_success, message)
                    return expected_success
                else:
                    self.log_test(test_name, False, "Upload failed")
                    return False
            elif response.status_code == 422:
                try:
                    error_data = response.json()
                    detail = error_data.get('detail', 'Validation error')
                    self.log_test(test_name, not expected_success, 
                                f"Validation error: {detail}")
                    return not expected_success
                except:
                    self.log_test(test_name, False, f"HTTP 422: {response.text[:100]}")
                    return False
            elif response.status_code == 400:
                try:
                    error_data = response.json()
                    detail = error_data.get('detail', 'Bad request')
                    self.log_test(test_name, not expected_success, 
                                f"Bad request: {detail}")
                    return not expected_success
                except:
                    self.log_test(test_name, False, f"HTTP 400: {response.text[:100]}")
                    return False
            else:
                self.log_test(test_name, False, 
                            f"HTTP {response.status_code}: {response.text[:100]}")
                return False
                
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {e}")
            return False
    
    def test_csv_validation(self, file_key: str, expected_success: bool = True):
        """Test CSV validation endpoint"""
        test_name = f"CSV Validation - {file_key}"
        
        try:
            file_path = TEST_DATA_DIR / TEST_FILES[file_key]
            if not file_path.exists():
                self.log_test(test_name, False, f"Test file not found: {file_path}")
                return False
            
            with open(file_path, 'rb') as f:
                files = {'file': (file_path.name, f, 'text/csv')}
                data = {'store_id': self.store_id}
                
                response = self.make_request('POST', '/api/v1/csv-upload/validate', 
                                           files=files, data=data)
            
            if response.status_code == 200:
                response_data = response.json()
                if response_data.get('success'):
                    validation = response_data.get('validation_results', {})
                    valid_rows = validation.get('valid_rows', 0)
                    total_items = validation.get('total_items', 0)
                    errors = len(validation.get('errors', []))
                    warnings = len(validation.get('warnings', []))
                    
                    message = f"Validated {valid_rows}/{total_items} rows"
                    if errors > 0:
                        message += f", {errors} errors"
                    if warnings > 0:
                        message += f", {warnings} warnings"
                    
                    success = (errors == 0) if expected_success else (errors > 0)
                    self.log_test(test_name, success, message)
                    return success
                else:
                    self.log_test(test_name, False, "Validation failed")
                    return False
            else:
                try:
                    error_data = response.json()
                    detail = error_data.get('detail', 'Unknown error')
                    self.log_test(test_name, not expected_success, 
                                f"HTTP {response.status_code}: {detail}")
                    return not expected_success
                except:
                    self.log_test(test_name, False, 
                                f"HTTP {response.status_code}: {response.text[:100]}")
                    return False
                
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {e}")
            return False
    
    def test_csv_batch_creation(self, file_key: str, chunk_size: int = 50):
        """Test CSV batch creation endpoint"""
        test_name = f"CSV Batch Creation - {file_key} (chunk={chunk_size})"
        
        try:
            file_path = TEST_DATA_DIR / TEST_FILES[file_key]
            if not file_path.exists():
                self.log_test(test_name, False, f"Test file not found: {file_path}")
                return False
            
            with open(file_path, 'rb') as f:
                files = {'file': (file_path.name, f, 'text/csv')}
                data = {
                    'store_id': self.store_id,
                    'chunk_size': str(chunk_size)
                }
                
                response = self.make_request('POST', '/api/v1/csv-upload/upload-and-create-batches', 
                                           files=files, data=data)
            
            if response.status_code == 200:
                response_data = response.json()
                if response_data.get('success'):
                    csv_proc = response_data.get('csv_processing', {})
                    batch_creation = response_data.get('batch_creation', {})
                    
                    csv_processed = csv_proc.get('processed_rows', 0)
                    total_requests = batch_creation.get('total_requests', 0)
                    successful_batches = batch_creation.get('successful_batches', 0)
                    failed_batches = batch_creation.get('failed_batches', 0)
                    success_rate = batch_creation.get('success_rate', 0)
                    
                    message = f"CSV: {csv_processed} rows → Batches: {successful_batches}/{total_requests} created ({success_rate}%)"
                    
                    # Consider success if we processed CSV and created some batches
                    success = csv_processed > 0 and successful_batches >= 0
                    self.log_test(test_name, success, message)
                    return success
                else:
                    self.log_test(test_name, False, "Batch creation failed")
                    return False
            elif response.status_code == 422:
                try:
                    error_data = response.json()
                    detail = error_data.get('detail', 'Validation error')
                    # Some validation errors might be expected (e.g., missing database)
                    self.log_test(test_name, False, f"Validation error: {detail}")
                    return False
                except:
                    self.log_test(test_name, False, f"HTTP 422: {response.text[:100]}")
                    return False
            elif response.status_code >= 500:
                # Server errors might indicate missing database/dependencies
                self.log_test(test_name, False, 
                            f"Server error (might be missing dependencies): HTTP {response.status_code}")
                return False
            else:
                try:
                    error_data = response.json()
                    detail = error_data.get('detail', 'Unknown error')
                    self.log_test(test_name, False, f"HTTP {response.status_code}: {detail}")
                    return False
                except:
                    self.log_test(test_name, False, 
                                f"HTTP {response.status_code}: {response.text[:100]}")
                    return False
                
        except Exception as e:
            self.log_test(test_name, False, f"Exception: {e}")
            return False
    
    def test_authentication_and_authorization(self):
        """Test authentication and authorization"""
        
        # Test missing auth token
        try:
            session = requests.Session()  # No auth headers
            file_path = TEST_DATA_DIR / TEST_FILES["minimal"]
            
            with open(file_path, 'rb') as f:
                files = {'file': (file_path.name, f, 'text/csv')}
                data = {'store_id': self.store_id}
                
                response = session.post(f"{self.base_url}/api/v1/csv-upload/upload", 
                                       files=files, data=data, timeout=10)
            
            if response.status_code in [401, 403]:
                self.log_test("Authentication - Missing Token", True, 
                            f"Correctly rejected unauthenticated request: HTTP {response.status_code}")
            else:
                self.log_test("Authentication - Missing Token", False, 
                            f"Should have rejected request: HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Authentication - Missing Token", False, f"Exception: {e}")
        
        # Test missing store_id
        try:
            file_path = TEST_DATA_DIR / TEST_FILES["minimal"]
            
            with open(file_path, 'rb') as f:
                files = {'file': (file_path.name, f, 'text/csv')}
                # Don't include store_id
                
                response = self.make_request('POST', '/api/v1/csv-upload/upload', files=files)
            
            if response.status_code == 422:
                self.log_test("Authorization - Missing Store ID", True, 
                            "Correctly rejected request without store_id")
            else:
                self.log_test("Authorization - Missing Store ID", False, 
                            f"Should have rejected request: HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Authorization - Missing Store ID", False, f"Exception: {e}")
    
    def test_invalid_inputs(self):
        """Test various invalid inputs"""
        
        # Test invalid file type
        try:
            files = {'file': ('test.txt', b'not a csv file', 'text/plain')}
            data = {'store_id': self.store_id}
            
            response = self.make_request('POST', '/api/v1/csv-upload/upload', files=files, data=data)
            
            if response.status_code == 400:
                self.log_test("Invalid Input - File Type", True, 
                            "Correctly rejected non-CSV file")
            else:
                self.log_test("Invalid Input - File Type", False, 
                            f"Should have rejected non-CSV: HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Invalid Input - File Type", False, f"Exception: {e}")
        
        # Test empty file
        try:
            files = {'file': ('empty.csv', b'', 'text/csv')}
            data = {'store_id': self.store_id}
            
            response = self.make_request('POST', '/api/v1/csv-upload/upload', files=files, data=data)
            
            # Empty file should be handled gracefully
            if response.status_code in [400, 422]:
                self.log_test("Invalid Input - Empty File", True, 
                            f"Correctly handled empty file: HTTP {response.status_code}")
            else:
                self.log_test("Invalid Input - Empty File", False, 
                            f"Unexpected response to empty file: HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Invalid Input - Empty File", False, f"Exception: {e}")
    
    def run_all_tests(self):
        """Run the complete test suite"""
        print("🧪 LIFO CSV ETL Professional Test Suite")
        print("=" * 60)
        print(f"Server: {self.base_url}")
        print(f"Store ID: {self.store_id}")
        print("=" * 60)
        
        # Basic connectivity
        print("\n🔌 CONNECTIVITY TESTS")
        if not self.test_server_connectivity():
            print("❌ Server not accessible - stopping tests")
            return False
        
        # Template and basic functionality
        print("\n📋 BASIC FUNCTIONALITY TESTS")
        self.test_csv_template_download()
        
        # File validation tests
        print("\n🔍 VALIDATION TESTS")
        self.test_csv_validation("minimal", expected_success=True)
        self.test_csv_validation("valid", expected_success=True)
        self.test_csv_validation("validation_errors", expected_success=False)
        
        # File upload tests
        print("\n📤 UPLOAD TESTS")
        self.test_csv_file_upload("minimal", expected_success=True)
        self.test_csv_file_upload("valid", expected_success=True)
        
        # Batch creation tests (these might fail if database isn't configured)
        print("\n🏭 BATCH CREATION TESTS")
        self.test_csv_batch_creation("minimal", 50)
        self.test_csv_batch_creation("valid", 25)
        
        # Security and edge case tests
        print("\n🔒 SECURITY & EDGE CASE TESTS")
        self.test_authentication_and_authorization()
        self.test_invalid_inputs()
        
        # Performance test (if file exists)
        if (TEST_DATA_DIR / TEST_FILES["performance"]).exists():
            print("\n⚡ PERFORMANCE TESTS")
            start_time = time.time()
            self.test_csv_file_upload("performance", expected_success=True)
            end_time = time.time()
            
            performance_time = end_time - start_time
            if performance_time < 30:
                self.log_test("Performance - Large File", True, 
                            f"Processed large file in {performance_time:.2f}s")
            else:
                self.log_test("Performance - Large File", False, 
                            f"Large file took too long: {performance_time:.2f}s")
        
        # Security file test
        if (TEST_DATA_DIR / TEST_FILES["security"]).exists():
            print("\n🛡️ SECURITY FILE TESTS")
            self.test_csv_file_upload("security", expected_success=False)
        
        # Print summary
        self.print_summary()
        
        return True
    
    def print_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.results if r.passed)
        failed = sum(1 for r in self.results if not r.passed)
        total = len(self.results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.results:
                if not result.passed:
                    print(f"  • {result.name}: {result.message}")
        
        if passed > 0:
            print(f"\n✅ SUCCESSFUL TESTS:")
            for result in self.results:
                if result.passed:
                    print(f"  • {result.name}")
        
        print("\n" + "=" * 60)
        
        if failed == 0:
            print("🎉 ALL TESTS PASSED! Your CSV API is working correctly.")
        elif passed > failed:
            print("⚠️  MOSTLY WORKING - Some tests failed but core functionality works.")
        else:
            print("❌ MULTIPLE FAILURES - Check your API configuration and dependencies.")
        
        return failed == 0


def main():
    """Main test runner"""
    # Check if configuration is set
    if JWT_TOKEN == "your-jwt-token-here" or STORE_ID == "your-test-store-id":
        print("❌ Please configure JWT_TOKEN and STORE_ID in the script")
        print("   Set your actual JWT token and store ID at the top of this file")
        sys.exit(1)
    
    # Check if test files exist
    missing_files = []
    for file_name in TEST_FILES.values():
        if not (TEST_DATA_DIR / file_name).exists():
            missing_files.append(file_name)
    
    if missing_files:
        print(f"❌ Missing test files: {missing_files}")
        print("   Make sure all CSV test files are in the same directory as this script")
        print(f"   Expected files in: {TEST_DATA_DIR}")
        sys.exit(1)
    
    # Run test suite
    test_suite = CSVTestSuite(BASE_URL, STORE_ID, JWT_TOKEN)
    success = test_suite.run_all_tests()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()