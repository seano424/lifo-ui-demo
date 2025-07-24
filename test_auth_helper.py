#!/usr/bin/env python3
"""
Authentication Helper for LIFO AI API Testing
Generates valid JWT tokens for testing API endpoints
"""

import os
import time
import json
import base64
from datetime import datetime, timedelta
from typing import Dict, Optional

try:
    import jwt
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
except ImportError:
    print("❌ Missing dependencies. Install with:")
    print("pip install PyJWT[cryptography]")
    exit(1)

def load_environment():
    """Load environment variables for Supabase"""
    try:
        from dotenv import load_dotenv
        # Try loading from different locations
        loaded = load_dotenv('.env.local')
        if not loaded:
            loaded = load_dotenv('lifo_api/.env.local')
        if loaded:
            print("✅ Environment file loaded successfully")
        else:
            print("⚠️ No .env.local file found, using system environment variables")
    except ImportError:
        print("⚠️ python-dotenv not available, using system env vars only")

def get_supabase_config() -> Dict[str, str]:
    """Get Supabase configuration from environment"""
    load_environment()
    
    config = {
        'url': os.getenv('SUPABASE_URL', os.getenv('NEXT_PUBLIC_SUPABASE_URL')),
        'anon_key': os.getenv('SUPABASE_ANON_KEY', os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')),
        'service_key': os.getenv('SUPABASE_SERVICE_ROLE_KEY'),
        'jwt_secret': os.getenv('SUPABASE_JWT_SECRET'),
    }
    
    print("🔍 Supabase Configuration:")
    print(f"URL: {config['url'][:30] + '...' if config['url'] else 'NOT SET'}")
    print(f"Anon Key: {'SET' if config['anon_key'] else 'NOT SET'}")
    print(f"Service Key: {'SET' if config['service_key'] else 'NOT SET'}")
    print(f"JWT Secret: {'SET' if config['jwt_secret'] else 'NOT SET'}")
    
    return config

def create_test_user_token(user_id: str = "test-user-123", 
                          email: str = "test@example.com",
                          role: str = "authenticated") -> str:
    """
    Create a valid JWT token for testing API endpoints
    This simulates what Supabase would generate for a real user
    """
    config = get_supabase_config()
    
    if not config['jwt_secret']:
        raise ValueError("SUPABASE_JWT_SECRET not found in environment variables")
    
    # Create JWT payload matching Supabase format
    now = datetime.utcnow()
    payload = {
        'aud': 'authenticated',
        'exp': int((now + timedelta(hours=1)).timestamp()),
        'iat': int(now.timestamp()),
        'iss': f"{config['url']}/auth/v1",
        'sub': user_id,
        'email': email,
        'phone': '',
        'app_metadata': {
            'provider': 'email',
            'providers': ['email']
        },
        'user_metadata': {
            'email': email
        },
        'role': role,
        'aal': 'aal1',
        'amr': [{'method': 'password', 'timestamp': int(now.timestamp())}],
        'session_id': f"session-{user_id}-{int(now.timestamp())}"
    }
    
    # Create JWT token
    token = jwt.encode(
        payload, 
        config['jwt_secret'], 
        algorithm='HS256'
    )
    
    print(f"✅ Created JWT token for user: {email}")
    print(f"Token expires: {datetime.fromtimestamp(payload['exp'])}")
    
    return token

def create_service_role_token() -> str:
    """
    Create a service role token for admin operations
    """
    config = get_supabase_config()
    
    if not config['service_key']:
        print("⚠️ Service role key not available, using anon key")
        return config['anon_key'] or ""
    
    return config['service_key']

def test_api_with_auth(endpoint: str = "http://localhost:8001/health", 
                      user_token: Optional[str] = None) -> Dict:
    """
    Test an API endpoint with proper authentication
    """
    import requests
    
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    if user_token:
        headers['Authorization'] = f'Bearer {user_token}'
    
    try:
        response = requests.get(endpoint, headers=headers, timeout=10)
        return {
            'status_code': response.status_code,
            'success': response.status_code < 400,
            'data': response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text,
            'headers': dict(response.headers)
        }
    except requests.RequestException as e:
        return {
            'status_code': 0,
            'success': False,
            'error': str(e),
            'data': None
        }

def main():
    """
    Main function to generate tokens and test API endpoints
    """
    print("🚀 LIFO AI API Authentication Helper")
    print("=" * 50)
    
    try:
        # Check Supabase configuration
        config = get_supabase_config()
        
        if not config['jwt_secret']:
            print("❌ Missing SUPABASE_JWT_SECRET - cannot generate tokens")
            print("\nTo fix this:")
            print("1. Check your .env.local file")
            print("2. Ensure SUPABASE_JWT_SECRET is set")
            print("3. Get it from your Supabase dashboard -> Settings -> API")
            return
        
        # Generate tokens
        print("\n🎫 Generating Test Tokens:")
        print("-" * 30)
        
        # Create a regular user token
        user_token = create_test_user_token()
        print(f"User Token: {user_token[:50]}...")
        
        # Get service role token
        service_token = create_service_role_token()
        print(f"Service Token: {service_token[:50]}...")
        
        # Save tokens for use in tests
        tokens = {
            'user_token': user_token,
            'service_token': service_token,
            'created_at': datetime.utcnow().isoformat(),
            'expires_at': (datetime.utcnow() + timedelta(hours=1)).isoformat()
        }
        
        with open('/tmp/lifo_test_tokens.json', 'w') as f:
            json.dump(tokens, f, indent=2)
        
        print(f"\n💾 Tokens saved to: /tmp/lifo_test_tokens.json")
        
        # Test API endpoints
        print("\n🧪 Testing API Endpoints:")
        print("-" * 30)
        
        # Test without auth
        result = test_api_with_auth("http://localhost:8001/health")
        print(f"Health (no auth): {result['status_code']} - {'✅' if result['success'] else '❌'}")
        
        # Test with user auth (this will likely fail if server isn't running)
        result = test_api_with_auth("http://localhost:8001/api/v1/stores", user_token)
        print(f"Stores (user auth): {result['status_code']} - {'✅' if result['success'] else '❌'}")
        
        if not result['success'] and result['status_code'] == 0:
            print("⚠️ API server doesn't appear to be running")
            print("Start it with: cd lifo_api && uvicorn app.main:app --reload")
        
        print("\n📋 Usage Instructions:")
        print("-" * 30)
        print("1. Start the API server:")
        print("   cd lifo_api && uvicorn app.main:app --port 8001 --reload")
        print("\n2. Use the tokens in your tests:")
        print("   curl -H 'Authorization: Bearer <user_token>' http://localhost:8001/api/v1/stores")
        print("\n3. Or load tokens in Python:")
        print("   import json")
        print("   with open('/tmp/lifo_test_tokens.json') as f:")
        print("       tokens = json.load(f)")
        print("   headers = {'Authorization': f'Bearer {tokens[\"user_token\"]}'}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()