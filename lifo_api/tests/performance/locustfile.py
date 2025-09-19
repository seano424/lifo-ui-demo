"""
Load Testing Configuration for Phase 2 API Consolidations
Uses Locust for performance testing of consolidated endpoints
"""

import json
import random
from datetime import datetime, timedelta

from locust import HttpUser, between, task


class MobileUser(HttpUser):
    """
    Simulates mobile app users with high-frequency, lightweight requests
    Target: <300ms response time for all mobile endpoints
    """
    
    wait_time = between(1, 3)  # Mobile users check frequently
    
    def on_start(self):
        """Authenticate and setup test data"""
        # Login to get auth token
        response = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@lifo.ai",
                "password": "test123"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.headers = {}
        
        # Test data
        self.store_ids = ["store_001", "store_002", "store_003"]
        self.batch_ids = [f"batch_{i:03d}" for i in range(1, 101)]
        self.categories = ["fresh_produce", "dairy", "bakery_fresh", "frozen"]

    @task(30)  # Most common mobile operation
    def get_mobile_summary(self):
        """Test mobile summary endpoint - highest priority"""
        store_id = random.choice(self.store_ids)
        
        with self.client.get(
            f"/api/v1/mobile/mobile-summary/{store_id}",
            headers=self.headers,
            catch_response=True,
            name="/mobile-summary"
        ) as response:
            if response.elapsed.total_seconds() > 0.3:
                response.failure(f"Too slow: {response.elapsed.total_seconds():.3f}s")
            elif response.status_code != 200:
                response.failure(f"Status: {response.status_code}")
            else:
                response.success()

    @task(20)
    def get_batch_quick_score(self):
        """Test quick scoring for individual batch"""
        batch_id = random.choice(self.batch_ids)
        
        with self.client.get(
            f"/api/v1/mobile/batch-quick-score/{batch_id}",
            headers=self.headers,
            catch_response=True,
            name="/batch-quick-score"
        ) as response:
            if response.elapsed.total_seconds() > 0.2:
                response.failure(f"Too slow: {response.elapsed.total_seconds():.3f}s")
            elif response.status_code != 200:
                response.failure(f"Status: {response.status_code}")
            else:
                response.success()

    @task(15)
    def get_store_health(self):
        """Test store health endpoint"""
        store_id = random.choice(self.store_ids)
        
        with self.client.get(
            f"/api/v1/mobile/store-health/{store_id}",
            headers=self.headers,
            catch_response=True,
            name="/store-health"
        ) as response:
            if response.elapsed.total_seconds() > 0.3:
                response.failure(f"Too slow: {response.elapsed.total_seconds():.3f}s")
            else:
                response.success()

    @task(10)
    def get_batch_list_mobile(self):
        """Test mobile batch list with pagination"""
        store_id = random.choice(self.store_ids)
        category = random.choice(self.categories)
        
        with self.client.get(
            f"/api/v1/mobile/batch-list-mobile/{store_id}?category={category}&limit=20",
            headers=self.headers,
            catch_response=True,
            name="/batch-list-mobile"
        ) as response:
            if response.elapsed.total_seconds() > 0.3:
                response.failure(f"Too slow: {response.elapsed.total_seconds():.3f}s")
            else:
                response.success()


