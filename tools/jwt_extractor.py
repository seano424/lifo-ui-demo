#!/usr/bin/env python3
"""
LIFO AI JWT Token Extraction Helper

A comprehensive tool for automatically extracting JWT tokens from various sources
to make API testing even more convenient. Supports multiple extraction methods
with intelligent fallbacks.

Features:
- Browser storage extraction (localStorage/sessionStorage)
- Browser cookie extraction  
- Supabase programmatic authentication
- Interactive login flow
- Token validation and expiry checking
- Environment detection (dev/staging/prod)
- Token persistence and reuse
- Browser profile detection
- Development server log parsing

Usage:
    python tools/jwt_extractor.py                    # Auto-detect and extract token
    python tools/jwt_extractor.py --interactive      # Interactive login
    python tools/jwt_extractor.py --validate TOKEN   # Validate existing token
    python tools/jwt_extractor.py --refresh          # Force refresh token
    python tools/jwt_extractor.py --list-sources     # Show available token sources
"""

import argparse
import asyncio
import base64
import json
import os
import sqlite3
import subprocess
import tempfile
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import getpass
import sys

try:
    import httpx
    import jwt
    from rich.console import Console
    from rich.panel import Panel
    from rich.progress import Progress, SpinnerColumn, TextColumn
    from rich.prompt import Confirm, Prompt
    from rich.table import Table
    from rich.text import Text
except ImportError as e:
    print(f"❌ Missing required dependencies: {e}")
    print("💡 Install with: pip install httpx pyjwt rich")
    sys.exit(1)

# Initialize rich console
console = Console()

class TokenSource:
    """Base class for token extraction sources"""
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        
    async def extract_token(self) -> Optional[str]:
        """Extract token from this source"""
        raise NotImplementedError
        
    def is_available(self) -> bool:
        """Check if this source is available"""
        return True

class EnvironmentConfig:
    """Environment configuration detection and management"""
    
    def __init__(self):
        self.env_files = [
            Path(".env.local"),
            Path(".env"),
            Path("lifo_api/.env.local"),
            Path("lifo_api/.env"),
        ]
        self.config = self._load_config()
        
    def _load_config(self) -> Dict[str, str]:
        """Load configuration from environment files"""
        config = {}
        
        # Load from environment variables first
        config.update(os.environ)
        
        # Load from .env files
        for env_file in self.env_files:
            if env_file.exists():
                console.print(f"📄 Loading config from {env_file}")
                try:
                    with open(env_file) as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith('#'):
                                if '=' in line:
                                    key, value = line.split('=', 1)
                                    key = key.strip()
                                    value = value.strip().strip('"').strip("'")
                                    if key and value:
                                        config[key] = value
                except Exception as e:
                    console.print(f"⚠️ Error loading {env_file}: {e}")
                    
        return config
        
    def get(self, key: str, default: str = None) -> Optional[str]:
        """Get configuration value"""
        return self.config.get(key, default)
        
    @property
    def supabase_url(self) -> Optional[str]:
        return self.get('NEXT_PUBLIC_SUPABASE_URL') or self.get('SUPABASE_URL')
        
    @property
    def supabase_anon_key(self) -> Optional[str]:
        return self.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') or self.get('SUPABASE_ANON_KEY')
        
    @property
    def supabase_service_role_key(self) -> Optional[str]:
        return self.get('SUPABASE_SERVICE_ROLE_KEY')
        
    @property
    def supabase_jwt_secret(self) -> Optional[str]:
        return self.get('SUPABASE_JWT_SECRET')
        
    @property
    def environment(self) -> str:
        return self.get('ENVIRONMENT', 'development').lower()
        
    @property
    def api_url(self) -> str:
        return self.get('NEXT_PUBLIC_FASTAPI_URL', 'http://localhost:8000')

