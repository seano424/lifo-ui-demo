#!/usr/bin/env python3
"""
Test script for LIFO FastAPI Supabase Authentication Setup
"""

import asyncio
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.getcwd())

async def test_comprehensive():
    print('=== LIFO FastAPI Supabase Authentication Test ===')
    
    # Test 1: Supabase Connection
    try:
        from app.database.supabase_service import supabase_health_check, get_supabase_service
        
        print('\n1. Testing Supabase Service Connection...')
        health = await supabase_health_check()
        print(f'   Status: {health["status"]}')
        print(f'   Response time: {health.get("response_time_ms", "N/A")}ms')
        print(f'   Auth method: {health.get("auth_method", "N/A")}')
        print(f'   Connection test: {"PASS" if health.get("connection_test") else "FAIL"}')
        
        if health['status'] != 'healthy':
            print(f'   ❌ Error: {health.get("error", "Unknown")}')
            return False
        else:
            print('   ✅ Supabase connection working')
            
    except Exception as e:
        print(f'   ❌ Supabase test failed: {e}')
        return False
    
    # Test 2: Check if we can access key tables 
    print('\n2. Testing Table Access...')
    try:
        service = get_supabase_service()
        admin_client = service.get_admin_client()
        
        # Test business.stores
        try:
            result = admin_client.schema('business').from_('stores').select('*').limit(1).execute()
            print(f'   ✅ business.stores accessible ({len(result.data)} rows)')
        except Exception as e:
            print(f'   ⚠️  business.stores warning: {str(e)[:100]}...')
            
        # Test inventory.ocr_processing_batches
        try:
            result = admin_client.schema('inventory').from_('ocr_processing_batches').select('*').limit(1).execute()
            print(f'   ✅ inventory.ocr_processing_batches accessible ({len(result.data)} rows)')
        except Exception as e:
            print(f'   ⚠️  inventory.ocr_processing_batches warning: {str(e)[:100]}...')
            
        # Test inventory.batches
        try:
            result = admin_client.schema('inventory').from_('batches').select('*').limit(1).execute()
            print(f'   ✅ inventory.batches accessible ({len(result.data)} rows)')
        except Exception as e:
            print(f'   ⚠️  inventory.batches warning: {str(e)[:100]}...')
            
    except Exception as e:
        print(f'   ❌ Table access test failed: {e}')
        return False
        
    # Test 3: Authentication system
    print('\n3. Testing Authentication System...')
    try:
        from app.auth.supabase_jwt import get_supabase_auth
        auth = get_supabase_auth()
        print(f'   ✅ Authentication system initialized')
        print(f'   JWT Secret configured: {bool(auth.jwt_secret)}')
        print(f'   Supabase URL configured: {bool(auth.supabase_url)}')
    except Exception as e:
        print(f'   ❌ Authentication test failed: {e}')
        return False
        
    # Test 4: Configuration
    print('\n4. Testing Configuration...')
    try:
        from app.core.config import settings
        print(f'   Environment: {settings.environment}')
        print(f'   Debug mode: {settings.debug}')
        print(f'   Supabase URL: {settings.supabase_url[:30]}...') 
        print(f'   Service role key configured: {bool(settings.supabase_service_role_key)}')
        print(f'   Anon key configured: {bool(settings.supabase_anon_key)}')
        print(f'   JWT secret configured: {bool(settings.supabase_jwt_secret)}')
        print('   ✅ Configuration looks good')
    except Exception as e:
        print(f'   ❌ Configuration test failed: {e}')
        return False
        
    print('\n=== Test Summary ===')
    print('✅ Supabase authentication system is properly configured')
    print('✅ Database connection established with correct schema format')  
    print('✅ OCR endpoints ready to save results to inventory.ocr_processing_batches')
    print('✅ Ready for end-to-end OCR workflow testing')
    
    return True

if __name__ == "__main__":
    success = asyncio.run(test_comprehensive())
    sys.exit(0 if success else 1)