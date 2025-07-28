#!/usr/bin/env python3
"""
Generate JWT tokens for test users
This bypasses the frontend signup and gives you direct API access
"""

import os
import jwt
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment
load_dotenv(".env.local")

def generate_test_jwt_token(user_email: str, user_id: str = None):
    """Generate a JWT token for testing"""
    
    jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
    if not jwt_secret:
        print("❌ SUPABASE_JWT_SECRET not found in environment")
        return None
    
    # Generate a fake user_id if not provided
    if not user_id:
        import uuid
        user_id = str(uuid.uuid4())
    
    # Create JWT payload (mimicking Supabase auth)
    now = datetime.utcnow()
    payload = {
        "aud": "authenticated",
        "exp": int((now + timedelta(hours=24)).timestamp()),  # 24 hour expiry
        "iat": int(now.timestamp()),
        "iss": "supabase",
        "sub": user_id,
        "email": user_email,
        "role": "authenticated",
        "app_metadata": {
            "provider": "email",
            "providers": ["email"]
        },
        "user_metadata": {
            "email": user_email
        }
    }
    
    try:
        # Generate JWT token
        token = jwt.encode(payload, jwt_secret, algorithm="HS256")
        return token
    except Exception as e:
        print(f"❌ JWT generation failed: {e}")
        return None

def get_real_test_users():
    """Get real test users from database"""
    import asyncio
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text
    
    async def fetch_users():
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            return []
        
        try:
            engine = create_async_engine(database_url)
            async with engine.begin() as conn:
                result = await conn.execute(
                    text("""
                        SELECT 
                            au.id,
                            au.email,
                            su.role_in_store
                        FROM auth.users au
                        JOIN business.store_users su ON au.id = su.user_id
                        JOIN business.stores s ON su.store_id = s.store_id
                        WHERE s.store_code = 'TEST-PIN-001'
                        AND au.email LIKE '%lifo-test.com'
                        ORDER BY su.role_in_store DESC
                        LIMIT 3
                    """)
                )
                
                users = []
                for row in result.fetchall():
                    users.append({
                        "id": str(row[0]),
                        "email": row[1],
                        "role": row[2]
                    })
                return users
            
        except Exception as e:
            print(f"❌ Database query failed: {e}")
            return []
    
    return asyncio.run(fetch_users())

def main():
    """Generate test JWT tokens"""
    
    print("🔑 JWT Token Generator for API Testing")
    print("=" * 60)
    
    # Try to get real users from database
    print("🔍 Looking up test users from database...")
    real_users = get_real_test_users()
    
    if real_users:
        print(f"✅ Found {len(real_users)} test users:")
        print()
        
        for user in real_users:
            print(f"👤 {user['email']} ({user['role']})")
            token = generate_test_jwt_token(user['email'], user['id'])
            
            if token:
                print(f"🔑 JWT Token:")
                print(f"   {token}")
                print()
                
                # Save to file for easy copy-paste
                filename = f"test_jwt_{user['role']}.txt"
                with open(filename, 'w') as f:
                    f.write(token)
                print(f"💾 Saved to: {filename}")
                print("─" * 60)
        
        # Test with curl command
        if real_users:
            manager_user = next((u for u in real_users if u['role'] == 'manager'), real_users[0])
            manager_token = generate_test_jwt_token(manager_user['email'], manager_user['id'])
            
            print("🧪 Test Commands:")
            print(f"export JWT_TOKEN='{manager_token}'")
            print()
            print("# Test store access:")
            print(f"curl -H \"Authorization: Bearer $JWT_TOKEN\" \\")
            print(f"     http://localhost:8001/api/v1/analytics/store/8ab99a75-9d41-454c-95a4-ad2697e30bb3")
            print()
            print("# Test OCR endpoint:")
            print(f"curl -X POST \\")
            print(f"     -H \"Authorization: Bearer $JWT_TOKEN\" \\")
            print(f"     -F \"image=@test_data/images/clear_expiry_date.jpg\" \\")
            print(f"     -F \"date_format_hint=DD/MM/YYYY\" \\")
            print(f"     http://localhost:8001/api/v1/image-recognition/extract-expiry-date/8ab99a75-9d41-454c-95a4-ad2697e30bb3")
            
    else:
        print("⚠️  No real users found, generating test tokens...")
        
        # Fallback: generate tokens for test emails
        test_users = [
            {"email": "test.manager@lifo-test.com", "role": "manager"},
            {"email": "test.owner@lifo-test.com", "role": "owner"},
            {"email": "test.employee@lifo-test.com", "role": "employee"}
        ]
        
        for user in test_users:
            print(f"👤 {user['email']} ({user['role']})")
            token = generate_test_jwt_token(user['email'])
            
            if token:
                print(f"🔑 JWT Token:")
                print(f"   {token}")
                print()
                
                filename = f"test_jwt_{user['role']}.txt"
                with open(filename, 'w') as f:
                    f.write(token)
                print(f"💾 Saved to: {filename}")
                print("─" * 60)

if __name__ == "__main__":
    main()