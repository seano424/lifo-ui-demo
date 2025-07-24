# LIFO AI Production Readiness Checklist

This document outlines all changes required to transition from development/testing stubs to production-ready implementations.

## 🚨 **CRITICAL SECURITY ITEMS**

### **Priority Level: BLOCKING**

_Must be implemented before any production deployment_

---

## **1. Authentication & Authorization (CRITICAL)**

### **File**: `/lifo_ai_core/database/operations.py`

**Lines**: 49-60
**Current Issue**: Always returns `True` - bypasses all security

```python
# ❌ CURRENT (INSECURE):
async def validate_store_access(
    self,
    store_id: str,
    user_id: str,
    required_role: str = "staff"
) -> bool:
    # Implementation would check user permissions in database
    # For now, return True for development
    return True  # ⚠️ SECURITY VULNERABILITY
```

**✅ PRODUCTION IMPLEMENTATION:**

```python
async def validate_store_access(
    self,
    store_id: str,
    user_id: str,
    required_role: str = "staff"
) -> bool:
    """
    Validate user has required access level to store
    Uses Supabase RLS policies and store_users table
    """
    if not self.db:
        self.logger.error("Database connection not available for security validation")
        return False

    try:
        # Query store_users table with RLS policies
        query = """
        SELECT su.role_in_store, su.permissions, s.is_active as store_active
        FROM business.store_users su
        JOIN business.stores s ON su.store_id = s.store_id
        WHERE su.store_id = $1
          AND su.user_id = $2
          AND su.is_active = true
          AND s.is_active = true
        """

        result = await self.db.fetchrow(query, store_id, user_id)

        if not result:
            self.logger.warning(f"Access denied: User {user_id} not found in store {store_id}")
            return False

        # Check role hierarchy
        role_hierarchy = {
            'viewer': 1,
            'staff': 2,
            'manager': 3,
            'owner': 4
        }

        user_level = role_hierarchy.get(result['role_in_store'], 0)
        required_level = role_hierarchy.get(required_role, 2)

        has_access = user_level >= required_level

        if not has_access:
            self.logger.warning(
                f"Access denied: User {user_id} role '{result['role_in_store']}' < required '{required_role}'"
            )

        return has_access

    except Exception as e:
        self.logger.error(f"Security validation failed: {e}")
        # FAIL SECURE - deny access on errors
        return False
```

---

## **2. User Store Access (HIGH PRIORITY)**

### **File**: `/lifo_ai_core/database/operations.py`

**Lines**: 75-84
**Current Issue**: Returns empty list instead of user's actual stores

```python
# ❌ CURRENT (NON-FUNCTIONAL):
async def get_user_stores(self, user_id: str) -> List[Dict[str, Any]]:
    # Implementation would query database for user stores
    # For now, return empty list
    return []
```

**✅ PRODUCTION IMPLEMENTATION:**

```python
async def get_user_stores(self, user_id: str) -> List[Dict[str, Any]]:
    """
    Get all stores user has access to
    Returns stores with user's role and permissions
    """
    if not self.db:
        self.logger.error("Database connection not available")
        return []

    try:
        # Query with RLS - user sees only their accessible stores
        query = """
        SELECT
            s.store_id,
            s.store_name,
            s.store_code,
            s.business_name,
            s.address,
            s.is_active,
            su.role_in_store,
            su.permissions,
            su.assigned_at,
            -- Store statistics
            (SELECT COUNT(*) FROM inventory.batches b WHERE b.store_id = s.store_id) as total_batches,
            (SELECT COUNT(DISTINCT product_id) FROM inventory.batches b WHERE b.store_id = s.store_id) as unique_products
        FROM business.stores s
        JOIN business.store_users su ON s.store_id = su.store_id
        WHERE su.user_id = $1
          AND su.is_active = true
          AND s.is_active = true
        ORDER BY su.role_in_store DESC, s.store_name ASC
        """

        results = await self.db.fetch(query, user_id)

        stores = []
        for row in results:
            store_data = {
                "store_id": row['store_id'],
                "store_name": row['store_name'],
                "store_code": row['store_code'],
                "business_name": row['business_name'],
                "address": row['address'],
                "is_active": row['is_active'],
                "user_role": row['role_in_store'],
                "user_permissions": row['permissions'],
                "assigned_at": row['assigned_at'].isoformat() if row['assigned_at'] else None,
                "statistics": {
                    "total_batches": row['total_batches'],
                    "unique_products": row['unique_products']
                }
            }
            stores.append(store_data)

        self.logger.info(f"Retrieved {len(stores)} stores for user {user_id}")
        return stores

    except Exception as e:
        self.logger.error(f"Failed to get user stores: {e}")
        return []
```

---

