#!/usr/bin/env python3
"""
Test Supabase Auth server verification
"""

import asyncio
import os

import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv(".env.local")


async def test_auth_server():
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")

    # Test token from user
    token = os.getenv("MANUAL_ACCESS_TOKEN")
    if not token:
        print("❌ MANUAL_ACCESS_TOKEN is not set in the environment variables.")
        return False

    print("Testing Auth server verification...")
    print(f"Supabase URL: {supabase_url}")
    print(f"Anon key: {supabase_anon_key[:20]}...")

    auth_url = f"{supabase_url}/auth/v1/user"
    headers = {"Authorization": f"Bearer {token}", "apikey": supabase_anon_key}

    print(f"Auth URL: {auth_url}")
    print(f"Headers: {headers}")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(auth_url, headers=headers, timeout=10.0)

            print(f"Response status: {response.status_code}")
            print(f"Response headers: {dict(response.headers)}")

            if response.status_code == 200:
                user_data = response.json()
                print(f"User data: {user_data}")
                print("✅ Auth server verification successful!")
                return True
            else:
                print("❌ Auth server verification failed")
                print(f"Response text: {response.text}")
                return False

    except Exception as e:
        print(f"❌ Exception during auth verification: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(test_auth_server())
    exit(0 if success else 1)
