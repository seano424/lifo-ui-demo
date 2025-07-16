#!/usr/bin/env python3
"""
Test the proper authentication module
"""
import asyncio
import os
from dotenv import load_dotenv
from app.auth.supabase_client import supabase_client, authenticate_for_testing

# Load environment variables
load_dotenv('.env.local')

async def test_auth_module():
    """Test the authentication module"""
    
    # For testing, you can use email/password
    # In production, you'd use service role or other methods
    
    print("Testing authentication module...")
    
    # Option 1: Use service role for server-to-server
    print("\n1. Testing service role token:")
    service_token = supabase_client.get_service_role_token()
    print(f"Service role token: {service_token[:50]}...")
    
    # Test service role authentication
    is_valid = await supabase_client.test_authentication(service_token)
    print(f"Service role token valid: {is_valid}")
    
    # Option 2: For testing with user credentials (if you have them)
    print("\n2. Testing user authentication:")
    print("You can authenticate with email/password for testing:")
    print("session = await supabase_client.authenticate_with_email_password(email, password)")
    print("access_token = session.get('access_token')")
    
    # Option 3: Use your manually extracted token for now
    print("\n3. Testing with your current token:")
    # Replace with your actual token
    current_token = "YOUR_EXTRACTED_TOKEN_HERE"
    print("You can set your extracted token and test with:")
    print(f"is_valid = await supabase_client.test_authentication(current_token)")
    
    # Test API client creation
    print("\n4. Testing API client creation:")
    try:
        client = await supabase_client.create_api_client(use_service_role=True)
        print("✅ Service role API client created successfully")
        await client.aclose()
    except Exception as e:
        print(f"❌ API client creation failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_auth_module())