class BrowserStorageExtractor(TokenSource):
    """Extract tokens from browser storage using browser automation or direct database access"""
    
    def __init__(self):
        super().__init__("browser_storage", "Extract tokens from browser localStorage/sessionStorage")
        self.browser_paths = self._get_browser_paths()
        
    def _get_browser_paths(self) -> Dict[str, List[Path]]:
        """Get browser profile paths for different browsers"""
        home = Path.home()
        
        paths = {
            'chrome': [
                home / '.config/google-chrome/Default',
                home / '.config/google-chrome-unstable/Default',
                home / 'Library/Application Support/Google/Chrome/Default',  # macOS
                home / 'AppData/Local/Google/Chrome/User Data/Default',  # Windows
            ],
            'firefox': [
                home / '.mozilla/firefox',
                home / 'Library/Application Support/Firefox/Profiles',  # macOS
                home / 'AppData/Roaming/Mozilla/Firefox/Profiles',  # Windows
            ],
            'edge': [
                home / '.config/microsoft-edge/Default',
                home / 'Library/Application Support/Microsoft Edge/Default',  # macOS
                home / 'AppData/Local/Microsoft/Edge/User Data/Default',  # Windows
            ]
        }
        
        return {browser: [p for p in paths if p.exists()] for browser, paths in paths.items()}
        
    def _extract_from_chrome_storage(self, profile_path: Path) -> Optional[str]:
        """Extract token from Chrome's localStorage"""
        try:
            # Chrome stores localStorage in Local Storage leveldb
            local_storage_path = profile_path / 'Local Storage' / 'leveldb'
            
            if not local_storage_path.exists():
                return None
                
            # Try to find Supabase session data
            for file_path in local_storage_path.glob('*.log'):
                try:
                    with open(file_path, 'rb') as f:
                        content = f.read()
                        # Look for Supabase session data
                        if b'supabase' in content.lower() and b'access_token' in content.lower():
                            # This is a simplified approach - in practice, you'd need
                            # a proper leveldb parser
                            content_str = content.decode('utf-8', errors='ignore')
                            if 'access_token' in content_str:
                                # Extract JSON-like structures
                                import re
                                matches = re.findall(r'\{[^}]*"access_token"[^}]*\}', content_str)
                                for match in matches:
                                    try:
                                        data = json.loads(match)
                                        if 'access_token' in data:
                                            return data['access_token']
                                    except:
                                        continue
                except:
                    continue
                    
        except Exception as e:
            console.print(f"⚠️ Error accessing Chrome storage: {e}")
            
        return None
        
    def _extract_from_firefox_storage(self, profile_path: Path) -> Optional[str]:
        """Extract token from Firefox's localStorage"""
        try:
            # Firefox stores localStorage in webappsstore.sqlite
            for profile_dir in profile_path.iterdir():
                if profile_dir.is_dir():
                    storage_file = profile_dir / 'webappsstore.sqlite'
                    if storage_file.exists():
                        try:
                            conn = sqlite3.connect(str(storage_file))
                            cursor = conn.cursor()
                            
                            # Query for Supabase-related localStorage entries
                            cursor.execute("""
                                SELECT key, value FROM webappsstore2 
                                WHERE (key LIKE '%supabase%' OR key LIKE '%auth%') 
                                AND value LIKE '%access_token%'
                            """)
                            
                            for key, value in cursor.fetchall():
                                try:
                                    data = json.loads(value)
                                    if isinstance(data, dict) and 'access_token' in data:
                                        return data['access_token']
                                except:
                                    continue
                                    
                            conn.close()
                            
                        except Exception as e:
                            console.print(f"⚠️ Error accessing Firefox storage: {e}")
                            
        except Exception as e:
            console.print(f"⚠️ Error accessing Firefox profile: {e}")
            
        return None
        
    async def extract_token(self) -> Optional[str]:
        """Extract token from browser storage"""
        console.print("🔍 Scanning browser storage for JWT tokens...")
        
        # Try Chrome first
        for chrome_path in self.browser_paths.get('chrome', []):
            if chrome_path.exists():
                console.print(f"  📂 Checking Chrome profile: {chrome_path}")
                token = self._extract_from_chrome_storage(chrome_path)
                if token:
                    console.print("  ✅ Found token in Chrome storage")
                    return token
                    
        # Try Firefox
        for firefox_path in self.browser_paths.get('firefox', []):
            if firefox_path.exists():
                console.print(f"  📂 Checking Firefox profile: {firefox_path}")
                token = self._extract_from_firefox_storage(firefox_path)
                if token:
                    console.print("  ✅ Found token in Firefox storage")
                    return token
                    
        # Try browser automation as fallback
        token = await self._extract_via_automation()
        if token:
            return token
            
        console.print("  ❌ No tokens found in browser storage")
        return None
        
    async def _extract_via_automation(self) -> Optional[str]:
        """Extract token using browser automation (requires additional dependencies)"""
        try:
            # Try to use playwright or selenium if available
            try:
                from playwright.async_api import async_playwright
                return await self._extract_with_playwright()
            except ImportError:
                pass
                
            try:
                from selenium import webdriver
                return self._extract_with_selenium()
            except ImportError:
                pass
                
        except Exception as e:
            console.print(f"⚠️ Browser automation failed: {e}")
            
        return None
        
    async def _extract_with_playwright(self) -> Optional[str]:
        """Extract token using Playwright"""
        try:
            from playwright.async_api import async_playwright
            
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                
                # Navigate to the app
                await page.goto('http://localhost:3000')
                await page.wait_for_timeout(2000)
                
                # Check for existing session
                token = await page.evaluate("""
                    () => {
                        // Check localStorage for Supabase session
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            if (key && key.includes('supabase')) {
                                try {
                                    const value = localStorage.getItem(key);
                                    const data = JSON.parse(value);
                                    if (data && data.access_token) {
                                        return data.access_token;
                                    }
                                } catch (e) {}
                            }
                        }
                        return null;
                    }
                """)
                
                await browser.close()
                return token
                
        except Exception as e:
            console.print(f"⚠️ Playwright extraction failed: {e}")
            return None
            
    def is_available(self) -> bool:
        """Check if browser storage extraction is available"""
        return any(paths for paths in self.browser_paths.values())