## **3. Store Creation (HIGH PRIORITY)**

### **File**: `/lifo_ai_core/database/operations.py`

**Lines**: 103-125
**Current Issue**: Creates mock store data instead of real database records

```python
# ❌ CURRENT (MOCK DATA):
async def create_store(self, store_data: Dict[str, Any], owner_id: str) -> Dict[str, Any]:
    # Implementation would create store in database
    store_id = f"store_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    created_store = {
        "store_id": store_id,
        "owner_id": owner_id,
        # ... mock data
    }
    return created_store
```

**✅ PRODUCTION IMPLEMENTATION:**

```python
async def create_store(
    self,
    store_data: Dict[str, Any],
    owner_id: str
) -> Dict[str, Any]:
    """
    Create new store in Supabase with proper RLS and relationships
    Creates store record and assigns owner permissions
    """
    if not self.db:
        raise DatabaseOperationError("Database connection not available")

    try:
        # Start transaction for atomic store + user assignment
        async with self.db.transaction():
            # Create store record
            store_query = """
            INSERT INTO business.stores (
                store_name, store_code, business_name, address,
                owner_id, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
            RETURNING store_id, store_name, store_code, business_name,
                      address, created_at, updated_at
            """

            store_result = await self.db.fetchrow(
                store_query,
                store_data.get("store_name", "New Store"),
                store_data.get("store_code", f"ST{datetime.now().strftime('%Y%m%d%H%M')}"),
                store_data.get("business_name", ""),
                store_data.get("address", ""),
                owner_id
            )

            if not store_result:
                raise DatabaseOperationError("Failed to create store record")

            store_id = store_result['store_id']

            # Assign owner to store_users table
            user_assignment_query = """
            INSERT INTO business.store_users (
                store_id, user_id, role_in_store, permissions,
                assigned_by, assigned_at, is_active
            ) VALUES ($1, $2, 'owner', $3, $4, NOW(), true)
            """

            owner_permissions = {
                "can_upload_inventory": True,
                "can_apply_discounts": True,
                "can_view_analytics": True,
                "can_manage_users": True,
                "can_edit_store": True,
                "can_delete_batches": True,
                "can_manage_categories": True
            }

            await self.db.execute(
                user_assignment_query,
                store_id,
                owner_id,
                owner_permissions,
                owner_id  # self-assigned
            )

            # Create initial store settings
            settings_query = """
            INSERT INTO business.store_settings (
                store_id,
                scoring_weights,
                alert_thresholds,
                business_hours,
                created_at
            ) VALUES ($1, $2, $3, $4, NOW())
            """

            default_scoring_weights = {
                "expiry": 0.5,
                "velocity": 0.3,
                "margin": 0.2
            }

            default_alert_thresholds = {
                "expiry_warning_days": 3,
                "low_stock_threshold": 5,
                "high_score_threshold": 0.8
            }

            default_business_hours = {
                "monday": {"open": "09:00", "close": "18:00"},
                "tuesday": {"open": "09:00", "close": "18:00"},
                "wednesday": {"open": "09:00", "close": "18:00"},
                "thursday": {"open": "09:00", "close": "18:00"},
                "friday": {"open": "09:00", "close": "18:00"},
                "saturday": {"open": "09:00", "close": "17:00"},
                "sunday": {"closed": True}
            }

            await self.db.execute(
                settings_query,
                store_id,
                default_scoring_weights,
                default_alert_thresholds,
                default_business_hours
            )

            # Return complete store data
            created_store = {
                "store_id": store_result['store_id'],
                "store_name": store_result['store_name'],
                "store_code": store_result['store_code'],
                "business_name": store_result['business_name'],
                "address": store_result['address'],
                "owner_id": owner_id,
                "is_active": True,
                "created_at": store_result['created_at'].isoformat(),
                "updated_at": store_result['updated_at'].isoformat(),
                "user_role": "owner",
                "user_permissions": owner_permissions
            }

            self.logger.info(f"Store created successfully: {store_id} by user {owner_id}")
            return created_store

    except Exception as e:
        self.logger.error(f"Store creation failed: {e}")
        raise DatabaseOperationError(f"Failed to create store: {e}")
```

---

## **4. Product Search & Management (MEDIUM PRIORITY)**

### **File**: `/lifo_ai_core/database/operations.py`

**Lines**: 139-148, 169-180
**Current Issue**: Product search returns None/empty instead of real data

```python
# ❌ CURRENT (NON-FUNCTIONAL):
async def find_global_product_by_barcode(self, barcode: str) -> Optional[Dict[str, Any]]:
    # Implementation would query global products table
    return None

async def search_global_products(...) -> List[Dict[str, Any]]:
    # Implementation would search products table
    return []
```

