# Supabase Python Client Authentication Guide

## Problem Statement

The current approach `client.auth._client.headers.update({"Authorization": f"Bearer {user_token}"})` fails with:

```
"Cannot access attribute "_client" for class "SyncSupabaseAuthClient" - Attribute "_client" is unknown"
```

## Root Cause Analysis

1. **Private Attribute Access**: The `_client` attribute doesn't exist on `SyncSupabaseAuthClient`
2. **Architecture Difference**: Python client has different internal structure than JavaScript client
3. **API Changes**: Accessing private/internal attributes is not part of the public API

## Object Hierarchy Understanding

```python
# Correct Supabase Python Client Structure:
client = create_client(url, key)
├── client.auth                    # SyncSupabaseAuthClient (extends SyncGoTrueClient)
├── client.options                 # SyncClientOptions
│   └── client.options.headers     # Dict[str, str] ✅ THIS IS THE CORRECT PATH
├── client.postgrest              # SyncPostgrestClient
├── client.storage                # SyncStorageClient
└── client.functions              # SyncFunctionsClient

# WRONG (doesn't exist):
client.auth._client.headers        # ❌ DOES NOT EXIST

# CORRECT (public API):
client.options.headers             # ✅ CORRECT PATH
client.auth.set_session()          # ✅ OFFICIAL METHOD
```

## Solution 1: Official `set_session()` Method (RECOMMENDED)

```python
def get_user_client(self, user_token: str) -> Client:
    """Get client with user context for RLS-compliant operations"""
    client = create_client(self.url, self.anon_key)
    
    # Official method: Use set_session with access token
    # refresh_token can be None for server-side JWT scenarios
    try:
        client.auth.set_session(access_token=user_token, refresh_token=None)
    except Exception as e:
        logger.warning("Failed to set session with token", error=str(e))
        # Fallback to header method
        client.options.headers["Authorization"] = f"Bearer {user_token}"
    
    return client
```

**Why this works:**
- Uses the official Supabase API method
- Documented in Supabase Python reference
- Handles JWT validation and session management
- `refresh_token=None` is valid for server-side JWT-only scenarios

## Solution 2: Update `client.options.headers` (ALTERNATIVE)

```python
def get_user_client(self, user_token: str) -> Client:
    """Get client with user context for RLS-compliant operations"""
    client = create_client(self.url, self.anon_key)
    
    # Direct header manipulation (correct path)
    client.options.headers["Authorization"] = f"Bearer {user_token}"
    
    return client
```

**Why this works:**
- `client.options.headers` is the correct public API path
- This is where the client actually reads headers from
- Matches the internal `_get_auth_headers()` method behavior

## Solution 3: Headers During Client Creation (MOST EFFICIENT)

```python
from supabase.lib.client_options import SyncClientOptions

def get_user_client(self, user_token: str) -> Client:
    """Get client with user context for RLS-compliant operations"""
    
    # Create client options with Authorization header
    options = SyncClientOptions(
        headers={
            "Authorization": f"Bearer {user_token}"
        }
    )
    
    client = create_client(self.url, self.anon_key, options=options)
    return client
```

**Why this works:**
- Sets headers during client initialization
- Most efficient (no post-creation modifications)
- Clean separation of concerns

## Solution 4: Manual Session Creation (ADVANCED)

```python
from gotrue.types import Session
import time

def get_user_client(self, user_token: str) -> Client:
    """Get client with user context for RLS-compliant operations"""
    client = create_client(self.url, self.anon_key)
    
    # Create session object manually for advanced control
    session = Session(
        access_token=user_token,
        token_type="bearer",
        expires_in=3600,  # 1 hour
        expires_at=int(time.time()) + 3600,
        refresh_token=None,
        user=None  # Will be populated when used
    )
    
    client.auth.set_session(
        access_token=session.access_token,
        refresh_token=session.refresh_token
    )
    
    return client
```

## Understanding the Client Internals

The Supabase Python client uses this authentication flow:

1. **Client Creation**: `create_client()` initializes with base headers
2. **Header Management**: Headers stored in `client.options.headers`
3. **Auth Events**: `_listen_to_auth_events()` updates headers automatically
4. **Request Flow**: All services (postgrest, storage, functions) use `client.options.headers`

```python
# Internal flow (from Supabase source):
def _get_auth_headers(self, authorization: Optional[str] = None) -> Dict[str, str]:
    if authorization is None:
        authorization = self.options.headers.get(
            "Authorization", self._create_auth_header(self.supabase_key)
        )
    return {
        "apiKey": self.supabase_key,
        "Authorization": authorization,
    }
```

## Testing Your Implementation

```python
# Test script to verify authentication works
def test_authentication(supabase_url: str, anon_key: str, user_token: str):
    from app.database.supabase_service import get_supabase_service
    
    service = get_supabase_service()
    
    try:
        # Test user client creation
        user_client = service.get_user_client(user_token)
        
        # Verify headers are set correctly
        auth_header = user_client.options.headers.get("Authorization")
        assert auth_header == f"Bearer {user_token}", "Authorization header not set correctly"
        
        # Test a simple query (this will verify RLS works)
        result = user_client.table("stores").select("*").limit(1).execute()
        
        print("✅ Authentication working correctly")
        return True
        
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        return False
```

## Best Practices for Server-Side Authentication

1. **Use Solution 1** (`set_session()`) as primary method with fallback
2. **Validate JWT tokens** before using them
3. **Handle token expiration** gracefully
4. **Log authentication attempts** for debugging
5. **Use try-catch blocks** for robust error handling

## Alternative Approaches for Different Scenarios

### Scenario 1: You have both access_token and refresh_token
```python
client.auth.set_session(access_token=access_token, refresh_token=refresh_token)
```

### Scenario 2: Server-side with JWT only (your case)
```python
client.auth.set_session(access_token=user_token, refresh_token=None)
```

### Scenario 3: Custom HTTP client with pre-configured headers
```python
import httpx
from supabase.lib.client_options import SyncClientOptions

http_client = httpx.Client(
    headers={"Authorization": f"Bearer {user_token}"}
)
options = SyncClientOptions(httpx_client=http_client)
client = create_client(url, key, options=options)
```

## Debugging Authentication Issues

```python
def debug_client_auth(client):
    """Debug helper to inspect client authentication state"""
    print("=== Client Authentication Debug ===")
    print(f"Headers: {client.options.headers}")
    print(f"Auth URL: {client.auth_url}")
    print(f"Current session: {client.auth.get_session()}")
    print(f"Available auth methods: {[m for m in dir(client.auth) if not m.startswith('_')]}")
```

## Key Takeaways

1. **Never access private attributes** (those starting with `_`)
2. **Use `client.options.headers`** for manual header manipulation
3. **Prefer `client.auth.set_session()`** for session management
4. **Handle errors gracefully** with try-catch blocks
5. **Test with actual Supabase operations** to verify RLS works

The corrected implementation in `/home/slim/lifo-app/lifo_api/app/database/supabase_service.py` now uses the proper authentication methods and should work correctly for your server-side JWT authentication needs.