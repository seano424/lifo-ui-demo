#!/usr/bin/env python3
"""
Network diagnostic script to simulate production environment
Run this ON PRODUCTION to diagnose the actual bottleneck
"""
import asyncio
import os
import time
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client
import uuid
import httpx

# Load environment
env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

async def diagnose_network():
    """Comprehensive network diagnostic"""
    
    print("\n" + "="*80)
    print("PRODUCTION NETWORK DIAGNOSTIC")
    print("="*80 + "\n")
    
    # Test 1: DNS Resolution
    print("1️⃣  DNS Resolution Test")
    import socket
    start = time.time()
    try:
        host = SUPABASE_URL.replace("https://", "").replace("http://", "")
        ip = socket.gethostbyname(host)
        dns_time = (time.time() - start) * 1000
        print(f"   ✅ DNS resolved: {host} → {ip}")
        print(f"   ⏱️  Time: {dns_time:.1f}ms")
    except Exception as e:
        print(f"   ❌ DNS failed: {e}")
    
    # Test 2: TCP Connection
    print("\n2️⃣  HTTP Connection Test")
    async with httpx.AsyncClient() as client:
        start = time.time()
        try:
            response = await client.get(f"{SUPABASE_URL}/rest/v1/", 
                                       headers={"apikey": SUPABASE_SERVICE_KEY},
                                       timeout=10.0)
            conn_time = (time.time() - start) * 1000
            print(f"   ✅ HTTP connection successful")
            print(f"   ⏱️  Time: {conn_time:.1f}ms")
            print(f"   📊 Status: {response.status_code}")
        except Exception as e:
            conn_time = (time.time() - start) * 1000
            print(f"   ❌ Connection failed after {conn_time:.1f}ms")
            print(f"   Error: {e}")
    
    # Test 3: Simple Query Latency
    print("\n3️⃣  Simple Query Latency (3 samples)")
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    latencies = []
    for i in range(3):
        start = time.time()
        try:
            result = client.schema("business").table("stores").select("*").limit(1).execute()
            latency = (time.time() - start) * 1000
            latencies.append(latency)
            print(f"   Query {i+1}: {latency:>8.1f}ms")
        except Exception as e:
            latency = (time.time() - start) * 1000
            print(f"   Query {i+1}: {latency:>8.1f}ms (ERROR: {str(e)[:50]})")
        await asyncio.sleep(0.5)
    
    if latencies:
        avg_latency = sum(latencies) / len(latencies)
        print(f"   📊 Average: {avg_latency:.1f}ms")
    
    # Test 4: Small Bulk Insert (10 items)
    print("\n4️⃣  Small Bulk Insert Test (10 items)")
    scores = []
    for i in range(10):
        scores.append({
            "batch_id": str(uuid.uuid4()),
            "store_id": "e3b41480-79a3-4cb7-8151-3fe014a1b60f",
            "composite_score": 0.75,
            "recommendation": "diagnostic_test",
            "calculated_at": datetime.utcnow().isoformat()
        })
    
    start = time.time()
    try:
        result = client.schema("scoring").table("product_scores").upsert(
            scores, on_conflict="batch_id"
        ).execute()
        bulk_time = (time.time() - start) * 1000
        print(f"   ✅ Bulk insert: {bulk_time:.1f}ms")
        print(f"   📊 Per item: {bulk_time/10:.1f}ms")
    except Exception as e:
        bulk_time = (time.time() - start) * 1000
        print(f"   ❌ Bulk insert failed: {bulk_time:.1f}ms")
        print(f"   Error: {str(e)[:100]}")
    
    # Test 5: Large Bulk Insert (100 items)
    print("\n5️⃣  Large Bulk Insert Test (100 items)")
    scores = []
    for i in range(100):
        scores.append({
            "batch_id": str(uuid.uuid4()),
            "store_id": "e3b41480-79a3-4cb7-8151-3fe014a1b60f",
            "composite_score": 0.75,
            "recommendation": "diagnostic_test",
            "calculated_at": datetime.utcnow().isoformat()
        })
    
    start = time.time()
    try:
        result = client.schema("scoring").table("product_scores").upsert(
            scores, on_conflict="batch_id"
        ).execute()
        bulk_time = (time.time() - start) * 1000
        print(f"   ✅ Bulk insert: {bulk_time:.1f}ms")
        print(f"   📊 Per item: {bulk_time/100:.1f}ms")
        
        # Performance assessment
        if bulk_time < 1000:
            print(f"   🎯 EXCELLENT - Production network is healthy")
        elif bulk_time < 5000:
            print(f"   ✅ GOOD - Acceptable performance")
        elif bulk_time < 30000:
            print(f"   ⚠️  SLOW - Network latency issue detected")
        else:
            print(f"   ❌ CRITICAL - Severe performance degradation")
            print(f"   🔍 Investigate: Rate limiting, network routing, connection pooling")
    except Exception as e:
        bulk_time = (time.time() - start) * 1000
        print(f"   ❌ Bulk insert failed: {bulk_time:.1f}ms")
        print(f"   Error: {str(e)[:100]}")
    
    # Test 6: Parallel Requests
    print("\n6️⃣  Parallel Request Test (10 concurrent queries)")
    
    async def single_query():
        start = time.time()
        try:
            result = client.schema("business").table("stores").select("*").limit(1).execute()
            return (time.time() - start) * 1000, "success"
        except Exception as e:
            return (time.time() - start) * 1000, f"error: {str(e)[:30]}"
    
    start = time.time()
    tasks = [single_query() for _ in range(10)]
    results = await asyncio.gather(*tasks)
    total_time = (time.time() - start) * 1000
    
    successful = [r for r in results if r[1] == "success"]
    print(f"   ✅ Successful: {len(successful)}/10")
    print(f"   ⏱️  Total time: {total_time:.1f}ms")
    print(f"   📊 Avg per query: {total_time/10:.1f}ms")
    
    if successful:
        avg_query_time = sum(r[0] for r in successful) / len(successful)
        print(f"   📊 Concurrent overhead: {total_time - avg_query_time:.1f}ms")
    
    # Summary
    print("\n" + "="*80)
    print("DIAGNOSTIC SUMMARY")
    print("="*80)
    print(f"\n📍 Environment: {os.getenv('ENVIRONMENT', 'unknown')}")
    print(f"🌐 Supabase URL: {SUPABASE_URL}")
    print(f"\n🎯 Key Metrics:")
    if latencies:
        print(f"   Simple query latency: {avg_latency:.1f}ms")
    print(f"   10-item bulk insert: {bulk_time if 'bulk_time' in locals() else 'N/A'}ms")
    print(f"\n💡 Recommendations:")
    if avg_latency > 500:
        print("   ⚠️  High base latency - consider using direct PostgreSQL connection")
    if bulk_time > 5000:
        print("   ⚠️  Bulk operations are slow - investigate rate limiting or connection pooling")
    print()

if __name__ == "__main__":
    asyncio.run(diagnose_network())