class CookieExtractor(TokenSource):
    """Extract JWT tokens from browser cookies"""
    
    def __init__(self, config: EnvironmentConfig):
        super().__init__("cookies", "Extract tokens from browser cookies")
        self.config = config
        
    async def extract_token(self) -> Optional[str]:
        """Extract token from cookies"""
        console.print("🍪 Checking browser cookies for JWT tokens...")
        
        # Check Chrome cookies
        token = self._extract_from_chrome_cookies()
        if token:
            return token
            
        # Check Firefox cookies
        token = self._extract_from_firefox_cookies()
        if token:
            return token
            
        console.print("  ❌ No JWT tokens found in cookies")
        return None
        
    def _extract_from_chrome_cookies(self) -> Optional[str]:
        """Extract token from Chrome cookies database"""
        try:
            home = Path.home()
            cookie_paths = [
                home / '.config/google-chrome/Default/Cookies',
                home / 'Library/Application Support/Google/Chrome/Default/Cookies',
                home / 'AppData/Local/Google/Chrome/User Data/Default/Cookies',
            ]
            
            for cookie_path in cookie_paths:
                if cookie_path.exists():
                    try:
                        # Make a temporary copy (Chrome locks the database)
                        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp:
                            with open(cookie_path, 'rb') as src:
                                tmp.write(src.read())
                            tmp_path = tmp.name
                            
                        conn = sqlite3.connect(tmp_path)
                        cursor = conn.cursor()
                        
                        # Query for JWT-related cookies
                        cursor.execute("""
                            SELECT name, value FROM cookies 
                            WHERE (name LIKE '%token%' OR name LIKE '%auth%' OR name LIKE '%jwt%')
                            AND host_key LIKE '%localhost%'
                        """)
                        
                        for name, value in cursor.fetchall():
                            if self._looks_like_jwt(value):
                                console.print(f"  ✅ Found JWT token in Chrome cookie: {name}")
                                conn.close()
                                os.unlink(tmp_path)
                                return value
                                
                        conn.close()
                        os.unlink(tmp_path)
                        
                    except Exception as e:
                        console.print(f"⚠️ Error reading Chrome cookies: {e}")
                        
        except Exception as e:
            console.print(f"⚠️ Error accessing Chrome cookies: {e}")
            
        return None
        
    def _extract_from_firefox_cookies(self) -> Optional[str]:
        """Extract token from Firefox cookies database"""
        try:
            home = Path.home()
            firefox_paths = [
                home / '.mozilla/firefox',
                home / 'Library/Application Support/Firefox/Profiles',
                home / 'AppData/Roaming/Mozilla/Firefox/Profiles',
            ]
            
            for firefox_path in firefox_paths:
                if firefox_path.exists():
                    for profile_dir in firefox_path.iterdir():
                        if profile_dir.is_dir():
                            cookies_file = profile_dir / 'cookies.sqlite'
                            if cookies_file.exists():
                                try:
                                    conn = sqlite3.connect(str(cookies_file))
                                    cursor = conn.cursor()
                                    
                                    cursor.execute("""
                                        SELECT name, value FROM moz_cookies 
                                        WHERE (name LIKE '%token%' OR name LIKE '%auth%' OR name LIKE '%jwt%')
                                        AND host LIKE '%localhost%'
                                    """)
                                    
                                    for name, value in cursor.fetchall():
                                        if self._looks_like_jwt(value):
                                            console.print(f"  ✅ Found JWT token in Firefox cookie: {name}")
                                            conn.close()
                                            return value
                                            
                                    conn.close()
                                    
                                except Exception as e:
                                    console.print(f"⚠️ Error reading Firefox cookies: {e}")
                                    
        except Exception as e:
            console.print(f"⚠️ Error accessing Firefox cookies: {e}")
            
        return None
        
    def _looks_like_jwt(self, value: str) -> bool:
        """Check if a value looks like a JWT token"""
        if not value or len(value) < 20:
            return False
            
        # JWT tokens have three parts separated by dots
        parts = value.split('.')
        if len(parts) != 3:
            return False
            
        # Check if parts look like base64
        try:
            for part in parts[:2]:  # Header and payload should be valid base64
                # Add padding if needed
                padded = part + '=' * (4 - len(part) % 4)
                base64.b64decode(padded)
            return True
        except:
            return False

