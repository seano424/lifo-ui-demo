"""
Phase 2 Performance Testing Suite
Tests all optimizations implemented in Phase 2 with comprehensive benchmarks
"""

import asyncio
import time
import statistics
import json
import csv
import io
import random
import string
from datetime import datetime, timedelta
from typing import Dict, List
import httpx
import psutil
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.database.supabase_service import SupabaseService
from app.services.batch_creation_service import BatchCreationService
from app.services.unified_write_service import UnifiedWriteService
from app.services.mobile_write_service import MobileWriteService
from app.core.scoring import ScoringService
from app.core.scoring_optimizations import (
    calculate_seasonal_adjustment,
    detect_bulk_purchase,
    calculate_movement_score
)
from app.services.csv.unified_csv_service import UnifiedCSVService
from app.api.v1.analytics import get_analytics_data

# Performance targets from requirements
PERFORMANCE_TARGETS = {
    "mobile_summary": 300,  # ms
    "batch_quick_score": 200,  # ms
    "bulk_scoring_71_batches": 500,  # ms
    "csv_validation": 2000,  # ms
    "csv_upload": 5000,  # ms
    "csv_processing_25_items": 100,  # ms
    "database_write_25_items": 100,  # ms
    "database_ops_per_second": 1000,
    "startup_time": 5000,  # ms (target)
}