**✅ PRODUCTION IMPLEMENTATION:**

```python
async def find_global_product_by_barcode(self, barcode: str) -> Optional[Dict[str, Any]]:
    """
    Find product in global catalog by barcode
    Returns product with store-specific pricing if available
    """
    if not self.db or not barcode:
        return None

    try:
        query = """
        SELECT
            p.product_id,
            p.name,
            p.brand,
            p.category,
            p.barcode,
            p.unit_type,
            p.typical_shelf_life_days,
            p.sku,
            p.created_at,
            p.updated_at,
            -- Aggregated store data
            COUNT(sp.store_id) as stores_carrying,
            AVG(sp.cost_price) as avg_cost_price,
            AVG(sp.selling_price) as avg_selling_price
        FROM inventory.products p
        LEFT JOIN inventory.store_products sp ON p.product_id = sp.product_id
        WHERE p.barcode = $1 AND p.is_active = true
        GROUP BY p.product_id, p.name, p.brand, p.category, p.barcode,
                 p.unit_type, p.typical_shelf_life_days, p.sku, p.created_at, p.updated_at
        """

        result = await self.db.fetchrow(query, barcode)

        if not result:
            self.logger.info(f"No product found for barcode: {barcode}")
            return None

        product_data = {
            "product_id": result['product_id'],
            "name": result['name'],
            "brand": result['brand'],
            "category": result['category'],
            "barcode": result['barcode'],
            "unit_type": result['unit_type'],
            "typical_shelf_life_days": result['typical_shelf_life_days'],
            "sku": result['sku'],
            "created_at": result['created_at'].isoformat() if result['created_at'] else None,
            "updated_at": result['updated_at'].isoformat() if result['updated_at'] else None,
            "market_data": {
                "stores_carrying": result['stores_carrying'],
                "avg_cost_price": float(result['avg_cost_price']) if result['avg_cost_price'] else None,
                "avg_selling_price": float(result['avg_selling_price']) if result['avg_selling_price'] else None
            }
        }

        self.logger.info(f"Found product {result['product_id']} for barcode {barcode}")
        return product_data

    except Exception as e:
        self.logger.error(f"Product search by barcode failed: {e}")
        return None

async def search_global_products(
    self,
    search_term: str,
    store_id: Optional[str] = None,
    limit: int = 20
) -> List[Dict[str, Any]]:
    """
    Search global products by name, brand, or SKU
    Optionally filter by store availability
    """
    if not self.db or not search_term:
        return []

    try:
        # Base query with full-text search
        base_query = """
        SELECT DISTINCT
            p.product_id,
            p.name,
            p.brand,
            p.category,
            p.barcode,
            p.unit_type,
            p.typical_shelf_life_days,
            p.sku,
            -- Store-specific data if store_id provided
            CASE WHEN sp.store_id IS NOT NULL THEN sp.cost_price ELSE NULL END as store_cost_price,
            CASE WHEN sp.store_id IS NOT NULL THEN sp.selling_price ELSE NULL END as store_selling_price,
            CASE WHEN sp.store_id IS NOT NULL THEN sp.is_active ELSE NULL END as in_store,
            -- Search ranking
            ts_rank(
                to_tsvector('english', p.name || ' ' || COALESCE(p.brand, '') || ' ' || p.sku),
                plainto_tsquery('english', $1)
            ) as search_rank
        FROM inventory.products p
        """

        if store_id:
            base_query += """
            LEFT JOIN inventory.store_products sp ON p.product_id = sp.product_id AND sp.store_id = $2
            """
        else:
            base_query += """
            LEFT JOIN inventory.store_products sp ON FALSE  -- No store join
            """

        base_query += """
        WHERE p.is_active = true
          AND (
            to_tsvector('english', p.name || ' ' || COALESCE(p.brand, '') || ' ' || p.sku)
            @@ plainto_tsquery('english', $1)
            OR p.name ILIKE '%' || $1 || '%'
            OR p.brand ILIKE '%' || $1 || '%'
            OR p.sku ILIKE '%' || $1 || '%'
            OR p.barcode = $1
          )
        ORDER BY search_rank DESC, p.name ASC
        LIMIT $""" + str(3 if store_id else 2)

        if store_id:
            results = await self.db.fetch(base_query, search_term, store_id, limit)
        else:
            results = await self.db.fetch(base_query, search_term, limit)

        products = []
        for row in results:
            product_data = {
                "product_id": row['product_id'],
                "name": row['name'],
                "brand": row['brand'],
                "category": row['category'],
                "barcode": row['barcode'],
                "unit_type": row['unit_type'],
                "typical_shelf_life_days": row['typical_shelf_life_days'],
                "sku": row['sku'],
                "search_rank": float(row['search_rank']) if row['search_rank'] else 0.0
            }

            # Add store-specific data if available
            if store_id and row['in_store'] is not None:
                product_data["store_data"] = {
                    "cost_price": float(row['store_cost_price']) if row['store_cost_price'] else None,
                    "selling_price": float(row['store_selling_price']) if row['store_selling_price'] else None,
                    "in_store": row['in_store'],
                    "store_id": store_id
                }

            products.append(product_data)

        self.logger.info(f"Found {len(products)} products for search: {search_term}")
        return products

    except Exception as e:
        self.logger.error(f"Product search failed: {e}")
        return []
```