class SupabaseAuthExtractor(TokenSource):
    """Programmatically authenticate with Supabase to get fresh tokens"""
    
    def __init__(self, config: EnvironmentConfig):
        super().__init__("supabase_auth", "Authenticate with Supabase API to get fresh token")
        self.config = config
        
    async def extract_token(self) -> Optional[str]:
        """Get token via Supabase authentication"""
        if not self.config.supabase_url or not self.config.supabase_anon_key:
            console.print("  ❌ Supabase configuration not found")
            return None
            
        console.print("🔐 Attempting Supabase programmatic authentication...")
        
        # Try stored credentials first
        token = await self._try_stored_credentials()
        if token:
            return token
            
        # Try interactive login
        if Confirm.ask("No stored credentials found. Login interactively?"):
            return await self._interactive_login()
            
        return None
        
    async def _try_stored_credentials(self) -> Optional[str]:
        """Try to authenticate using stored credentials"""
        credentials_file = Path.home() / '.lifo_jwt_credentials.json'
        
        if credentials_file.exists():
            try:
                with open(credentials_file) as f:
                    creds = json.load(f)
                    
                # Try refresh token first
                if 'refresh_token' in creds:
                    token = await self._refresh_token(creds['refresh_token'])
                    if token:
                        return token
                        
                # Try email/password
                if 'email' in creds and 'password' in creds:
                    return await self._authenticate(creds['email'], creds['password'])
                    
            except Exception as e:
                console.print(f"⚠️ Error loading stored credentials: {e}")
                
        return None
        
    async def _interactive_login(self) -> Optional[str]:
        """Interactive login flow"""
        console.print("\n📝 Interactive Supabase Login")
        console.print("═" * 40)
        
        email = Prompt.ask("Email")
        password = Prompt.ask("Password", password=True)
        
        if not email or not password:
            console.print("❌ Email and password are required")
            return None
            
        token = await self._authenticate(email, password)
        
        if token and Confirm.ask("Save credentials for future use?"):
            await self._save_credentials(email, password, token)
            
        return token
        
    async def _authenticate(self, email: str, password: str) -> Optional[str]:
        """Authenticate with Supabase"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.config.supabase_url}/auth/v1/token?grant_type=password",
                    json={"email": email, "password": password},
                    headers={
                        "apikey": self.config.supabase_anon_key,
                        "Content-Type": "application/json",
                    },
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    access_token = data.get('access_token')
                    
                    if access_token:
                        console.print("  ✅ Authentication successful")
                        
                        # Save session data for refresh
                        await self._save_session_data(data)
                        
                        return access_token
                    else:
                        console.print("  ❌ No access token in response")
                else:
                    console.print(f"  ❌ Authentication failed: {response.status_code}")
                    if response.status_code == 400:
                        error_data = response.json()
                        console.print(f"     Error: {error_data.get('error_description', 'Invalid credentials')}")
                        
        except Exception as e:
            console.print(f"  ❌ Authentication error: {e}")
            
        return None
        
    async def _refresh_token(self, refresh_token: str) -> Optional[str]:
        """Refresh an access token"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.config.supabase_url}/auth/v1/token?grant_type=refresh_token",
                    json={"refresh_token": refresh_token},
                    headers={
                        "apikey": self.config.supabase_anon_key,
                        "Content-Type": "application/json",
                    },
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    access_token = data.get('access_token')
                    
                    if access_token:
                        console.print("  ✅ Token refreshed successfully")
                        await self._save_session_data(data)
                        return access_token
                        
        except Exception as e:
            console.print(f"  ⚠️ Token refresh failed: {e}")
            
        return None
        
    async def _save_credentials(self, email: str, password: str, token: str):
        """Save credentials securely"""
        credentials_file = Path.home() / '.lifo_jwt_credentials.json'
        
        try:
            creds = {
                'email': email,
                'password': password,  # In production, consider encryption
                'last_token': token,
                'updated_at': datetime.now().isoformat()
            }
            
            with open(credentials_file, 'w') as f:
                json.dump(creds, f, indent=2)
                
            # Secure the file (Unix-like systems)
            if hasattr(os, 'chmod'):
                os.chmod(credentials_file, 0o600)
                
            console.print(f"💾 Credentials saved to {credentials_file}")
            
        except Exception as e:
            console.print(f"⚠️ Failed to save credentials: {e}")
            
    async def _save_session_data(self, session_data: Dict[str, Any]):
        """Save session data including refresh token"""
        session_file = Path.home() / '.lifo_jwt_session.json'
        
        try:
            with open(session_file, 'w') as f:
                json.dump({
                    **session_data,
                    'saved_at': datetime.now().isoformat()
                }, f, indent=2)
                
            if hasattr(os, 'chmod'):
                os.chmod(session_file, 0o600)
                
        except Exception as e:
            console.print(f"⚠️ Failed to save session data: {e}")
            
    def is_available(self) -> bool:
        """Check if Supabase auth is available"""
        return bool(self.config.supabase_url and self.config.supabase_anon_key)