class CSVProcessingUser(HttpUser):
    """
    Simulates users uploading and processing CSV files
    Tests consolidated CSV endpoints
    """
    
    wait_time = between(5, 10)  # Less frequent bulk operations
    
    def on_start(self):
        """Setup authentication and test data"""
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "manager@lifo.ai", "password": "manager123"}
        )
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.headers = {}
        
        self.store_ids = ["store_001", "store_002", "store_003"]

    def generate_csv_content(self, rows: int = 100) -> str:
        """Generate test CSV content"""
        lines = ["sku,product_name,category,quantity,expiry_date,cost_price,selling_price"]
        
        for i in range(rows):
            expiry = (datetime.now() + timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d")
            lines.append(
                f"SKU{i:04d},Product {i},fresh_produce,{random.randint(10, 100)},"
                f"{expiry},{random.uniform(1, 10):.2f},{random.uniform(2, 20):.2f}"
            )
        
        return "\n".join(lines)

    @task(5)
    def validate_csv(self):
        """Test CSV validation endpoint"""
        store_id = random.choice(self.store_ids)
        csv_content = self.generate_csv_content(50)
        
        files = {"file": ("test.csv", csv_content, "text/csv")}
        data = {"store_id": store_id}
        
        with self.client.post(
            "/api/v1/csv/validate",
            files=files,
            data=data,
            headers=self.headers,
            catch_response=True,
            name="/csv/validate"
        ) as response:
            if response.elapsed.total_seconds() > 2.0:
                response.failure(f"Too slow: {response.elapsed.total_seconds():.3f}s")
            else:
                response.success()

    @task(3)
    def upload_csv(self):
        """Test CSV upload and processing"""
        store_id = random.choice(self.store_ids)
        csv_content = self.generate_csv_content(100)
        
        files = {"file": ("inventory.csv", csv_content, "text/csv")}
        data = {"store_id": store_id}
        
        with self.client.post(
            "/api/v1/csv/upload",
            files=files,
            data=data,
            headers=self.headers,
            catch_response=True,
            name="/csv/upload"
        ) as response:
            if response.elapsed.total_seconds() > 5.0:
                response.failure(f"Too slow: {response.elapsed.total_seconds():.3f}s")
            else:
                response.success()

    @task(2)
    def upload_and_create_batches(self):
        """Test CSV upload with batch creation"""
        store_id = random.choice(self.store_ids)
        csv_content = self.generate_csv_content(25)  # Test target: 100ms per 25 items
        
        files = {"file": ("batches.csv", csv_content, "text/csv")}
        data = {"store_id": store_id, "chunk_size": 50}
        
        with self.client.post(
            "/api/v1/csv/upload-and-create-batches",
            files=files,
            data=data,
            headers=self.headers,
            catch_response=True,
            name="/csv/upload-and-create-batches"
        ) as response:
            # Performance target: <100ms per 25 items
            if response.elapsed.total_seconds() > 0.1:
                response.failure(f"Too slow: {response.elapsed.total_seconds():.3f}s")
            else:
                response.success()

    @task(1)
    def get_csv_template(self):
        """Test CSV template download"""
        with self.client.get(
            "/api/v1/csv/template",
            headers=self.headers,
            catch_response=True,
            name="/csv/template"
        ) as response:
            if response.elapsed.total_seconds() > 0.5:
                response.failure(f"Too slow: {response.elapsed.total_seconds():.3f}s")
            else:
                response.success()


class AnalyticsUser(HttpUser):
    """
    Simulates dashboard and analytics users
    Tests analytics consolidation performance
    """
    
    wait_time = between(5, 15)  # Analytics users check less frequently
    
    def on_start(self):
        """Setup authentication"""
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "analyst@lifo.ai", "password": "analyst123"}
        )
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.headers = {}
        
        self.store_ids = ["store_001", "store_002", "store_003"]

    @task(10)
    def get_dashboard_data(self):
        """Test dashboard data endpoint"""
        store_id = random.choice(self.store_ids)
        
        with self.client.get(
            f"/api/v1/analytics/dashboard/{store_id}",
            headers=self.headers,
            catch_response=True,
            name="/analytics/dashboard"
        ) as response:
            if response.elapsed.total_seconds() > 0.5:
                response.failure(f"Too slow: {response.elapsed.total_seconds():.3f}s")
            else:
                response.success()

    @task(5)
    def get_store_analytics(self):
        """Test comprehensive analytics endpoint"""
        store_id = random.choice(self.store_ids)
        days = random.choice([7, 30, 90])
        
        with self.client.get(
            f"/api/v1/analytics/store/{store_id}?days={days}",
            headers=self.headers,
            catch_response=True,
            name="/analytics/store"
        ) as response:
            # Analytics queries can be slower
            if response.elapsed.total_seconds() > 0.5:
                response.failure(f"Too slow: {response.elapsed.total_seconds():.3f}s")
            else:
                response.success()

    @task(3)
    def trigger_scoring(self):
        """Test background scoring trigger"""
        store_id = random.choice(self.store_ids)
        
        with self.client.post(
            f"/api/v1/analytics/scoring/trigger/{store_id}",
            headers=self.headers,
            catch_response=True,
            name="/analytics/scoring/trigger"
        ) as response:
            if response.elapsed.total_seconds() > 1.0:
                response.failure(f"Too slow: {response.elapsed.total_seconds():.3f}s")
            else:
                response.success()

    @task(2)
    def get_performance_metrics(self):
        """Test performance metrics endpoint"""
        store_id = random.choice(self.store_ids)
        days = random.choice([30, 60, 90])
        
        with self.client.get(
            f"/api/v1/analytics/performance/{store_id}?days={days}",
            headers=self.headers,
            catch_response=True,
            name="/analytics/performance"
        ) as response:
            if response.elapsed.total_seconds() > 0.5:
                response.failure(f"Too slow: {response.elapsed.total_seconds():.3f}s")
            else:
                response.success()


