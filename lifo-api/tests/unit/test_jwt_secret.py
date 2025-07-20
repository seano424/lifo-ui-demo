#!/usr/bin/env python3
"""
Test JWT secret verification
"""
import jwt
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

def test_jwt_secret():
    jwt_secret = os.getenv('SUPABASE_JWT_SECRET')
    
    # Test token from user
    token = os.getenv('MANUAL_ACCESS_TOKEN')
    if not token:
        print("❌ MANUAL_ACCESS_TOKEN is not set in the environment variables.")
        return False
    
    print(f"Testing JWT secret verification...")
    print(f"JWT secret: {jwt_secret[:20]}...")
    
    try:
        # Test with different options
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_aud": True,
                "require": ["exp", "iat", "sub"]
            }
        )
        
        print("✅ JWT secret verification successful!")
        print(f"User ID: {payload.get('sub')}")
        print(f"Email: {payload.get('email')}")
        return True
        
    except jwt.ExpiredSignatureError:
        print("❌ Token expired")
        return False
    except jwt.InvalidTokenError as e:
        print(f"❌ Invalid token: {e}")
        return False
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

if __name__ == "__main__":
    success = test_jwt_secret()
    exit(0 if success else 1)