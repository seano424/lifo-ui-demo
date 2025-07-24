#!/usr/bin/env python3
"""
Simple Authentication Test for LIFO AI API
Works with environment variables already loaded
"""

import os
import sys
import json
import time
import requests
from datetime import datetime, timedelta

# Check if JWT is available
try:
    import jwt
except ImportError:
    print("❌ PyJWT not available. Install with:")
    print("pip install PyJWT[cryptography]")
    sys.exit(1)

def check_environment():
    """Check if required environment variables are available"""
    print("🔍 Checking Environment Variables:")
    print("-" * 40)
    
    required_vars = {
        'SUPABASE_URL': os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
        'SUPABASE_JWT_SECRET': os.getenv('SUPABASE_JWT_SECRET'),
        'SUPABASE_ANON_KEY': os.getenv('SUPABASE_ANON_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    }
    
    all_good = True
    for var, value in required_vars.items():
        if value:
            print(f"✅ {var}: {value[:20]}...")
        else:
            print(f"❌ {var}: NOT SET")
            all_good = False
    
    return all_good, required_vars

def create_test_token(jwt_secret: str, user_id: str = "test-user-123") -> str:
    """Create a test JWT token"""
    now = datetime.utcnow()
    payload = {
        'aud': 'authenticated',
        'exp': int((now + timedelta(hours=1)).timestamp()),
        'iat': int(now.timestamp()),
        'sub': user_id,
        'email': 'test@example.com',
        'role': 'authenticated'
    }
    
    return jwt.encode(payload, jwt_secret, algorithm='HS256')

def test_api_endpoint(url: str, token: str = None) -> dict:
    """Test an API endpoint"""
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        return {
            'status': response.status_code,
            'success': response.status_code < 400,
            'data': response.json() if 'application/json' in response.headers.get('content-type', '') else response.text[:200]
        }
    except Exception as e:
        return {'status': 0, 'success': False, 'error': str(e)}

def main():
    print("🚀 Simple LIFO AI Authentication Test")
    print("=" * 50)
    
    # Check environment
    env_ok, env_vars = check_environment()
    
    if not env_ok:
        print("\n❌ Missing required environment variables!")
        print("\nTo fix this, make sure you have a .env.local file with:")
        print("SUPABASE_URL=https://your-project.supabase.co")
        print("SUPABASE_JWT_SECRET=your-jwt-secret")
        print("SUPABASE_ANON_KEY=your-anon-key")
        print("\nOr export them in your shell:")
        print("export SUPABASE_JWT_SECRET='your-secret'")
        return
    
    # Create test token
    print("\n🎫 Creating Test Token:")
    print("-" * 30)
    try:
        token = create_test_token(env_vars['SUPABASE_JWT_SECRET'])
        print(f"✅ Token created: {token[:50]}...")
        
        # Save token for manual testing
        token_data = {
            'token': token,
            'created_at': datetime.utcnow().isoformat(),
            'expires_at': (datetime.utcnow() + timedelta(hours=1)).isoformat()
        }
        
        with open('/tmp/simple_test_token.json', 'w') as f:
            json.dump(token_data, f, indent=2)
        print("💾 Token saved to /tmp/simple_test_token.json")
        
    except Exception as e:
        print(f"❌ Failed to create token: {e}")
        return
    
    # Test API endpoints
    print("\n🧪 Testing API Endpoints:")
    print("-" * 30)
    
    base_url = "http://localhost:8001"
    endpoints = [
        ("Health (no auth)", f"{base_url}/health", False),
        ("API Info (no auth)", f"{base_url}/api/info", False),
        ("Stores (with auth)", f"{base_url}/api/v1/stores", True),
        ("Analytics (with auth)", f"{base_url}/api/v1/analytics/test-store-123", True),
    ]
    
    results = []
    for name, url, needs_auth in endpoints:
        test_token = token if needs_auth else None
        result = test_api_endpoint(url, test_token)
        status_icon = "✅" if result['success'] else "❌"
        print(f"{status_icon} {name}: {result['status']}")
        
        if not result['success'] and result['status'] == 0:
            print("   ⚠️ API server may not be running")
        elif result['status'] == 401:
            print("   🔐 Authentication required (expected for some endpoints)")
        elif result['status'] == 403:
            print("   🚫 Access denied (check permissions)")
        elif result['status'] == 500:
            print("   💥 Server error (check logs)")
        
        results.append((name, result))
    
    # Summary
    print(f"\n📊 Test Summary:")
    print("-" * 30)
    successful = sum(1 for _, result in results if result['success'])
    print(f"Successful requests: {successful}/{len(results)}")
    
    # Manual testing instructions
    print(f"\n🔧 Manual Testing:")
    print("-" * 30)
    print("# Test with curl:")
    print(f"TOKEN='{token}'")
    print(f"curl -H 'Authorization: Bearer $TOKEN' {base_url}/api/v1/stores")
    print("")
    print("# Or load from saved file:")
    print("TOKEN=$(cat /tmp/simple_test_token.json | python3 -c 'import sys,json; print(json.load(sys.stdin)[\"token\"])')")
    print(f"curl -H 'Authorization: Bearer $TOKEN' {base_url}/api/v1/stores")

if __name__ == "__main__":
    main()