class LogExtractor(TokenSource):
    """Extract tokens from development server logs"""
    
    def __init__(self):
        super().__init__("logs", "Extract tokens from development server logs")
        
    async def extract_token(self) -> Optional[str]:
        """Extract token from log files"""
        console.print("📜 Scanning development logs for JWT tokens...")
        
        log_paths = [
            Path("logs"),
            Path("lifo_api/logs"),
            Path(".logs"),
            Path("tmp"),
            Path("/tmp"),
        ]
        
        for log_path in log_paths:
            if log_path.exists() and log_path.is_dir():
                token = await self._scan_log_directory(log_path)
                if token:
                    return token
                    
        # Check recent console output if available
        return await self._check_recent_output()
        
    async def _scan_log_directory(self, log_dir: Path) -> Optional[str]:
        """Scan a log directory for tokens"""
        try:
            log_files = list(log_dir.glob("*.log"))
            log_files.extend(log_dir.glob("*.out"))
            log_files.extend(log_dir.glob("uvicorn.log"))
            log_files.extend(log_dir.glob("fastapi.log"))
            
            # Sort by modification time, newest first
            log_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
            
            for log_file in log_files[:5]:  # Check 5 most recent files
                token = await self._scan_log_file(log_file)
                if token:
                    return token
                    
        except Exception as e:
            console.print(f"⚠️ Error scanning log directory {log_dir}: {e}")
            
        return None
        
    async def _scan_log_file(self, log_file: Path) -> Optional[str]:
        """Scan a log file for JWT tokens"""
        try:
            with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                # Read last 10MB or entire file if smaller
                f.seek(0, 2)  # Go to end
                file_size = f.tell()
                read_size = min(file_size, 10 * 1024 * 1024)  # 10MB
                f.seek(max(0, file_size - read_size))
                
                content = f.read()
                
                # Look for JWT patterns
                import re
                
                # Pattern for Authorization: Bearer <token>
                bearer_pattern = r'Bearer\s+([A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)'
                matches = re.findall(bearer_pattern, content)
                
                if matches:
                    token = matches[-1]  # Get the most recent
                    console.print(f"  ✅ Found token in log file: {log_file.name}")
                    return token
                    
                # Pattern for access_token in JSON
                json_pattern = r'"access_token":\s*"([^"]+)"'
                matches = re.findall(json_pattern, content)
                
                for match in matches:
                    if self._looks_like_jwt(match):
                        console.print(f"  ✅ Found access_token in log file: {log_file.name}")
                        return match
                        
        except Exception as e:
            console.print(f"⚠️ Error reading log file {log_file}: {e}")
            
        return None
        
    async def _check_recent_output(self) -> Optional[str]:
        """Check recent console output for tokens"""
        try:
            # Try to get recent uvicorn/fastapi processes output
            result = subprocess.run([
                'bash', '-c', 
                'ps aux | grep -E "(uvicorn|fastapi)" | grep -v grep'
            ], capture_output=True, text=True, timeout=5)
            
            if result.returncode == 0 and result.stdout:
                console.print("  📊 Found running FastAPI/Uvicorn processes")
                # In a real implementation, you might extract tokens from process memory
                # This is a placeholder for more advanced techniques
                
        except Exception:
            pass
            
        return None
        
    def _looks_like_jwt(self, value: str) -> bool:
        """Check if a value looks like a JWT token"""
        if not value or len(value) < 20:
            return False
            
        parts = value.split('.')
        if len(parts) != 3:
            return False
            
        try:
            for part in parts[:2]:
                padded = part + '=' * (4 - len(part) % 4)
                base64.b64decode(padded)
            return True
        except:
            return False

class EnvironmentExtractor(TokenSource):
    """Extract tokens from environment variables or config files"""
    
    def __init__(self, config: EnvironmentConfig):
        super().__init__("environment", "Extract tokens from environment variables")
        self.config = config
        
    async def extract_token(self) -> Optional[str]:
        """Extract token from environment"""
        console.print("🌍 Checking environment variables for tokens...")
        
        # Check for direct token variables
        token_vars = [
            'JWT_TOKEN',
            'ACCESS_TOKEN',
            'BEARER_TOKEN',
            'API_TOKEN',
            'AUTH_TOKEN',
            'SUPABASE_ACCESS_TOKEN',
        ]
        
        for var in token_vars:
            token = self.config.get(var)
            if token and self._looks_like_jwt(token):
                console.print(f"  ✅ Found JWT token in environment variable: {var}")
                return token
                
        # Check service role key as fallback
        service_key = self.config.supabase_service_role_key
        if service_key:
            console.print("  ℹ️ Using Supabase service role key as fallback")
            return service_key
            
        console.print("  ❌ No tokens found in environment variables")
        return None
        
    def _looks_like_jwt(self, value: str) -> bool:
        """Check if a value looks like a JWT token"""
        if not value or len(value) < 20:
            return False
            
        parts = value.split('.')
        return len(parts) == 3
        
    def is_available(self) -> bool:
        """Always available"""
        return True