---

## **5. Store Analytics & Statistics (MEDIUM PRIORITY)**

### **File**: `/lifo_ai_core/database/operations.py`

**Lines**: 260-283
**Current Issue**: Returns zeros instead of real store analytics

```python
# ❌ CURRENT (MOCK DATA):
async def get_store_stats(self, store_id: str) -> Dict[str, Any]:
    # Implementation would calculate real statistics from database
    return {
        "total_products": 0,
        "total_batches": 0,
        "active_alerts": 0,
        "total_value": 0.0,
        "expiring_items": 0,
    }
```

**✅ PRODUCTION IMPLEMENTATION:**

```python
async def get_store_stats(self, store_id: str) -> Dict[str, Any]:
    """
    Calculate comprehensive store statistics and KPIs
    Includes inventory value, expiring items, alerts, and trends
    """
    if not self.db:
        self.logger.warning("Database connection not available for store stats")
        return self._get_empty_stats()

    try:
        # Complex analytics query
        stats_query = """
        WITH store_analytics AS (
            SELECT
                -- Basic counts
                COUNT(DISTINCT b.product_id) as total_products,
                COUNT(b.batch_id) as total_batches,
                SUM(b.current_quantity) as total_quantity,

                -- Financial metrics
                SUM(b.current_quantity * b.cost_price) as total_cost_value,
                SUM(b.current_quantity * b.selling_price) as total_selling_value,
                AVG(b.selling_price - b.cost_price) as avg_margin,

                -- Expiry analysis
                COUNT(CASE WHEN b.expiry_date <= CURRENT_DATE + INTERVAL '3 days'
                           AND b.current_quantity > 0 THEN 1 END) as expiring_soon,
                COUNT(CASE WHEN b.expiry_date <= CURRENT_DATE
                           AND b.current_quantity > 0 THEN 1 END) as expired_items,

                -- Category breakdown
                COUNT(DISTINCT b.category) as categories,

                -- Recent activity (last 7 days)
                COUNT(CASE WHEN b.created_at >= CURRENT_DATE - INTERVAL '7 days'
                           THEN 1 END) as recent_additions,
                COUNT(CASE WHEN b.updated_at >= CURRENT_DATE - INTERVAL '7 days'
                           AND b.updated_at != b.created_at THEN 1 END) as recent_updates

            FROM inventory.batches b
            WHERE b.store_id = $1 AND b.is_active = true
        ),
        category_stats AS (
            SELECT
                json_object_agg(
                    b.category,
                    json_build_object(
                        'count', COUNT(*),
                        'total_value', SUM(b.current_quantity * b.selling_price),
                        'avg_days_to_expiry', AVG(EXTRACT(days FROM (b.expiry_date - CURRENT_DATE)))
                    )
                ) as category_breakdown
            FROM inventory.batches b
            WHERE b.store_id = $1 AND b.is_active = true AND b.current_quantity > 0
            GROUP BY b.store_id
        ),
        alerts AS (
            SELECT COUNT(*) as active_alerts
            FROM inventory.inventory_alerts ia
            WHERE ia.store_id = $1 AND ia.is_resolved = false
        ),
        performance_metrics AS (
            SELECT
                -- Scoring performance
                AVG(b.lifo_score) as avg_lifo_score,
                COUNT(CASE WHEN b.lifo_score >= 0.8 THEN 1 END) as high_priority_items,
                COUNT(CASE WHEN b.lifo_score >= 0.6 AND b.lifo_score < 0.8 THEN 1 END) as medium_priority_items,
                COUNT(CASE WHEN b.lifo_score < 0.6 THEN 1 END) as low_priority_items,

                -- Waste reduction metrics
                SUM(CASE WHEN b.current_quantity = 0 AND b.disposition = 'sold'
                         THEN b.initial_quantity ELSE 0 END) as items_sold,
                SUM(CASE WHEN b.current_quantity = 0 AND b.disposition = 'discarded'
                         THEN b.initial_quantity ELSE 0 END) as items_wasted,

                -- Turnover rate (last 30 days)
                COUNT(CASE WHEN b.updated_at >= CURRENT_DATE - INTERVAL '30 days'
                           AND b.current_quantity < b.initial_quantity THEN 1 END) as items_moved

            FROM inventory.batches b
            WHERE b.store_id = $1
        )
        SELECT
            sa.*,
            cs.category_breakdown,
            a.active_alerts,
            pm.avg_lifo_score,
            pm.high_priority_items,
            pm.medium_priority_items,
            pm.low_priority_items,
            pm.items_sold,
            pm.items_wasted,
            pm.items_moved
        FROM store_analytics sa
        CROSS JOIN category_stats cs
        CROSS JOIN alerts a
        CROSS JOIN performance_metrics pm
        """

        result = await self.db.fetchrow(stats_query, store_id)

        if not result:
            self.logger.warning(f"No statistics found for store: {store_id}")
            return self._get_empty_stats()

        # Calculate derived metrics
        total_cost = float(result['total_cost_value'] or 0)
        total_selling = float(result['total_selling_value'] or 0)
        margin_percentage = ((total_selling - total_cost) / total_selling * 100) if total_selling > 0 else 0

        # Waste metrics
        items_sold = result['items_sold'] or 0
        items_wasted = result['items_wasted'] or 0
        waste_rate = (items_wasted / (items_sold + items_wasted) * 100) if (items_sold + items_wasted) > 0 else 0

        # Turnover rate
        total_items = result['total_batches'] or 1
        turnover_rate = (result['items_moved'] or 0) / total_items * 100

        stats = {
            # Basic inventory metrics
            "total_products": result['total_products'] or 0,
            "total_batches": result['total_batches'] or 0,
            "total_quantity": result['total_quantity'] or 0,
            "categories": result['categories'] or 0,

            # Financial metrics
            "total_cost_value": total_cost,
            "total_selling_value": total_selling,
            "potential_margin": total_selling - total_cost,
            "margin_percentage": round(margin_percentage, 2),
            "avg_margin_per_item": float(result['avg_margin'] or 0),

            # Expiry & alerts
            "expiring_soon": result['expiring_soon'] or 0,
            "expired_items": result['expired_items'] or 0,
            "active_alerts": result['active_alerts'] or 0,

            # Performance metrics
            "avg_lifo_score": round(float(result['avg_lifo_score'] or 0), 3),
            "priority_distribution": {
                "high": result['high_priority_items'] or 0,
                "medium": result['medium_priority_items'] or 0,
                "low": result['low_priority_items'] or 0
            },

            # Business intelligence
            "waste_rate_percentage": round(waste_rate, 2),
            "turnover_rate_percentage": round(turnover_rate, 2),
            "recent_activity": {
                "additions_last_7_days": result['recent_additions'] or 0,
                "updates_last_7_days": result['recent_updates'] or 0
            },

            # Category breakdown
            "category_breakdown": result['category_breakdown'] or {},

            # Timestamps
            "calculated_at": datetime.now().isoformat(),
            "store_id": store_id
        }

        self.logger.info(f"Calculated comprehensive stats for store {store_id}")
        return stats

    except Exception as e:
        self.logger.error(f"Failed to get store stats: {e}")
        return self._get_empty_stats()

def _get_empty_stats(self) -> Dict[str, Any]:
    """Return empty stats structure for error cases"""
    return {
        "total_products": 0,
        "total_batches": 0,
        "total_quantity": 0,
        "categories": 0,
        "total_cost_value": 0.0,
        "total_selling_value": 0.0,
        "potential_margin": 0.0,
        "margin_percentage": 0.0,
        "avg_margin_per_item": 0.0,
        "expiring_soon": 0,
        "expired_items": 0,
        "active_alerts": 0,
        "avg_lifo_score": 0.0,
        "priority_distribution": {"high": 0, "medium": 0, "low": 0},
        "waste_rate_percentage": 0.0,
        "turnover_rate_percentage": 0.0,
        "recent_activity": {"additions_last_7_days": 0, "updates_last_7_days": 0},
        "category_breakdown": {},
        "calculated_at": datetime.now().isoformat(),
        "store_id": None
    }
```

