#!/usr/bin/env python3
"""
LIFO AI JWT Token Extractor - Demo Script

A simple demonstration of how to use the JWT extraction tools
in your own scripts and applications.
"""

import asyncio
import json
from pathlib import Path
import sys

# Add tools directory to path
sys.path.append(str(Path(__file__).parent))

try:
    from jwt_extractor import JWTExtractor, EnvironmentConfig
    import httpx
    from rich.console import Console
    from rich.panel import Panel
except ImportError as e:
    print(f"❌ Missing dependencies: {e}")
    print("💡 Run: pip install httpx pyjwt rich")
    sys.exit(1)

console = Console()

async def demo_basic_extraction():
    """Demo: Basic token extraction"""
    console.print(Panel("📋 Demo 1: Basic Token Extraction", style="blue"))
    
    extractor = JWTExtractor()
    
    # Extract token using all available sources
    token = await extractor.extract_best_token()
    
    if token:
        console.print(f"✅ Successfully extracted token: {token[:50]}...")
        return token
    else:
        console.print("❌ No valid token found")
        return None

async def demo_token_analysis(token: str):
    """Demo: Token analysis and validation"""
    console.print(Panel("🔍 Demo 2: Token Analysis", style="green"))
    
    config = EnvironmentConfig()
    extractor = JWTExtractor()
    
    # Analyze the token
    analysis = await extractor.validator.validate_token(token)
    
    console.print("📊 Token Analysis Results:")
    console.print(f"  • Valid: {'✅' if analysis['valid'] else '❌'}")
    console.print(f"  • Type: {analysis['token_type']}")
    console.print(f"  • Expired: {'❌' if analysis['expired'] else '✅'}")
    
    if analysis['expires_at']:
        from datetime import datetime
        exp_time = datetime.fromtimestamp(analysis['expires_at'])
        console.print(f"  • Expires: {exp_time}")
        
    if analysis['subject']:
        console.print(f"  • Subject: {analysis['subject']}")
        
    return analysis

async def demo_api_call(token: str):
    """Demo: Making authenticated API calls"""
    console.print(Panel("🌐 Demo 3: Authenticated API Call", style="yellow"))
    
    config = EnvironmentConfig()
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Try a simple health check
            response = await client.get(f"{config.api_url}/health", headers=headers)
            
            console.print(f"📡 API Call to {config.api_url}/health")
            console.print(f"  • Status: {response.status_code}")
            console.print(f"  • Response: {response.text[:100]}...")
            
            if response.status_code == 200:
                console.print("✅ API call successful!")
            else:
                console.print("⚠️ API call returned non-200 status")
                
    except Exception as e:
        console.print(f"❌ API call failed: {e}")

async def demo_interactive_login():
    """Demo: Interactive login flow"""
    console.print(Panel("🔐 Demo 4: Interactive Login", style="red"))
    
    config = EnvironmentConfig()
    
    if not config.supabase_url or not config.supabase_anon_key:
        console.print("❌ Supabase configuration not found - skipping interactive demo")
        return None
        
    from jwt_extractor import SupabaseAuthExtractor
    
    supabase_auth = SupabaseAuthExtractor(config)
    
    console.print("🔑 This would prompt for email/password in interactive mode")
    console.print("💡 Try: python tools/jwt_extractor.py --interactive")
    
    return None

async def demo_token_caching():
    """Demo: Token caching functionality"""
    console.print(Panel("💾 Demo 5: Token Caching", style="magenta"))
    
    from jwt_extractor import CachedTokenExtractor
    
    cache = CachedTokenExtractor()
    
    # Check if there's a cached token
    cached_token = await cache.extract_token()
    
    if cached_token:
        console.print(f"✅ Found cached token: {cached_token[:30]}...")
    else:
        console.print("❌ No cached token found")
        
    console.print(f"💾 Cache location: {cache.cache_file}")

async def demo_environment_detection():
    """Demo: Environment and configuration detection"""
    console.print(Panel("🌍 Demo 6: Environment Detection", style="cyan"))
    
    config = EnvironmentConfig()
    
    console.print("📋 Configuration Summary:")
    console.print(f"  • Environment: {config.environment}")
    console.print(f"  • API URL: {config.api_url}")
    console.print(f"  • Supabase URL: {config.supabase_url or 'Not configured'}")
    console.print(f"  • Config files checked: {[str(f) for f in config.env_files]}")
    
    # Show some environment variables (without exposing secrets)
    console.print("\n🔑 Environment Variables (keys only):")
    env_keys = [k for k in config.config.keys() if any(
        secret in k.upper() for secret in ['TOKEN', 'KEY', 'SECRET', 'PASSWORD']
    )]
    for key in sorted(env_keys):
        console.print(f"  • {key}: {'✅ Set' if config.config[key] else '❌ Not set'}")

async def main():
    """Run all demos"""
    console.print("🚀 LIFO AI JWT Token Extractor - Demo Script")
    console.print("=" * 60)
    
    # Demo 1: Basic extraction
    token = await demo_basic_extraction()
    
    if token:
        # Demo 2: Token analysis
        await demo_token_analysis(token)
        
        # Demo 3: API call
        await demo_api_call(token)
    
    # Demo 4: Interactive login (informational)
    await demo_interactive_login()
    
    # Demo 5: Token caching
    await demo_token_caching()
    
    # Demo 6: Environment detection
    await demo_environment_detection()
    
    console.print("\n🎉 Demo completed!")
    console.print("\n💡 Try these commands:")
    console.print("  • python tools/jwt_extractor.py --help")
    console.print("  • ./tools/get_jwt.sh --help") 
    console.print("  • python tools/test_api_with_auto_auth.py --help")

if __name__ == '__main__':
    asyncio.run(main())