class CachedTokenExtractor(TokenSource):
    """Extract previously cached/saved tokens"""
    
    def __init__(self):
        super().__init__("cached", "Use previously cached tokens")
        self.cache_file = Path.home() / '.lifo_jwt_cache.json'
        
    async def extract_token(self) -> Optional[str]:
        """Extract token from cache"""
        console.print("💾 Checking cached tokens...")
        
        if not self.cache_file.exists():
            console.print("  ❌ No token cache found")
            return None
            
        try:
            with open(self.cache_file) as f:
                cache_data = json.load(f)
                
            token = cache_data.get('access_token')
            expires_at = cache_data.get('expires_at')
            
            if not token:
                console.print("  ❌ No token in cache")
                return None
                
            # Check expiry
            if expires_at:
                expiry_time = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                if datetime.now(expiry_time.tzinfo) >= expiry_time:
                    console.print("  ⏰ Cached token has expired")
                    return None
                    
            console.print("  ✅ Found valid cached token")
            return token
            
        except Exception as e:
            console.print(f"  ⚠️ Error reading token cache: {e}")
            return None
            
    async def save_token(self, token: str, expires_at: Optional[str] = None):
        """Save token to cache"""
        try:
            cache_data = {
                'access_token': token,
                'expires_at': expires_at,
                'cached_at': datetime.now().isoformat(),
                'source': 'jwt_extractor'
            }
            
            with open(self.cache_file, 'w') as f:
                json.dump(cache_data, f, indent=2)
                
            if hasattr(os, 'chmod'):
                os.chmod(self.cache_file, 0o600)
                
            console.print(f"💾 Token cached to {self.cache_file}")
            
        except Exception as e:
            console.print(f"⚠️ Failed to cache token: {e}")

class TokenValidator:
    """Validate and analyze JWT tokens"""
    
    def __init__(self, config: EnvironmentConfig):
        self.config = config
        
    async def validate_token(self, token: str) -> Dict[str, Any]:
        """Validate a JWT token and return analysis"""
        analysis = {
            'valid': False,
            'token': token,
            'header': None,
            'payload': None,
            'signature_valid': None,
            'expired': None,
            'expires_at': None,
            'issued_at': None,
            'issuer': None,
            'audience': None,
            'subject': None,
            'token_type': 'unknown',
            'errors': []
        }
        
        try:
            # Decode header and payload without verification
            header = jwt.get_unverified_header(token)
            payload = jwt.decode(token, options={"verify_signature": False})
            
            analysis['header'] = header
            analysis['payload'] = payload
            analysis['valid'] = True
            
            # Extract common claims
            analysis['expires_at'] = payload.get('exp')
            analysis['issued_at'] = payload.get('iat')
            analysis['issuer'] = payload.get('iss')
            analysis['audience'] = payload.get('aud')
            analysis['subject'] = payload.get('sub')
            
            # Check expiry
            if analysis['expires_at']:
                exp_time = datetime.fromtimestamp(analysis['expires_at'])
                analysis['expired'] = datetime.now() > exp_time
            else:
                analysis['expired'] = False
                
            # Determine token type
            if 'supabase.co' in str(analysis['issuer']):
                analysis['token_type'] = 'supabase_user'
            elif analysis['audience'] == 'authenticated':
                analysis['token_type'] = 'supabase_user'  
            elif 'service_role' in str(payload):
                analysis['token_type'] = 'supabase_service'
            else:
                analysis['token_type'] = 'custom_jwt'
                
            # Try signature verification if we have the secret
            if self.config.supabase_jwt_secret:
                try:
                    jwt.decode(
                        token, 
                        self.config.supabase_jwt_secret, 
                        algorithms=['HS256'],
                        options={"verify_aud": False}  # Skip audience verification
                    )
                    analysis['signature_valid'] = True
                except jwt.InvalidSignatureError:
                    analysis['signature_valid'] = False
                    analysis['errors'].append('Invalid signature')
                except jwt.ExpiredSignatureError:
                    analysis['signature_valid'] = True  # Signature is valid, just expired
                    analysis['expired'] = True
                except Exception as e:
                    analysis['signature_valid'] = False
                    analysis['errors'].append(f'Verification error: {e}')
                    
        except jwt.InvalidTokenError as e:
            analysis['errors'].append(f'Invalid token format: {e}')
        except Exception as e:
            analysis['errors'].append(f'Decode error: {e}')
            
        return analysis
        
    async def test_token_api_access(self, token: str) -> Dict[str, Any]:
        """Test if token works with the API"""
        test_results = {
            'api_accessible': False,
            'endpoints_tested': [],
            'working_endpoints': [],
            'failed_endpoints': [],
            'user_info': None,
            'permissions': []
        }
        
        # Test endpoints
        test_endpoints = [
            '/health',
            '/api/v1/health/health',
            '/api/info',
            '/api/errors/stats',
            '/api/v1/stores',
            '/api/v1/analytics/summary',
        ]
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            for endpoint in test_endpoints:
                url = f"{self.config.api_url}{endpoint}"
                test_results['endpoints_tested'].append(endpoint)
                
                try:
                    response = await client.get(url, headers=headers)
                    
                    if response.status_code in [200, 404]:  # 404 is OK (endpoint exists)
                        test_results['working_endpoints'].append({
                            'endpoint': endpoint,
                            'status': response.status_code,
                            'response_size': len(response.content)
                        })
                        test_results['api_accessible'] = True
                    else:
                        test_results['failed_endpoints'].append({
                            'endpoint': endpoint,
                            'status': response.status_code,
                            'error': response.text[:200]
                        })
                        
                except Exception as e:
                    test_results['failed_endpoints'].append({
                        'endpoint': endpoint,
                        'status': None,
                        'error': str(e)
                    })
                    
        return test_results

