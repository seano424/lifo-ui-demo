#!/usr/bin/env python3
"""
LIFO AI API Testing with Authentication
Tests API endpoints with proper JWT tokens
"""

import json
import time
import requests
from typing import Dict, Optional
from test_auth_helper import create_test_user_token, get_supabase_config

class AuthenticatedAPITester:
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.user_token = None
        self.setup_auth()
    
    def setup_auth(self):
        """Setup authentication tokens"""
        try:
            self.user_token = create_test_user_token(
                user_id="test-store-owner-123",
                email="owner@teststore.com"
            )
            print("✅ Authentication tokens ready")
        except Exception as e:
            print(f"❌ Failed to setup auth: {e}")
            raise
    
    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    use_auth: bool = True) -> Dict:
        """Make authenticated API request"""
        url = f"{self.base_url}{endpoint}"
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        if use_auth and self.user_token:
            headers['Authorization'] = f'Bearer {self.user_token}'
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=10)
            elif method.upper() == 'PUT':
                response = requests.put(url, headers=headers, json=data, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            # Try to parse JSON response
            try:
                response_data = response.json()
            except:
                response_data = response.text
            
            return {
                'status_code': response.status_code,
                'success': response.status_code < 400,
                'data': response_data,
                'url': url
            }
        except requests.RequestException as e:
            return {
                'status_code': 0,
                'success': False,
                'error': str(e),
                'url': url
            }
    
    def test_health_endpoints(self):
        """Test basic health endpoints"""
        print("\n🏥 Testing Health Endpoints:")
        print("-" * 40)
        
        # Test root endpoint
        result = self.make_request('GET', '/', use_auth=False)
        print(f"Root endpoint: {result['status_code']} - {'✅' if result['success'] else '❌'}")
        if result['success']:
            print(f"  Response: {result['data']}")
        
        # Test health endpoint
        result = self.make_request('GET', '/health', use_auth=False)
        print(f"Health endpoint: {result['status_code']} - {'✅' if result['success'] else '❌'}")
        if result['success']:
            print(f"  Status: {result['data'].get('status', 'unknown')}")
    
    def test_store_operations(self):
        """Test store-related operations"""
        print("\n🏪 Testing Store Operations:")
        print("-" * 40)
        
        # Test getting stores (requires auth)
        result = self.make_request('GET', '/api/v1/stores')
        print(f"Get stores: {result['status_code']} - {'✅' if result['success'] else '❌'}")
        if result['success']:
            stores = result['data'].get('stores', [])
            print(f"  Found {len(stores)} stores")
            return stores[0]['store_id'] if stores else None
        elif result['status_code'] == 401:
            print("  ⚠️ Authentication required - this is expected")
        else:
            print(f"  Error: {result.get('data', result.get('error'))}")
        
        return None
    
    def test_analytics_endpoints(self, store_id: Optional[str] = None):
        """Test analytics endpoints"""
        print("\n📊 Testing Analytics Endpoints:")
        print("-" * 40)
        
        if not store_id:
            print("⚠️ No store ID available for analytics tests")
            return
        
        # Test analytics endpoint
        result = self.make_request('GET', f'/api/v1/analytics/{store_id}')
        print(f"Analytics: {result['status_code']} - {'✅' if result['success'] else '❌'}")
        if result['success']:
            data = result['data']
            print(f"  Total items: {data.get('total_items', 0)}")
            print(f"  Critical items: {data.get('critical_items', 0)}")
        else:
            print(f"  Error: {result.get('data', result.get('error'))}")
    
    def test_product_operations(self, store_id: Optional[str] = None):
        """Test product operations"""
        print("\n📦 Testing Product Operations:")
        print("-" * 40)
        
        if not store_id:
            print("⚠️ No store ID available for product tests")
            return
        
        # Test adding a product
        test_product = {
            "name": "Test Product API",
            "sku": "TEST-API-001",
            "category": "dry_goods",
            "cost_price": 1.50,
            "selling_price": 3.00,
            "quantity": 10,
            "expiry_date": "2024-12-31"
        }
        
        result = self.make_request('POST', f'/api/v1/stores/{store_id}/products', test_product)
        print(f"Add product: {result['status_code']} - {'✅' if result['success'] else '❌'}")
        if result['success']:
            product_id = result['data'].get('product_id')
            print(f"  Created product: {product_id}")
            return product_id
        else:
            print(f"  Error: {result.get('data', result.get('error'))}")
        
        return None
    
    def test_scoring_endpoints(self, store_id: Optional[str] = None):
        """Test scoring endpoints"""
        print("\n🎯 Testing Scoring Endpoints:")
        print("-" * 40)
        
        if not store_id:
            print("⚠️ No store ID available for scoring tests")
            return
        
        # Test scoring endpoint
        result = self.make_request('POST', f'/api/v1/scoring/batch/{store_id}')
        print(f"Batch scoring: {result['status_code']} - {'✅' if result['success'] else '❌'}")
        if result['success']:
            data = result['data']
            print(f"  Processed batches: {data.get('processed', 0)}")
            print(f"  High urgency: {data.get('summary', {}).get('high_urgency', 0)}")
        else:
            print(f"  Error: {result.get('data', result.get('error'))}")

def check_server_running(base_url: str = "http://localhost:8001") -> bool:
    """Check if the API server is running"""
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        return response.status_code == 200
    except:
        return False

def main():
    """Main testing function"""
    print("🚀 LIFO AI Authenticated API Testing")
    print("=" * 50)
    
    # Check if server is running
    if not check_server_running():
        print("❌ API server is not running!")
        print("\nTo start the server:")
        print("cd lifo_api")
        print("source .venv/bin/activate")
        print("uvicorn app.main:app --reload")
        print("\nThen run this test again.")
        return
    
    try:
        # Initialize tester with authentication
        tester = AuthenticatedAPITester()
        
        # Run tests
        tester.test_health_endpoints()
        
        # Test authenticated endpoints
        store_id = tester.test_store_operations()
        tester.test_analytics_endpoints(store_id)
        tester.test_product_operations(store_id)
        tester.test_scoring_endpoints(store_id)
        
        print("\n✅ API testing completed!")
        print("\n📋 Summary:")
        print("- Health endpoints should work without auth")
        print("- Store operations require valid JWT tokens")
        print("- Analytics and scoring need existing store data")
        print("- Product operations require proper store access")
        
    except Exception as e:
        print(f"❌ Testing failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()