---

## **6. Environment Configuration (HIGH PRIORITY)**

### **File**: `/lifo_api/.env.local`

**Current Issue**: May contain development/test values

**✅ PRODUCTION ENVIRONMENT VARIABLES:**

```env
# CRITICAL: Update all these for production
ENVIRONMENT=production
DEBUG=false

# Supabase Production Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_JWT_SECRET=your-actual-production-jwt-secret
SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key

# Database - Use Supabase PostgreSQL URL
DATABASE_URL=postgresql+asyncpg://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Security
JWT_SECRET_KEY=your-production-jwt-secret-32-chars-min
FRONTEND_URL=https://your-production-domain.com

# Performance
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_RECYCLE=3600

# Monitoring
LOG_LEVEL=WARNING  # Reduce log verbosity in production
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60  # Stricter than development
```

### **File**: `/lifo_api/app/core/config.py`

**Lines**: 106-142 (CORS and security settings)
**Current Issue**: May be too permissive for production

**✅ PRODUCTION SECURITY SETTINGS:**

```python
def get_cors_origins(self) -> list[str]:
    """Get CORS origins based on environment - SECURE VERSION"""
    if self.environment == "production":
        origins = []

        # Add ONLY explicitly configured frontend URL in production
        if self.frontend_url:
            # Validate URL format
            if self.frontend_url.startswith("https://"):
                origins.append(self.frontend_url)

                # Add www subdomain only if original doesn't have it
                if not self.frontend_url.startswith("https://www."):
                    www_url = self.frontend_url.replace("https://", "https://www.")
                    origins.append(www_url)
            else:
                # In production, only HTTPS is allowed
                raise ValueError("Frontend URL must use HTTPS in production")

        # NEVER allow development origins in production
        return origins

    # Development/staging - existing logic
    return self.cors_origins

def get_allowed_hosts(self) -> list[str]:
    """Get allowed hosts based on environment - SECURE VERSION"""
    if self.environment == "production":
        hosts = []

        # Add ONLY explicitly configured hosts in production
        if self.frontend_url:
            host = self.frontend_url.replace("https://", "").replace("http://", "")
            if host and not host.startswith("*"):  # No wildcards in production
                hosts.append(host)

        # NO wildcards in production
        return hosts if hosts else ["127.0.0.1"]  # Fallback to localhost only

    # Development - use configured hosts
    return self.allowed_hosts
```