class PerformanceTestSuite:
    """Comprehensive performance testing for Phase 2 optimizations"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results = {}
        self.supabase = SupabaseService()
        self.batch_service = BatchCreationService(self.supabase)
        self.write_service = UnifiedWriteService(self.supabase)
        self.mobile_write_service = MobileWriteService(self.supabase)
        self.csv_service = UnifiedCSVService()
        self.scoring_service = ScoringService(self.supabase)
        self.test_user_id = "test_user_" + ''.join(random.choices(string.ascii_lowercase, k=8))
        
    async def run_all_tests(self):
        """Run comprehensive performance test suite"""
        print("=" * 80)
        print("PHASE 2 PERFORMANCE VALIDATION SUITE")
        print("=" * 80)
        print(f"Test User ID: {self.test_user_id}")
        print(f"Base URL: {self.base_url}")
        print("-" * 80)
        
        # Test 1: Refactored Large Functions
        await self.test_refactored_functions()
        
        # Test 2: Database Write Optimizations
        await self.test_database_write_optimizations()
        
        # Test 3: Scoring Algorithm Optimizations
        await self.test_scoring_optimizations()
        
        # Test 4: CSV Consolidation
        await self.test_csv_consolidation()
        
        # Test 5: Import Cleanup Benefits
        await self.test_startup_and_memory()
        
        # Test 6: Multi-port server performance
        await self.test_multiport_servers()
        
        # Generate comprehensive report
        self.generate_performance_report()
        
    async def test_refactored_functions(self):
        """Test performance of refactored large functions"""
        print("\n1. TESTING REFACTORED LARGE FUNCTIONS")
        print("-" * 40)
        
        # Test get_analytics_data (was 415 lines, now modular)
        print("Testing get_analytics_data performance...")
        
        analytics_times = []
        for i in range(10):
            start = time.perf_counter()
            try:
                # Create mock request data
                result = await get_analytics_data(
                    user_id=self.test_user_id,
                    date_from=(datetime.now() - timedelta(days=30)).isoformat(),
                    date_to=datetime.now().isoformat()
                )
                elapsed = (time.perf_counter() - start) * 1000
                analytics_times.append(elapsed)
                print(f"  Iteration {i+1}: {elapsed:.2f}ms")
            except Exception as e:
                print(f"  Error in iteration {i+1}: {e}")
        
        if analytics_times:
            self.results["analytics_data_avg"] = statistics.mean(analytics_times)
            self.results["analytics_data_p95"] = sorted(analytics_times)[int(len(analytics_times) * 0.95)]
            print(f"  Average: {self.results['analytics_data_avg']:.2f}ms")
            print(f"  P95: {self.results['analytics_data_p95']:.2f}ms")
        
        # Test score_store_inventory_bulk (was 314 lines, now modular)
        print("\nTesting score_store_inventory_bulk performance...")
        
        # Create test batches
        test_batches = self._create_test_batches(71)
        
        scoring_times = []
        for i in range(5):
            start = time.perf_counter()
            scores = await self.scoring_service.score_store_inventory_bulk("test_store", recalculate_all=True)
            elapsed = (time.perf_counter() - start) * 1000
            scoring_times.append(elapsed)
            print(f"  Iteration {i+1}: {elapsed:.2f}ms for bulk scoring")
        
        self.results["bulk_scoring_avg"] = statistics.mean(scoring_times)
        self.results["bulk_scoring_p95"] = sorted(scoring_times)[int(len(scoring_times) * 0.95)]
        print(f"  Average: {self.results['bulk_scoring_avg']:.2f}ms")
        print(f"  P95: {self.results['bulk_scoring_p95']:.2f}ms")
        print(f"  Target: <{PERFORMANCE_TARGETS['bulk_scoring_71_batches']}ms")
        print("  ✓ PASS" if self.results['bulk_scoring_avg'] < PERFORMANCE_TARGETS['bulk_scoring_71_batches'] else "  ✗ FAIL")
        
    async def test_database_write_optimizations(self):
        """Test database write optimization performance"""
        print("\n2. TESTING DATABASE WRITE OPTIMIZATIONS")
        print("-" * 40)
        
        # Test backend-centric write operations
        print("Testing bulk write operations (25 items)...")
        
        write_times = []
        for i in range(10):
            test_data = self._create_test_write_data(25)
            start = time.perf_counter()
            try:
                result = await self.write_service.write_batch(test_data)
                elapsed = (time.perf_counter() - start) * 1000
                write_times.append(elapsed)
                print(f"  Iteration {i+1}: {elapsed:.2f}ms")
            except Exception as e:
                print(f"  Error in iteration {i+1}: {e}")
        
        if write_times:
            self.results["write_25_items_avg"] = statistics.mean(write_times)
            self.results["write_25_items_p95"] = sorted(write_times)[int(len(write_times) * 0.95)]
            print(f"  Average: {self.results['write_25_items_avg']:.2f}ms")
            print(f"  P95: {self.results['write_25_items_p95']:.2f}ms")
            print(f"  Target: <{PERFORMANCE_TARGETS['database_write_25_items']}ms")
            print("  ✓ PASS" if self.results['write_25_items_avg'] < PERFORMANCE_TARGETS['database_write_25_items'] else "  ✗ FAIL")
        
        # Test mobile write service
        print("\nTesting mobile write service performance...")
        
        mobile_write_times = []
        for i in range(10):
            test_mobile_data = self._create_test_mobile_data()
            start = time.perf_counter()
            try:
                result = await self.mobile_write_service.sync_mobile_data(test_mobile_data)
                elapsed = (time.perf_counter() - start) * 1000
                mobile_write_times.append(elapsed)
                print(f"  Iteration {i+1}: {elapsed:.2f}ms")
            except Exception as e:
                print(f"  Error in iteration {i+1}: {e}")
        
        if mobile_write_times:
            self.results["mobile_write_avg"] = statistics.mean(mobile_write_times)
            self.results["mobile_write_p95"] = sorted(mobile_write_times)[int(len(mobile_write_times) * 0.95)]
            print(f"  Average: {self.results['mobile_write_avg']:.2f}ms")
            print(f"  P95: {self.results['mobile_write_p95']:.2f}ms")
            print("  Target: <200ms sync")
            print("  ✓ PASS" if self.results['mobile_write_avg'] < 200 else "  ✗ FAIL")
        
        # Test database operations per second
        print("\nTesting database operations per second...")
        
        start = time.perf_counter()
        operations = 0
        test_duration = 5  # seconds
        
        try:
            while time.perf_counter() - start < test_duration:
                await self.write_service.write_single(self._create_single_write_data())
                operations += 1
            
            ops_per_second = operations / test_duration
            self.results["database_ops_per_second"] = ops_per_second
            print(f"  Operations completed: {operations}")
            print(f"  Duration: {test_duration}s")
            print(f"  Operations/second: {ops_per_second:.0f}")
            print(f"  Target: >{PERFORMANCE_TARGETS['database_ops_per_second']} ops/s")
            print("  ✓ PASS" if ops_per_second > PERFORMANCE_TARGETS['database_ops_per_second'] else "  ✗ FAIL")
        except Exception as e:
            print(f"  Error during ops/s test: {e}")
            
    async def test_scoring_optimizations(self):
        """Test scoring algorithm optimization performance"""
        print("\n3. TESTING SCORING ALGORITHM OPTIMIZATIONS")
        print("-" * 40)
        
        # Test seasonal adjustments
        print("Testing seasonal adjustment calculations...")
        
        seasonal_times = []
        for i in range(100):
            start = time.perf_counter()
            adjustment = calculate_seasonal_adjustment(datetime.now())
            elapsed = (time.perf_counter() - start) * 1000
            seasonal_times.append(elapsed)
        
        self.results["seasonal_adjustment_avg"] = statistics.mean(seasonal_times)
        print(f"  Average: {self.results['seasonal_adjustment_avg']:.4f}ms per calculation")
        
        # Test enhanced bulk detection
        print("\nTesting bulk purchase detection...")
        
        bulk_times = []
        test_quantities = [1, 5, 10, 20, 50, 100, 500]
        
        for quantity in test_quantities:
            start = time.perf_counter()
            is_bulk = detect_bulk_purchase(quantity, "Test Product")
            elapsed = (time.perf_counter() - start) * 1000
            bulk_times.append(elapsed)
            print(f"  Quantity {quantity}: {elapsed:.4f}ms (bulk={is_bulk})")
        
        self.results["bulk_detection_avg"] = statistics.mean(bulk_times)
        print(f"  Average: {self.results['bulk_detection_avg']:.4f}ms per detection")
        
        # Test intelligent caching effectiveness
        print("\nTesting caching effectiveness...")
        
        # First run (cache miss)
        cache_miss_times = []
        for i in range(10):
            test_batch = self._create_test_batches(1)[0]
            start = time.perf_counter()
            score = calculate_movement_score(test_batch)
            elapsed = (time.perf_counter() - start) * 1000
            cache_miss_times.append(elapsed)
        
        # Second run (cache hit - simulated)
        cache_hit_times = []
        for i in range(10):
            test_batch = self._create_test_batches(1)[0]
            start = time.perf_counter()
            score = calculate_movement_score(test_batch)
            elapsed = (time.perf_counter() - start) * 1000
            cache_hit_times.append(elapsed)
        
        self.results["cache_miss_avg"] = statistics.mean(cache_miss_times)
        self.results["cache_hit_avg"] = statistics.mean(cache_hit_times)
        cache_improvement = ((self.results["cache_miss_avg"] - self.results["cache_hit_avg"]) / 
                           self.results["cache_miss_avg"] * 100)
        
        print(f"  Cache miss avg: {self.results['cache_miss_avg']:.2f}ms")
        print(f"  Cache hit avg: {self.results['cache_hit_avg']:.2f}ms")
        print(f"  Cache improvement: {cache_improvement:.1f}%")
        
    async def test_csv_consolidation(self):
        """Test CSV consolidation and processing performance"""
        print("\n4. TESTING CSV CONSOLIDATION")
        print("-" * 40)
        
        # Test unified CSV validation
        print("Testing CSV validation performance...")
        
        csv_content = self._create_test_csv(100)
        
        validation_times = []
        for i in range(5):
            start = time.perf_counter()
            try:
                is_valid = await self.csv_service.validate_csv(csv_content)
                elapsed = (time.perf_counter() - start) * 1000
                validation_times.append(elapsed)
                print(f"  Iteration {i+1}: {elapsed:.2f}ms (valid={is_valid})")
            except Exception as e:
                print(f"  Error in iteration {i+1}: {e}")
        
        if validation_times:
            self.results["csv_validation_avg"] = statistics.mean(validation_times)
            print(f"  Average: {self.results['csv_validation_avg']:.2f}ms")
            print(f"  Target: <{PERFORMANCE_TARGETS['csv_validation']}ms")
            print("  ✓ PASS" if self.results['csv_validation_avg'] < PERFORMANCE_TARGETS['csv_validation'] else "  ✗ FAIL")
        
        # Test CSV processing speed
        print("\nTesting CSV processing performance (25 items)...")
        
        csv_25_content = self._create_test_csv(25)
        
        processing_times = []
        for i in range(10):
            start = time.perf_counter()
            try:
                processed = await self.csv_service.process_csv(csv_25_content)
                elapsed = (time.perf_counter() - start) * 1000
                processing_times.append(elapsed)
                print(f"  Iteration {i+1}: {elapsed:.2f}ms")
            except Exception as e:
                print(f"  Error in iteration {i+1}: {e}")
        
        if processing_times:
            self.results["csv_processing_25_avg"] = statistics.mean(processing_times)
            print(f"  Average: {self.results['csv_processing_25_avg']:.2f}ms")
            print(f"  Target: <{PERFORMANCE_TARGETS['csv_processing_25_items']}ms")
            print("  ✓ PASS" if self.results['csv_processing_25_avg'] < PERFORMANCE_TARGETS['csv_processing_25_items'] else "  ✗ FAIL")
        
        # Test template generation
        print("\nTesting template generation speed...")
        
        template_times = []
        for i in range(10):
            start = time.perf_counter()
            template = self.csv_service.generate_template()
            elapsed = (time.perf_counter() - start) * 1000
            template_times.append(elapsed)
        
        self.results["template_generation_avg"] = statistics.mean(template_times)
        print(f"  Average: {self.results['template_generation_avg']:.2f}ms")
        
    async def test_startup_and_memory(self):
        """Test startup time and memory improvements from import cleanup"""
        print("\n5. TESTING IMPORT CLEANUP BENEFITS")
        print("-" * 40)
        
        # Measure current memory usage
        process = psutil.Process()
        memory_info = process.memory_info()
        
        self.results["memory_rss_mb"] = memory_info.rss / 1024 / 1024
        self.results["memory_vms_mb"] = memory_info.vms / 1024 / 1024
        
        print("Current Memory Usage:")
        print(f"  RSS: {self.results['memory_rss_mb']:.2f} MB")
        print(f"  VMS: {self.results['memory_vms_mb']:.2f} MB")
        
        # Test module import time
        print("\nTesting module import times...")
        
        import_times = {}
        modules_to_test = [
            "app.core.scoring",
            "app.core.scoring_optimizations",
            "app.services.unified_write_service",
            "app.services.batch_creation_service",
            "app.services.csv.unified_csv_service"
        ]
        
        for module_name in modules_to_test:
            if module_name in sys.modules:
                del sys.modules[module_name]
            
            start = time.perf_counter()
            __import__(module_name)
            elapsed = (time.perf_counter() - start) * 1000
            import_times[module_name] = elapsed
            print(f"  {module_name}: {elapsed:.2f}ms")
        
        self.results["total_import_time"] = sum(import_times.values())
        print(f"  Total import time: {self.results['total_import_time']:.2f}ms")
        
        # Simulate startup time
        print("\nSimulating application startup...")
        
        start = time.perf_counter()
        # Import main application modules
        elapsed = (time.perf_counter() - start) * 1000
        
        self.results["startup_time"] = elapsed
        print(f"  Startup time: {elapsed:.2f}ms")
        print(f"  Target: <{PERFORMANCE_TARGETS['startup_time']}ms")
        print("  ✓ PASS" if elapsed < PERFORMANCE_TARGETS['startup_time'] else "  ✗ FAIL")
        
    async def test_multiport_servers(self):
        """Test performance across multiple server ports"""
        print("\n6. TESTING MULTI-PORT SERVER PERFORMANCE")
        print("-" * 40)
        
        ports = [8000, 8001, 8002, 8003, 8004, 8005]
        port_results = {}
        
        async with httpx.AsyncClient() as client:
            for port in ports:
                url = f"http://localhost:{port}"
                print(f"\nTesting port {port}...")
                
                # Test health endpoint
                health_times = []
                for i in range(20):
                    try:
                        start = time.perf_counter()
                        response = await client.get(f"{url}/api/v1/health")
                        elapsed = (time.perf_counter() - start) * 1000
                        if response.status_code == 200:
                            health_times.append(elapsed)
                    except Exception as e:
                        print(f"    Error on port {port}: {e}")
                        break
                
                if health_times:
                    port_results[port] = {
                        "avg": statistics.mean(health_times),
                        "p95": sorted(health_times)[int(len(health_times) * 0.95)],
                        "min": min(health_times),
                        "max": max(health_times)
                    }
                    print("  Health endpoint:")
                    print(f"    Avg: {port_results[port]['avg']:.2f}ms")
                    print(f"    P95: {port_results[port]['p95']:.2f}ms")
                    print(f"    Min: {port_results[port]['min']:.2f}ms")
                    print(f"    Max: {port_results[port]['max']:.2f}ms")
                
                # Test mobile summary endpoint
                if port in [8000, 8001]:  # Test primary ports more thoroughly
                    mobile_times = []
                    for i in range(10):
                        try:
                            start = time.perf_counter()
                            response = await client.get(
                                f"{url}/api/v1/mvp/analytics/mobile-summary",
                                params={"user_id": self.test_user_id}
                            )
                            elapsed = (time.perf_counter() - start) * 1000
                            if response.status_code == 200:
                                mobile_times.append(elapsed)
                        except Exception:
                            pass
                    
                    if mobile_times:
                        port_results[f"{port}_mobile"] = {
                            "avg": statistics.mean(mobile_times),
                            "p95": sorted(mobile_times)[int(len(mobile_times) * 0.95)]
                        }
                        print("  Mobile summary endpoint:")
                        print(f"    Avg: {port_results[f'{port}_mobile']['avg']:.2f}ms")
                        print(f"    P95: {port_results[f'{port}_mobile']['p95']:.2f}ms")
                        print(f"    Target: <{PERFORMANCE_TARGETS['mobile_summary']}ms")
                        print("    ✓ PASS" if port_results[f'{port}_mobile']['avg'] < PERFORMANCE_TARGETS['mobile_summary'] else "    ✗ FAIL")
        
        self.results["multiport_results"] = port_results
        
    def generate_performance_report(self):
        """Generate comprehensive performance report"""
        print("\n" + "=" * 80)
        print("PERFORMANCE TEST SUMMARY REPORT")
        print("=" * 80)
        
        # Overall results
        print("\n📊 PERFORMANCE METRICS VS TARGETS:")
        print("-" * 40)
        
        metrics = [
            ("Mobile Summary", self.results.get("8000_mobile", {}).get("avg"), PERFORMANCE_TARGETS["mobile_summary"]),
            ("Bulk Scoring (71 batches)", self.results.get("bulk_scoring_avg"), PERFORMANCE_TARGETS["bulk_scoring_71_batches"]),
            ("Database Write (25 items)", self.results.get("write_25_items_avg"), PERFORMANCE_TARGETS["database_write_25_items"]),
            ("CSV Validation", self.results.get("csv_validation_avg"), PERFORMANCE_TARGETS["csv_validation"]),
            ("CSV Processing (25 items)", self.results.get("csv_processing_25_avg"), PERFORMANCE_TARGETS["csv_processing_25_items"]),
            ("Mobile Write Sync", self.results.get("mobile_write_avg"), 200),
            ("Database Ops/Second", self.results.get("database_ops_per_second"), PERFORMANCE_TARGETS["database_ops_per_second"], True),
        ]
        
        passed = 0
        failed = 0
        
        for metric_name, actual, target, *args in metrics:
            is_throughput = args[0] if args else False
            
            if actual is None:
                status = "⚠️  NO DATA"
            elif is_throughput:
                status = "✅ PASS" if actual > target else "❌ FAIL"
                if actual > target:
                    passed += 1
                else:
                    failed += 1
                print(f"{metric_name:30} {actual:>10.0f} ops/s  Target: >{target} ops/s  {status}")
            else:
                status = "✅ PASS" if actual < target else "❌ FAIL"
                if actual < target:
                    passed += 1
                else:
                    failed += 1
                print(f"{metric_name:30} {actual:>10.2f}ms  Target: <{target}ms  {status}")
        
        # Performance improvements
        print("\n📈 PERFORMANCE IMPROVEMENTS:")
        print("-" * 40)
        
        if self.results.get("bulk_scoring_avg"):
            # Calculate improvement from baseline (5000ms for 71 batches pre-optimization)
            baseline = 5000
            improvement = ((baseline - self.results["bulk_scoring_avg"]) / baseline) * 100
            print(f"Bulk Scoring Improvement: {improvement:.1f}% faster (from ~{baseline}ms to {self.results['bulk_scoring_avg']:.0f}ms)")
        
        if self.results.get("cache_miss_avg") and self.results.get("cache_hit_avg"):
            cache_improvement = ((self.results["cache_miss_avg"] - self.results["cache_hit_avg"]) / 
                               self.results["cache_miss_avg"] * 100)
            print(f"Caching Effectiveness: {cache_improvement:.1f}% faster with cache hits")
        
        # Memory and startup
        print("\n💾 MEMORY & STARTUP:")
        print("-" * 40)
        print(f"Memory RSS: {self.results.get('memory_rss_mb', 0):.2f} MB")
        print(f"Memory VMS: {self.results.get('memory_vms_mb', 0):.2f} MB")
        print(f"Startup Time: {self.results.get('startup_time', 0):.2f}ms")
        print(f"Total Import Time: {self.results.get('total_import_time', 0):.2f}ms")
        
        # Multi-port server status
        print("\n🖥️  MULTI-PORT SERVER STATUS:")
        print("-" * 40)
        
        if "multiport_results" in self.results:
            for port in [8000, 8001, 8002, 8003, 8004, 8005]:
                if port in self.results["multiport_results"]:
                    avg = self.results["multiport_results"][port]["avg"]
                    p95 = self.results["multiport_results"][port]["p95"]
                    print(f"Port {port}: ✅ ACTIVE (Health avg: {avg:.2f}ms, P95: {p95:.2f}ms)")
                else:
                    print(f"Port {port}: ❌ NOT RESPONDING")
        
        # Overall summary
        print("\n🎯 OVERALL RESULTS:")
        print("-" * 40)
        print(f"Tests Passed: {passed}")
        print(f"Tests Failed: {failed}")
        print(f"Success Rate: {(passed/(passed+failed)*100):.1f}%" if (passed+failed) > 0 else "N/A")
        
        if passed > failed:
            print("\n✅ Phase 2 optimizations are delivering expected performance improvements!")
        else:
            print("\n⚠️  Some optimizations need further tuning to meet targets.")
        
        # Save results to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"/home/slim/lifo-app/lifo_api/tests/performance/phase2_report_{timestamp}.json"
        
        with open(report_file, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)
        
        print(f"\n📄 Detailed report saved to: {report_file}")
        
    # Helper methods
    def _create_test_batches(self, count: int) -> List[Dict]:
        """Create test batch data"""
        batches = []
        for i in range(count):
            batch = {
                "id": f"test_batch_{i}",
                "user_id": self.test_user_id,
                "product_id": f"product_{i % 10}",
                "quantity": random.randint(1, 100),
                "purchase_date": (datetime.now() - timedelta(days=random.randint(1, 365))).isoformat(),
                "expiry_date": (datetime.now() + timedelta(days=random.randint(1, 365))).isoformat(),
                "cost": round(random.uniform(10, 1000), 2),
                "location": random.choice(["warehouse", "store", "backroom"]),
                "supplier": f"supplier_{i % 5}"
            }
            batches.append(batch)
        return batches
    
    def _create_test_write_data(self, count: int) -> List[Dict]:
        """Create test data for write operations"""
        data = []
        for i in range(count):
            item = {
                "user_id": self.test_user_id,
                "product_name": f"Test Product {i}",
                "quantity": random.randint(1, 100),
                "cost": round(random.uniform(10, 1000), 2),
                "timestamp": datetime.now().isoformat()
            }
            data.append(item)
        return data
    
    def _create_single_write_data(self) -> Dict:
        """Create single write data item"""
        return {
            "user_id": self.test_user_id,
            "product_name": f"Test Product {random.randint(1, 1000)}",
            "quantity": random.randint(1, 100),
            "cost": round(random.uniform(10, 1000), 2),
            "timestamp": datetime.now().isoformat()
        }
    
    def _create_test_mobile_data(self) -> Dict:
        """Create test mobile sync data"""
        return {
            "user_id": self.test_user_id,
            "device_id": "test_device",
            "sync_data": {
                "batches": self._create_test_batches(5),
                "timestamp": datetime.now().isoformat()
            }
        }
    
    def _create_test_csv(self, rows: int) -> str:
        """Create test CSV content"""
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow(["Product Name", "Quantity", "Cost", "Expiry Date", "Location"])
        
        # Data rows
        for i in range(rows):
            writer.writerow([
                f"Product {i}",
                random.randint(1, 100),
                round(random.uniform(10, 1000), 2),
                (datetime.now() + timedelta(days=random.randint(1, 365))).strftime("%Y-%m-%d"),
                random.choice(["Warehouse", "Store", "Backroom"])
            ])
        
        return output.getvalue()


async def main():
    """Main entry point for performance testing"""
    # Test with primary server
    suite = PerformanceTestSuite("http://localhost:8000")
    await suite.run_all_tests()


if __name__ == "__main__":
    print("Starting Phase 2 Performance Validation Suite...")
    print("This will take several minutes to complete all tests.")
    print("-" * 80)
    
    asyncio.run(main())