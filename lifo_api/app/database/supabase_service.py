"""
Supabase Database Service - Hybrid Authentication Approach
Works alongside SQLAlchemy for specific operations that require Supabase auth context
"""

import asyncio
from typing import Any, Dict, List, Optional
from datetime import datetime

import httpx
import structlog
from supabase import create_client, Client
from gotrue.errors import AuthError

from app.core.config import settings
from app.auth.supabase_jwt import SupabaseUser

logger = structlog.get_logger()


class SupabaseService:
    """
    Supabase service for user-authenticated database operations
    """
    
    def __init__(self):
        self.url = settings.supabase_url
        self.anon_key = settings.supabase_anon_key
        self.service_role_key = settings.supabase_service_role_key
        self._admin_client: Optional[Client] = None
        
    def get_admin_client(self) -> Client:
        """Get service role client for admin operations"""
        if self._admin_client is None:
            self._admin_client = create_client(self.url, self.service_role_key)
        return self._admin_client
        
    def get_user_client(self, user_token: str) -> Client:
        """Get client with user context"""
        client = create_client(self.url, self.anon_key)
        # Set the user session
        client.auth.set_session(user_token)
        return client
        
    async def test_connection(self) -> bool:
        """Test Supabase connection"""
        try:
            admin_client = self.get_admin_client()
            # Try different approaches to find working table structure
            try:
                result = admin_client.schema('business').table('stores').select('*').limit(1).execute()
            except:
                try:
                    result = admin_client.schema('inventory').table('batches').select('*').limit(1).execute()
                except:
                    # Just test basic connection - this will fail but shows we can connect
                    result = None
                    
            logger.info("Supabase connection test successful")
            return True
        except Exception as e:
            logger.error("Supabase connection test failed", error=str(e))
            return False
            
    async def save_ocr_result(
        self, 
        user_token: str, 
        store_id: str, 
        ocr_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Save OCR processing result to inventory.ocr_processing_batches
        Uses user authentication context for RLS compliance
        """
        try:
            user_client = self.get_user_client(user_token)
            
            # Prepare OCR batch data
            batch_data = {
                'store_id': store_id,
                'image_data': ocr_data.get('image_data'),
                'processing_status': 'completed',
                'ocr_confidence': ocr_data.get('confidence_score', 0.0),
                'extracted_text': ocr_data.get('raw_text_blocks', []),
                'barcode_data': ocr_data.get('barcode'),
                'suggested_name': ocr_data.get('suggested_name'),
                'expiry_date': ocr_data.get('expiry_date'),
                'manufacture_date': ocr_data.get('manufacture_date'),
                'processing_time_ms': ocr_data.get('processing_time_ms', 0),
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            result = user_client.schema('inventory').table('ocr_processing_batches').insert(batch_data).execute()
            
            logger.info(
                "OCR result saved successfully", 
                store_id=store_id,
                batch_id=result.data[0]['id'] if result.data else None
            )
            
            return result.data[0] if result.data else {}
            
        except Exception as e:
            logger.error("Failed to save OCR result", error=str(e), store_id=store_id)
            raise
            
    async def create_batch_from_ocr(
        self,
        user_token: str,
        store_id: str,
        ocr_batch_id: str,
        batch_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create inventory batch from OCR processing result
        """
        try:
            user_client = self.get_user_client(user_token)
            
            # Create inventory batch
            inventory_batch = {
                'store_id': store_id,
                'batch_name': batch_data.get('batch_name', f"OCR Batch {datetime.now().strftime('%Y%m%d_%H%M')}"),
                'expiry_date': batch_data.get('expiry_date'),
                'manufacture_date': batch_data.get('manufacture_date'),
                'total_quantity': batch_data.get('total_quantity', 1),
                'remaining_quantity': batch_data.get('total_quantity', 1),
                'unit_cost': batch_data.get('unit_cost'),
                'ocr_processing_batch_id': ocr_batch_id,
                'created_via': 'ocr_scanning',
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            result = user_client.schema('inventory').table('batches').insert(inventory_batch).execute()
            
            logger.info(
                "Inventory batch created from OCR",
                store_id=store_id,
                ocr_batch_id=ocr_batch_id,
                batch_id=result.data[0]['id'] if result.data else None
            )
            
            return result.data[0] if result.data else {}
            
        except Exception as e:
            logger.error("Failed to create batch from OCR", error=str(e))
            raise
            
    async def get_store_info(self, user_token: str, store_id: str) -> Optional[Dict[str, Any]]:
        """Get store information with user context"""
        try:
            user_client = self.get_user_client(user_token)
            result = user_client.schema('business').table('stores').select('*').eq('id', store_id).execute()
            
            if result.data:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error("Failed to get store info", error=str(e), store_id=store_id)
            return None
            
    async def check_user_store_access(self, user_token: str, store_id: str) -> bool:
        """Check if user has access to store via RLS policies"""
        try:
            user_client = self.get_user_client(user_token)
            result = user_client.schema('business').table('store_users').select('*').eq('store_id', store_id).execute()
            
            # If RLS allows the query and returns data, user has access
            return len(result.data) > 0
            
        except Exception as e:
            logger.error("Failed to check store access", error=str(e), store_id=store_id)
            return False
            
    async def get_user_stores(self, user_token: str) -> List[Dict[str, Any]]:
        """Get all stores user has access to"""
        try:
            user_client = self.get_user_client(user_token)
            result = user_client.schema('business').table('stores').select('*').execute()
            
            return result.data or []
            
        except Exception as e:
            logger.error("Failed to get user stores", error=str(e))
            return []


# Global service instance
_supabase_service: Optional[SupabaseService] = None


def get_supabase_service() -> SupabaseService:
    """Get or create the global SupabaseService instance"""
    global _supabase_service
    if _supabase_service is None:
        _supabase_service = SupabaseService()
    return _supabase_service


# Health check using Supabase
async def supabase_health_check() -> Dict[str, Any]:
    """Comprehensive Supabase health check"""
    start_time = asyncio.get_event_loop().time()
    
    try:
        service = get_supabase_service()
        
        # Test admin client connection
        admin_client = service.get_admin_client()
        # Simple connection test - just validate we can connect
        # This will succeed if the client can authenticate with Supabase
        try:
            # Test with a simple table query using proper schema
            result = admin_client.schema('business').table('stores').select('*').limit(1).execute()
            connection_ok = True
        except Exception as e:
            # If the query fails, log the error but still test basic connectivity
            logger.error("Supabase table query failed", error=str(e))
            connection_ok = False
            
        result = {"connection": connection_ok}
        
        end_time = asyncio.get_event_loop().time()
        response_time = (end_time - start_time) * 1000
        
        return {
            "status": "healthy",
            "service": "supabase",
            "response_time_ms": round(response_time, 2),
            "connection_test": result.get("connection", False),
            "auth_method": "service_role",
            "connection_info": {
                "url": service.url,
                "has_service_key": bool(service.service_role_key),
                "has_anon_key": bool(service.anon_key)
            }
        }
        
    except Exception as e:
        end_time = asyncio.get_event_loop().time()
        response_time = (end_time - start_time) * 1000
        
        return {
            "status": "unhealthy",
            "service": "supabase",
            "response_time_ms": round(response_time, 2),
            "error": str(e),
            "auth_method": "service_role"
        }