---

## **7. Database Connection Integration**

### **File**: `/lifo_ai_core/database/operations.py`

**Lines**: 24-30
**Current Issue**: Database connection is always None

**✅ PRODUCTION INTEGRATION:**

```python
# Update create_inventory_operations to accept real database connection
def create_inventory_operations(database_connection: Optional[Any] = None) -> InventoryOperations:
    """
    Factory function to create InventoryOperations instance with real database

    Args:
        database_connection: AsyncPG connection or SQLAlchemy session

    Returns:
        InventoryOperations instance with working database connection
    """
    return InventoryOperations(database_connection)

# In your application code, pass real connection:
from app.database.connection import get_database_session
from lifo_ai_core.database.operations import create_inventory_operations

async def get_operations_with_db():
    db_session = await get_database_session()
    return create_inventory_operations(db_session)
```

---

## **8. Security Middleware Configuration (CRITICAL)**

### **File**: `/lifo_api/app/core/config.py`

**Lines**: 104-174 (CORS and security settings)
**Current Issue**: Security middleware requires proper production environment variables

### **Security Test Command:**

```bash
# Test current security configuration
ENVIRONMENT=production \
DATABASE_URL='postgresql://user:pass@localhost/db' \
SUPABASE_JWT_SECRET=production-secret \
SUPABASE_URL=https://prod.supabase.co \
SUPABASE_ANON_KEY=prod-key \
python3 -c "
from app.core.config import settings
print('CORS origins:', settings.get_cors_origins())
print('Allowed hosts:', settings.get_allowed_hosts())
print('Environment:', settings.environment)
"
```

### **❌ INSECURE OUTPUT (Current):**

```
CORS origins: []
Allowed hosts: ['localhost:3000', 'localhost:8000']
Environment: production
```

**Problems:**

- **Empty CORS origins** → Frontend will be blocked by CORS errors
- **Localhost hosts only** → Production domains will be rejected (400 errors)

### **✅ REQUIRED PRODUCTION ENVIRONMENT VARIABLES:**

```bash
# Add these to your production deployment
ENVIRONMENT=production
FRONTEND_URL=https://your-frontend-domain.com    # Your React/Next.js app URL
API_URL=https://your-api-domain.com             # Your FastAPI URL
DATABASE_URL=postgresql+asyncpg://postgres:password@host:5432/db
SUPABASE_JWT_SECRET=your-production-jwt-secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-production-anon-key
```

### **✅ SECURE OUTPUT (Expected):**

```
CORS origins: ['https://your-frontend-domain.com', 'https://www.your-frontend-domain.com']
Allowed hosts: ['your-frontend-domain.com', 'your-api-domain.com']
Environment: production
```

### **Implementation Notes:**

- The security middleware is correctly implemented and secure by design
- **HTTPS-only enforcement** in production (HTTP URLs are rejected)
- **No wildcard domains** allowed in production
- **No development origins** leaked to production
- **Explicit configuration required** - fails secure if domains not provided

### **Deployment Steps:**

