#!/usr/bin/env python3
"""
Enhanced API Testing with Automatic JWT Authentication

Combines the JWT token extractor with comprehensive API testing.
Automatically handles authentication so you can focus on testing functionality.

Usage:
    python tools/test_api_with_auto_auth.py                    # Test with auto-extracted token
    python tools/test_api_with_auto_auth.py --token TOKEN      # Test with specific token
    python tools/test_api_with_auto_auth.py --interactive      # Login and test
    python tools/test_api_with_auto_auth.py --endpoints health,stores  # Test specific endpoints
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import Dict, List, Optional

try:
    import httpx
    from rich.console import Console
    from rich.panel import Panel
    from rich.progress import Progress
    from rich.table import Table
    from rich.text import Text
except ImportError as e:
    print(f"❌ Missing dependencies: {e}")
    print("💡 Install with: pip install httpx rich")
    sys.exit(1)

# Import our JWT extractor
sys.path.append(str(Path(__file__).parent))
try:
    from jwt_extractor import JWTExtractor, EnvironmentConfig
except ImportError as e:
    print(f"❌ Could not import JWT extractor: {e}")
    print("💡 Make sure jwt_extractor.py is in the same directory")
    sys.exit(1)

console = Console()

class APITestSuite:
    """Comprehensive API test suite with automatic JWT authentication"""
    
    def __init__(self, config: EnvironmentConfig):
        self.config = config
        self.base_url = config.api_url
        self.test_results = []
        
    async def run_tests(self, token: str, endpoints: Optional[List[str]] = None) -> Dict:
        """Run comprehensive API tests with authentication"""
        
        console.print(Panel(
            f"🧪 LIFO AI API Test Suite\n"
            f"🌐 Base URL: {self.base_url}\n"
            f"🎫 Using JWT Authentication",
            title="API Testing",
            border_style="blue"
        ))
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'User-Agent': 'LIFO-AI-Test-Suite/1.0'
        }
        
        # Define test endpoints with expected behaviors
        all_endpoints = {
            # Health and Info endpoints
            'health': {
                'path': '/health',
                'method': 'GET',
                'description': 'Basic health check',
                'expected_status': [200],
                'auth_required': False
            },
            'health_detailed': {
                'path': '/api/v1/health/health',
                'method': 'GET', 
                'description': 'Detailed health check',
                'expected_status': [200],
                'auth_required': True
            },
            'api_info': {
                'path': '/api/info',
                'method': 'GET',
                'description': 'API information',
                'expected_status': [200],
                'auth_required': False
            },
            'error_stats': {
                'path': '/api/errors/stats',
                'method': 'GET',
                'description': 'Error statistics',
                'expected_status': [200, 404],
                'auth_required': True
            },
            
            # Store endpoints
            'stores_list': {
                'path': '/api/v1/stores',
                'method': 'GET',
                'description': 'List accessible stores',
                'expected_status': [200],
                'auth_required': True
            },
            'stores_create': {
                'path': '/api/v1/stores',
                'method': 'POST',
                'description': 'Create new store (test permissions)',
                'expected_status': [201, 403, 422],
                'auth_required': True,
                'test_data': {
                    'name': 'Test Store',
                    'address': '123 Test St',
                    'phone': '+1234567890'
                }
            },
            
            # Analytics endpoints
            'analytics_summary': {
                'path': '/api/v1/analytics/summary',
                'method': 'GET',
                'description': 'Analytics summary',
                'expected_status': [200, 403, 404],
                'auth_required': True
            },
            
            # Scanning endpoints  
            'scan_workflows': {
                'path': '/api/v1/scan-workflows',
                'method': 'GET',
                'description': 'Scan workflows',
                'expected_status': [200, 403],
                'auth_required': True
            },
            
            # Scoring endpoints
            'scoring_health': {
                'path': '/api/v1/scoring/health',
                'method': 'GET',
                'description': 'Scoring service health',
                'expected_status': [200, 404],
                'auth_required': True
            },
            
            # Mobile endpoints
            'mobile_health': {
                'path': '/api/v1/mobile/health',
                'method': 'GET',
                'description': 'Mobile API health',
                'expected_status': [200, 404],
                'auth_required': True
            }
        }
        
        # Filter endpoints if specified
        if endpoints:
            test_endpoints = {k: v for k, v in all_endpoints.items() if k in endpoints}
        else:
            test_endpoints = all_endpoints
            
        # Run tests
        async with httpx.AsyncClient(timeout=30.0) as client:
            with Progress() as progress:
                task = progress.add_task("Running API tests...", total=len(test_endpoints))
                
                for endpoint_name, endpoint_config in test_endpoints.items():
                    await self._test_endpoint(
                        client, 
                        endpoint_name, 
                        endpoint_config, 
                        headers if endpoint_config['auth_required'] else {}
                    )
                    progress.advance(task)
                    
        # Generate summary
        return self._generate_summary()
        
    async def _test_endpoint(self, client: httpx.AsyncClient, name: str, config: Dict, headers: Dict):
        """Test a single API endpoint"""
        url = f"{self.base_url}{config['path']}"
        method = config['method'].upper()
        
        test_result = {
            'name': name,
            'url': url,
            'method': method,
            'description': config['description'],
            'auth_required': config['auth_required'],
            'expected_status': config['expected_status'],
            'actual_status': None,
            'success': False,
            'response_time_ms': 0,
            'response_size': 0,
            'error': None,
            'response_data': None
        }
        
        try:
            import time
            start_time = time.time()
            
            # Prepare request
            request_kwargs = {'headers': headers}
            
            # Add test data for POST requests
            if method == 'POST' and 'test_data' in config:
                request_kwargs['json'] = config['test_data']
                
            # Make request
            if method == 'GET':
                response = await client.get(url, **request_kwargs)
            elif method == 'POST':
                response = await client.post(url, **request_kwargs)
            elif method == 'PUT':
                response = await client.put(url, **request_kwargs)
            elif method == 'DELETE':
                response = await client.delete(url, **request_kwargs)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            end_time = time.time()
            
            test_result['actual_status'] = response.status_code
            test_result['response_time_ms'] = int((end_time - start_time) * 1000)
            test_result['response_size'] = len(response.content)
            test_result['success'] = response.status_code in config['expected_status']
            
            # Try to parse JSON response
            try:
                if response.headers.get('content-type', '').startswith('application/json'):
                    test_result['response_data'] = response.json()
            except:
                test_result['response_data'] = response.text[:500]  # First 500 chars
                
        except Exception as e:
            test_result['error'] = str(e)
            test_result['success'] = False
            
        self.test_results.append(test_result)
        
        # Print real-time results
        status_color = "green" if test_result['success'] else "red"
        console.print(
            f"  {name}: "
            f"[{status_color}]{test_result['actual_status'] or 'ERROR'}[/{status_color}] "
            f"({test_result['response_time_ms']}ms)"
        )
        
    def _generate_summary(self) -> Dict:
        """Generate test summary"""
        total_tests = len(self.test_results)
        successful_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - successful_tests
        
        # Calculate average response time
        response_times = [r['response_time_ms'] for r in self.test_results if r['response_time_ms'] > 0]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        # Group by status codes
        status_codes = {}
        for result in self.test_results:
            status = result['actual_status']
            if status:
                status_codes[status] = status_codes.get(status, 0) + 1
                
        summary = {
            'total_tests': total_tests,
            'successful_tests': successful_tests,
            'failed_tests': failed_tests,
            'success_rate': (successful_tests / total_tests * 100) if total_tests > 0 else 0,
            'avg_response_time_ms': int(avg_response_time),
            'status_code_distribution': status_codes,
            'test_results': self.test_results
        }
        
        return summary
        
    def print_detailed_results(self, summary: Dict):
        """Print detailed test results"""
        
        # Summary table
        summary_table = Table(title="Test Summary")
        summary_table.add_column("Metric", style="cyan")
        summary_table.add_column("Value", style="white")
        
        summary_table.add_row("Total Tests", str(summary['total_tests']))
        summary_table.add_row("Successful", f"[green]{summary['successful_tests']}[/green]")
        summary_table.add_row("Failed", f"[red]{summary['failed_tests']}[/red]")
        summary_table.add_row("Success Rate", f"{summary['success_rate']:.1f}%")
        summary_table.add_row("Avg Response Time", f"{summary['avg_response_time_ms']}ms")
        
        console.print(summary_table)
        
        # Detailed results table
        results_table = Table(title="Detailed Results")
        results_table.add_column("Endpoint", style="cyan")
        results_table.add_column("Method", style="blue")
        results_table.add_column("Status", style="white")
        results_table.add_column("Time", style="yellow")
        results_table.add_column("Auth", style="magenta")
        results_table.add_column("Result", style="white")
        
        for result in summary['test_results']:
            status_color = "green" if result['success'] else "red"
            status_text = str(result['actual_status']) if result['actual_status'] else "ERROR"
            
            auth_text = "✅" if result['auth_required'] else "➖"
            result_text = "✅ PASS" if result['success'] else "❌ FAIL"
            
            if result['error']:
                result_text = f"❌ {result['error'][:30]}..."
                
            results_table.add_row(
                result['name'],
                result['method'],
                f"[{status_color}]{status_text}[/{status_color}]",
                f"{result['response_time_ms']}ms",
                auth_text,
                result_text
            )
            
        console.print(results_table)
        
        # Show interesting responses
        interesting_results = [
            r for r in summary['test_results'] 
            if r['response_data'] and isinstance(r['response_data'], dict) and r['success']
        ]
        
        if interesting_results:
            console.print("\n🔍 Sample Successful Responses:")
            for result in interesting_results[:3]:  # Show first 3
                if isinstance(result['response_data'], dict):
                    response_preview = json.dumps(result['response_data'], indent=2)[:300]
                    if len(response_preview) >= 300:
                        response_preview += "..."
                    console.print(Panel(
                        response_preview,
                        title=f"{result['name']} Response",
                        border_style="green"
                    ))

async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Enhanced API Testing with Automatic JWT Authentication",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument('--token', '-t', help='Use specific JWT token')
    parser.add_argument('--interactive', '-i', action='store_true', 
                        help='Login interactively to get token')
    parser.add_argument('--endpoints', '-e', help='Comma-separated list of endpoints to test')
    parser.add_argument('--output', '-o', choices=['console', 'json'], 
                        default='console', help='Output format')
    parser.add_argument('--save-results', '-s', metavar='FILE', 
                        help='Save results to JSON file')
    
    args = parser.parse_args()
    
    # Initialize components
    config = EnvironmentConfig()
    extractor = JWTExtractor()
    test_suite = APITestSuite(config)
    
    # Get JWT token
    token = args.token
    
    if not token:
        if args.interactive:
            console.print("🔐 Interactive login requested...")
            supabase_auth = extractor.sources[4]  # SupabaseAuthExtractor
            token = await supabase_auth._interactive_login()
        else:
            console.print("🎯 Auto-extracting JWT token...")
            token = await extractor.extract_best_token()
            
        if not token:
            console.print("❌ Failed to obtain JWT token")
            console.print("💡 Try: python tools/test_api_with_auto_auth.py --interactive")
            sys.exit(1)
            
    # Parse endpoints
    endpoints = None
    if args.endpoints:
        endpoints = [e.strip() for e in args.endpoints.split(',')]
        
    # Run tests
    console.print(f"🚀 Starting API tests...")
    if endpoints:
        console.print(f"🎯 Testing specific endpoints: {', '.join(endpoints)}")
        
    try:
        summary = await test_suite.run_tests(token, endpoints)
        
        # Output results
        if args.output == 'console':
            test_suite.print_detailed_results(summary)
        elif args.output == 'json':
            print(json.dumps(summary, indent=2))
            
        # Save results if requested
        if args.save_results:
            with open(args.save_results, 'w') as f:
                json.dump(summary, f, indent=2)
            console.print(f"💾 Results saved to {args.save_results}")
            
        # Exit code based on success rate
        if summary['success_rate'] >= 80:
            console.print("🎉 Tests completed with good success rate!")
            sys.exit(0)
        elif summary['success_rate'] >= 50:
            console.print("⚠️ Tests completed with moderate success rate")
            sys.exit(0)
        else:
            console.print("❌ Tests completed with low success rate")
            sys.exit(1)
            
    except KeyboardInterrupt:
        console.print("\n🛑 Tests cancelled by user")
        sys.exit(1)
    except Exception as e:
        console.print(f"💥 Test execution failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main())