class JWTExtractor:
    """Main JWT token extraction orchestrator"""
    
    def __init__(self):
        self.config = EnvironmentConfig()
        self.sources = []
        self.validator = TokenValidator(self.config)
        self.cache = CachedTokenExtractor()
        self._setup_sources()
        
    def _setup_sources(self):
        """Setup token extraction sources in priority order"""
        self.sources = [
            self.cache,                                    # Cached tokens first
            EnvironmentExtractor(self.config),             # Environment variables  
            BrowserStorageExtractor(),                     # Browser storage
            CookieExtractor(self.config),                 # Browser cookies
            SupabaseAuthExtractor(self.config),           # Supabase auth
            LogExtractor(),                               # Development logs
        ]
        
    async def extract_best_token(self, force_refresh: bool = False) -> Optional[str]:
        """Extract the best available token"""
        if force_refresh:
            console.print("🔄 Force refresh requested, skipping cache...")
            sources_to_try = self.sources[1:]  # Skip cache
        else:
            sources_to_try = self.sources
            
        console.print("🎯 Starting intelligent JWT token extraction...")
        console.print(f"📊 Environment: {self.config.environment}")
        console.print(f"🌐 API URL: {self.config.api_url}")
        
        if self.config.supabase_url:
            console.print(f"🔗 Supabase URL: {self.config.supabase_url}")
        
        console.print("\n" + "="*50)
        
        for source in sources_to_try:
            if not source.is_available():
                console.print(f"⏭️ {source.name}: Not available")
                continue
                
            try:
                console.print(f"🔍 Trying source: {source.description}")
                token = await source.extract_token()
                
                if token:
                    console.print(f"✅ Token found from: {source.name}")
                    
                    # Validate the token
                    analysis = await self.validator.validate_token(token)
                    
                    if analysis['valid'] and not analysis['expired']:
                        # Test API access
                        api_test = await self.validator.test_token_api_access(token)
                        
                        if api_test['api_accessible']:
                            console.print("🎉 Token is valid and API accessible!")
                            
                            # Cache the token if it's not already cached
                            if source != self.cache:
                                expires_at = None
                                if analysis['expires_at']:
                                    expires_at = datetime.fromtimestamp(analysis['expires_at']).isoformat()
                                await self.cache.save_token(token, expires_at)
                                
                            return token
                        else:
                            console.print("⚠️ Token found but API not accessible")
                    elif analysis['expired']:
                        console.print("⏰ Token found but expired")
                    else:
                        console.print("❌ Token found but invalid")
                else:
                    console.print(f"❌ No token from: {source.name}")
                    
            except Exception as e:
                console.print(f"⚠️ Error with {source.name}: {e}")
                
        console.print("\n💡 No valid tokens found. Try:")
        console.print("   • python tools/jwt_extractor.py --interactive")
        console.print("   • Ensure you're logged into the app in your browser")
        console.print("   • Check your environment configuration")
        
        return None
        
    async def list_available_sources(self):
        """List all available token sources"""
        table = Table(title="Available Token Sources")
        table.add_column("Source", style="cyan")
        table.add_column("Description", style="white")
        table.add_column("Available", style="green")
        
        for source in self.sources:
            available = "✅ Yes" if source.is_available() else "❌ No"
            table.add_row(source.name, source.description, available)
            
        console.print(table)
        
    async def validate_token_command(self, token: str):
        """Validate a token and show detailed analysis"""
        console.print("🔍 Analyzing JWT token...")
        
        analysis = await self.validator.validate_token(token)
        api_test = await self.validator.test_token_api_access(token)
        
        # Create analysis table
        table = Table(title="Token Analysis")
        table.add_column("Property", style="cyan")
        table.add_column("Value", style="white")
        
        table.add_row("Valid Format", "✅ Yes" if analysis['valid'] else "❌ No")
        table.add_row("Token Type", analysis['token_type'])
        table.add_row("Expired", "❌ Yes" if analysis['expired'] else "✅ No")
        
        if analysis['expires_at']:
            exp_time = datetime.fromtimestamp(analysis['expires_at'])
            table.add_row("Expires At", exp_time.strftime('%Y-%m-%d %H:%M:%S UTC'))
            
        if analysis['issued_at']:
            iat_time = datetime.fromtimestamp(analysis['issued_at'])
            table.add_row("Issued At", iat_time.strftime('%Y-%m-%d %H:%M:%S UTC'))
            
        if analysis['issuer']:
            table.add_row("Issuer", str(analysis['issuer'])[:50])
            
        if analysis['subject']:
            table.add_row("Subject", str(analysis['subject'])[:50])
            
        if analysis['signature_valid'] is not None:
            sig_status = "✅ Valid" if analysis['signature_valid'] else "❌ Invalid"
            table.add_row("Signature", sig_status)
            
        # API test results
        api_status = "✅ Accessible" if api_test['api_accessible'] else "❌ Not accessible"
        table.add_row("API Access", api_status)
        table.add_row("Working Endpoints", str(len(api_test['working_endpoints'])))
        
        console.print(table)
        
        # Show errors if any
        if analysis['errors']:
            console.print("\n⚠️ Issues found:")
            for error in analysis['errors']:
                console.print(f"  • {error}")
                
        # Show payload if valid
        if analysis['valid'] and analysis['payload']:
            console.print("\n📋 Token Payload:")
            payload_json = json.dumps(analysis['payload'], indent=2)
            console.print(Panel(payload_json, title="JWT Payload", border_style="blue"))