class HealthCheckUser(HttpUser):
    """
    Simulates health check monitoring
    Must maintain <50ms response time
    """
    
    wait_time = between(10, 30)  # Health checks are periodic
    
    @task(10)
    def basic_health(self):
        """Test basic health check"""
        with self.client.get(
            "/api/v1/health",
            catch_response=True,
            name="/health"
        ) as response:
            if response.elapsed.total_seconds() > 0.05:  # 50ms target
                response.failure(f"Too slow: {response.elapsed.total_seconds():.3f}s")
            else:
                response.success()

    @task(5)
    def detailed_health(self):
        """Test detailed health check"""
        with self.client.get(
            "/api/v1/health/detailed",
            catch_response=True,
            name="/health/detailed"
        ) as response:
            if response.elapsed.total_seconds() > 0.1:  # 100ms for detailed
                response.failure(f"Too slow: {response.elapsed.total_seconds():.3f}s")
            else:
                response.success()

    @task(2)
    def readiness_check(self):
        """Test readiness probe"""
        with self.client.get(
            "/api/v1/health/ready",
            catch_response=True,
            name="/health/ready"
        ) as response:
            if response.elapsed.total_seconds() > 0.05:
                response.failure(f"Too slow: {response.elapsed.total_seconds():.3f}s")
            else:
                response.success()


class MixedLoadUser(HttpUser):
    """
    Simulates realistic mixed usage patterns
    Combines all user types with realistic weights
    """
    
    wait_time = between(2, 8)
    
    tasks = {
        MobileUser: 50,      # 50% mobile traffic
        CSVProcessingUser: 20,  # 20% CSV operations
        AnalyticsUser: 25,      # 25% analytics
        HealthCheckUser: 5      # 5% health checks
    }


# Custom test shapes for different scenarios
class StageLoadTest(HttpUser):
    """
    Staged load test simulating daily traffic patterns
    """
    
    @classmethod
    def get_stages(cls):
        return [
            {"duration": 120, "users": 50, "spawn_rate": 2},   # Morning ramp-up
            {"duration": 300, "users": 100, "spawn_rate": 5},  # Morning peak
            {"duration": 180, "users": 75, "spawn_rate": 2},   # Mid-day
            {"duration": 300, "users": 150, "spawn_rate": 10}, # Afternoon peak
            {"duration": 120, "users": 50, "spawn_rate": 5},   # Evening wind-down
            {"duration": 60, "users": 0, "spawn_rate": 10},    # Shutdown
        ]


# Performance assertions for CI/CD
class PerformanceAssertions:
    """
    Performance targets that must be met
    """
    
    TARGETS = {
        "/mobile-summary": {"p95": 300, "p99": 500},
        "/batch-quick-score": {"p95": 200, "p99": 300},
        "/csv/upload": {"p95": 5000, "p99": 8000},
        "/analytics/dashboard": {"p95": 500, "p99": 1000},
        "/health": {"p95": 50, "p99": 100},
    }
    
    @classmethod
    def check_performance(cls, stats):
        """Check if performance targets are met"""
        failures = []
        
        for endpoint, targets in cls.TARGETS.items():
            if endpoint in stats:
                p95 = stats[endpoint].get("p95", 0)
                p99 = stats[endpoint].get("p99", 0)
                
                if p95 > targets["p95"]:
                    failures.append(
                        f"{endpoint}: p95={p95}ms exceeds target {targets['p95']}ms"
                    )
                if p99 > targets["p99"]:
                    failures.append(
                        f"{endpoint}: p99={p99}ms exceeds target {targets['p99']}ms"
                    )
        
        return failures