1. **Set production environment variables** with your actual domains
2. **Test security configuration** using the test command above
3. **Verify CORS origins** include your frontend domain
4. **Verify allowed hosts** include both frontend and API domains
5. **Confirm HTTPS enforcement** - HTTP URLs should be rejected

### **Security Validation Checklist:**

- [ ] `FRONTEND_URL` uses HTTPS in production
- [ ] `API_URL` uses HTTPS in production
- [ ] CORS origins contain only production domains
- [ ] Allowed hosts contain only production domains
- [ ] No development URLs (localhost) in production config
- [ ] No wildcard domains (\*) in production config

---

## **9. SSL/TLS Certificate Configuration (CRITICAL)**

### **Production HTTPS Requirements:**

- **SSL certificate** must be valid and properly configured
- **Certificate chain** must be complete (intermediate certificates included)
- **HSTS headers** should be enabled for security
- **Certificate auto-renewal** configured (Let's Encrypt, Cloudflare, etc.)

### **Validation Commands:**

```bash
# Test SSL certificate validity
curl -I https://your-api-domain.com/health
# Should return 200 OK with valid certificate

# Test certificate chain
openssl s_client -connect your-api-domain.com:443 -servername your-api-domain.com
# Should show complete certificate chain

# Test HSTS headers
curl -I https://your-api-domain.com/api/v1/health | grep -i strict
```

---

## **10. Database Connection Security (CRITICAL)**

### **File**: `/lifo_api/app/core/config.py`

**Current Issue**: Database URL format and security

### **✅ PRODUCTION DATABASE URL FORMAT:**

```bash
# Supabase production URL format
DATABASE_URL=postgresql+asyncpg://postgres:[YOUR-DB-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# With SSL required (recommended)
DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require

# Connection pool settings for production
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_RECYCLE=3600
```

### **Security Requirements:**

- [ ] Database password is **strong** (32+ characters, mixed case, symbols)
- [ ] Connection uses **SSL/TLS encryption** (`sslmode=require`)
- [ ] Database **IP restrictions** configured (if applicable)
- [ ] **Connection pooling** properly configured for production load
- [ ] **Database credentials** stored securely (not in code)

---

## **11. API Rate Limiting & DDoS Protection (HIGH PRIORITY)**

### **File**: `/lifo_api/app/core/config.py`

**Lines**: 102 (rate limiting configuration)

### **Rate Limiting Test Command:**

```bash
# Test current rate limiting configuration
python3 -c "
from app.middleware.rate_limiting import limiter, SecurityRateLimiter
print('✅ Rate limiting configured')
print('Default limits:', limiter._default_limits)  # Note: _default_limits (with underscore)
print('Storage type:', type(limiter._storage).__name__)
print('Strategy:', limiter._strategy)

sec_limiter = SecurityRateLimiter()
print('✅ Security rate limiter available')
print('Security limiter class:', type(sec_limiter).__name__)
"
```

### **✅ PRODUCTION RATE LIMITING:**

```python
# File: /lifo_api/app/middleware/rate_limiting.py
# Update line 20 for production:
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["60/hour", "10/minute"],  # Stricter limits for production
    storage_uri="redis://redis:6379" if is_production() else "memory://",  # Redis for production
    strategy="moving-window",
)

# Additional production config in app/core/config.py:
rate_limit_per_minute: int = 10  # Reduced from 20 for production
max_concurrent_operations: int = 5  # Reduced from 10
max_request_size_mb: int = 10  # Reduced from 100
async_timeout_seconds: int = 15  # Reduced from 30
```

### **Additional Protection Requirements:**

- [ ] **Reverse proxy** (Nginx, Cloudflare) with rate limiting
- [ ] **IP-based rate limiting** for suspicious activity
- [ ] **Request size limits** to prevent memory exhaustion
- [ ] **Timeout configurations** to prevent resource locks
- [ ] **DDoS protection** via CDN/WAF (Cloudflare, AWS Shield)

---

## **12. Monitoring & Alerting (HIGH PRIORITY)**

### **Required Monitoring Components:**

```bash
# Environment variables for monitoring
LOG_LEVEL=WARNING  # Less verbose in production
LOG_FORMAT=json    # Structured logging for analysis
ENABLE_METRICS=true
METRICS_PORT=9090

# Health check endpoint
HEALTH_CHECK_URL=https://your-api-domain.com/health

# Error tracking
SENTRY_DSN=your-sentry-dsn  # For error monitoring
```

### **Monitoring Checklist:**

- [ ] **Application logs** centralized (CloudWatch, Splunk, ELK)
- [ ] **Error tracking** configured (Sentry, Rollbar)
- [ ] **Performance monitoring** (APM tools)
- [ ] **Health check endpoints** responding correctly
- [ ] **Database performance** monitoring (query times, connections)
- [ ] **Resource usage** monitoring (CPU, memory, disk)
- [ ] **Security alerts** for failed authentication attempts

---

## **13. Backup & Disaster Recovery (CRITICAL)**

### **Database Backup Strategy:**

```bash
# Supabase provides automatic backups, but verify:
# - Point-in-time recovery enabled
# - Backup retention period configured (30+ days recommended)
# - Cross-region backup replication (if required)
```

### **Application Backup Requirements:**

- [ ] **Database backups** automated and tested
- [ ] **Configuration backups** (environment variables, settings)
- [ ] **Code repository** properly backed up (Git with remote origin)
- [ ] **Recovery procedures** documented and tested
- [ ] **Backup restoration** tested regularly
- [ ] **RTO/RPO objectives** defined and achievable

---

## **14. Security Headers & OWASP Compliance (HIGH PRIORITY)**

### **File**: `/lifo_api/app/main.py` (middleware configuration)

**Required Security Headers:**

```python
# Add to FastAPI middleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

# HTTPS redirect in production
if settings.environment == "production":
    app.add_middleware(HTTPSRedirectMiddleware)

# Security headers
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)

    # OWASP recommended headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self'"

    return response
```

### **Security Headers Checklist:**

- [ ] **HSTS** enforced (Strict-Transport-Security)
- [ ] **Content-Type sniffing** disabled (X-Content-Type-Options)
- [ ] **Clickjacking protection** enabled (X-Frame-Options)
- [ ] **XSS protection** enabled (X-XSS-Protection)
- [ ] **CSP policy** configured (Content-Security-Policy)
- [ ] **Referrer policy** configured appropriately

---

## **15. Performance Optimization (MEDIUM PRIORITY)**

### **Database Performance:**

```sql
-- Ensure critical indexes exist
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_store_expiry
ON inventory.batches(store_id, expiry_date) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_store_created
ON inventory.batches(store_id, created_at DESC) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_products_lookup
ON inventory.store_products(store_id, is_active) WHERE is_active = true;
```

### **Application Performance:**

- [ ] **Database connection pooling** optimized for load
- [ ] **Query performance** tested with realistic data volumes
- [ ] **API response times** < 200ms for basic operations
- [ ] **Memory usage** within acceptable limits
- [ ] **CPU usage** optimized (no unnecessary processing)
- [ ] **Caching strategy** implemented where appropriate

---

## **🧪 TESTING REQUIREMENTS**

### **Before Production Deployment:**

1. **Security Testing**

   ```bash
   # Test all authentication paths
   python3 -c "
   # Test with invalid users
   # Test with expired tokens
   # Test cross-store access attempts
   # Verify RLS policies work
   "
   ```

2. **Performance Testing**

   ```bash
   # Test with realistic data volumes
   # Verify query performance with indexes
   # Test concurrent user scenarios
   # Measure response times under load
   ```

3. **Data Integrity Testing**
   ```bash
   # Test transaction rollbacks
   # Verify referential integrity
   # Test edge cases (empty stores, no permissions)
   # Validate data consistency
   ```

---

## **📋 DEPLOYMENT CHECKLIST**

### **Pre-Deployment Verification:**

- [ ] All security functions implemented and tested
- [ ] Environment variables configured for production
- [ ] Database indexes created for performance
- [ ] RLS policies tested and working
- [ ] Rate limiting configured appropriately
- [ ] Logging configured for production monitoring
- [ ] Error handling covers all edge cases
- [ ] Performance tested with realistic data volumes

### **Security Verification:**

- [ ] No hardcoded secrets in code
- [ ] All authentication paths require valid tokens
- [ ] Cross-store access properly blocked
- [ ] SQL injection protection verified
- [ ] CORS origins restricted to production domains
- [ ] HTTPS enforced for all external communications

### **Performance Verification:**

- [ ] Database connections properly pooled
- [ ] Query performance acceptable (< 200ms for basic operations)
- [ ] Memory usage within acceptable limits
- [ ] Error rates < 1% under normal load
- [ ] Monitoring and alerting configured

---

## **🚨 SECURITY WARNINGS**

### **NEVER deploy to production with:**

- `validate_store_access` returning `True`
- `DEBUG=true` in environment
- Development CORS origins enabled
- Hardcoded secrets or test credentials
- Disabled authentication checks
- Overly permissive database permissions

### **ALWAYS verify before production:**

- All database operations use parameterized queries
- RLS policies are active and tested
- User permissions properly validated
- Error messages don't leak sensitive information
- Audit logging captures security events

---

This document should be reviewed and items checked off as they are implemented. Each production implementation includes proper error handling, logging, and security considerations required for a production deployment.