async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="LIFO AI JWT Token Extraction Helper",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python tools/jwt_extractor.py                    # Auto-extract token
  python tools/jwt_extractor.py --interactive      # Interactive login
  python tools/jwt_extractor.py --validate TOKEN   # Validate token
  python tools/jwt_extractor.py --refresh          # Force refresh
  python tools/jwt_extractor.py --list-sources     # Show sources
        """)
    
    parser.add_argument('--interactive', '-i', action='store_true',
                        help='Interactive login mode')
    parser.add_argument('--validate', '-v', metavar='TOKEN',
                        help='Validate a specific token')
    parser.add_argument('--refresh', '-r', action='store_true',
                        help='Force refresh token (skip cache)')
    parser.add_argument('--list-sources', '-l', action='store_true',
                        help='List available token sources')
    parser.add_argument('--output', '-o', choices=['token', 'json', 'env'],
                        default='token', help='Output format')
    parser.add_argument('--quiet', '-q', action='store_true',
                        help='Quiet mode (minimal output)')
    
    args = parser.parse_args()
    
    # Setup console for quiet mode
    if args.quiet:
        console._file = open(os.devnull, 'w')
        
    extractor = JWTExtractor()
    
    try:
        if args.list_sources:
            await extractor.list_available_sources()
            
        elif args.validate:
            await extractor.validate_token_command(args.validate)
            
        elif args.interactive:
            # Force interactive mode
            supabase_auth = SupabaseAuthExtractor(extractor.config)
            if supabase_auth.is_available():
                token = await supabase_auth._interactive_login()
                if token:
                    await extractor._output_token(token, args.output)
                else:
                    console.print("❌ Interactive login failed")
                    sys.exit(1)
            else:
                console.print("❌ Supabase authentication not configured")
                sys.exit(1)
                
        else:
            # Standard token extraction
            token = await extractor.extract_best_token(force_refresh=args.refresh)
            if token:
                await extractor._output_token(token, args.output)
            else:
                console.print("❌ No valid tokens found")
                sys.exit(1)
                
    except KeyboardInterrupt:
        console.print("\n🛑 Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        console.print(f"💥 Unexpected error: {e}")
        if not args.quiet:
            import traceback
            console.print(traceback.format_exc())
        sys.exit(1)

# Add the _output_token method to JWTExtractor class
async def _output_token_method(self, token: str, output_format: str):
    """Output token in specified format"""
    if output_format == 'token':
        print(token)
    elif output_format == 'json':
        print(json.dumps({
            'access_token': token,
            'token_type': 'Bearer',
            'extracted_at': datetime.now().isoformat()
        }, indent=2))
    elif output_format == 'env':
        print(f'export JWT_TOKEN="{token}"')
        print(f'export BEARER_TOKEN="Bearer {token}"')

# Bind the method to the class
JWTExtractor._output_token = _output_token_method

if __name__ == '__main__':
    asyncio.run(main())