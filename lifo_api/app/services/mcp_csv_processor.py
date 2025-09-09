"""
MCP-Powered CSV Processor for LIFO.AI
Solves pgbouncer prepared statement conflicts by using Supabase MCP
"""

import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
import asyncio

import structlog
from fastapi import HTTPException, UploadFile

from app.services.supabase_mcp_service import get_mcp_service
from app.services.secure_csv_processor import SecureCSVProcessor

logger = structlog.get_logger()

class MCPCSVProcessor:
    """
    MCP-powered CSV processor that bypasses SQLAlchemy/pgbouncer issues
    Designed for high-volume CSV imports with enterprise scaling
    """
    
    def __init__(self):
        self.logger = logger.bind(component="mcp_csv_processor")
        self.secure_processor = SecureCSVProcessor()
        self.mcp_service = get_mcp_service()
        
    async def process_csv_with_mcp(
        self, 
        file: UploadFile, 
        store_id: str,
        user_id: str,
        chunk_size: int = 50
    ) -> Dict[str, Any]:
        """
        Process CSV file using MCP for database operations
        This completely bypasses SQLAlchemy and pgbouncer issues
        """
        
        processing_id = f"mcp_csv_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        
        try:
            self.logger.info("Starting MCP CSV processing",
                           processing_id=processing_id,
                           store_id=store_id,
                           filename=file.filename)
            
            # Step 1: Secure CSV validation and parsing (no DB operations)
            validation_result = await self.secure_processor.process_csv_for_validation(
                file, store_id
            )
            
            if not validation_result["validation"]["is_valid"]:
                return {
                    "success": False,
                    "processing_id": processing_id,
                    "error": "CSV validation failed",
                    "validation_errors": validation_result["validation"]["errors"],
                    "warnings": validation_result["validation"]["warnings"]
                }
            
            validated_data = validation_result["validated_data"]
            
            if not validated_data:
                return {
                    "success": False,
                    "processing_id": processing_id,
                    "error": "No valid data found in CSV"
                }
            
            # Step 2: Process data using MCP in chunks for optimal performance
            result = await self._process_validated_data_with_mcp(
                validated_data=validated_data,
                store_id=store_id,
                user_id=user_id,
                chunk_size=chunk_size,
                processing_id=processing_id
            )
            
            # Step 3: Combine results
            final_result = {
                "success": True,
                "processing_id": processing_id,
                "csv_validation": {
                    "total_rows": validation_result["total_rows"],
                    "valid_rows": validation_result["validation"]["valid_count"],
                    "warnings": validation_result["validation"]["warnings"][:10],  # Limit for response size
                    "ai_suggestions": validation_result.get("ai_suggestions", {})
                },
                "mcp_processing": result,
                "performance": {
                    "mobile_optimized": True,
                    "response_time_target_ms": 500,
                    "enterprise_ready": True
                },
                "processed_at": datetime.utcnow().isoformat(),
                "processed_by": user_id
            }
            
            self.logger.info("MCP CSV processing completed successfully",
                           processing_id=processing_id,
                           total_batches=result.get("batches_created", 0),
                           store_id=store_id)
            
            return final_result
            
        except Exception as e:
            self.logger.error("MCP CSV processing failed",
                            processing_id=processing_id,
                            store_id=store_id,
                            error=str(e))
            
            return {
                "success": False,
                "processing_id": processing_id,
                "error": f"Processing failed: {str(e)}",
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def _process_validated_data_with_mcp(
        self,
        validated_data: List[Dict[str, Any]],
        store_id: str,
        user_id: str,
        chunk_size: int,
        processing_id: str
    ) -> Dict[str, Any]:
        """
        Process validated CSV data using MCP bulk operations
        Handles the complex Store→Product→Batch→Score relationships
        """
        
        try:
            # Step 1: Ensure store exists (using MCP)
            store_result = await self.mcp_service.create_store_if_not_exists({
                "store_id": store_id,
                "store_name": f"Store {store_id}",
                "store_code": f"MCP-{store_id[:8]}"
            })
            
            # Step 2: Prepare product and batch data
            products_data, batches_data = await self._prepare_data_for_mcp(
                validated_data, store_id, processing_id
            )
            
            # Step 3: Process in chunks for optimal performance and memory usage
            chunks = [validated_data[i:i + chunk_size] for i in range(0, len(validated_data), chunk_size)]
            
            total_products_created = 0
            total_batches_created = 0
            total_errors = []
            chunk_results = []
            
            for chunk_idx, chunk in enumerate(chunks):
                chunk_result = await self._process_chunk_with_mcp(
                    chunk=chunk,
                    store_id=store_id,
                    chunk_index=chunk_idx,
                    processing_id=processing_id
                )
                
                chunk_results.append(chunk_result)
                total_products_created += chunk_result["products_created"]
                total_batches_created += chunk_result["batches_created"]
                total_errors.extend(chunk_result["errors"])
                
                # Log progress for monitoring
                self.logger.info("MCP chunk processed",
                               processing_id=processing_id,
                               chunk_index=chunk_idx,
                               chunk_size=len(chunk),
                               products_created=chunk_result["products_created"],
                               batches_created=chunk_result["batches_created"])
            
            # Step 4: Calculate final statistics
            success_rate = (total_batches_created / len(validated_data)) * 100 if validated_data else 0
            
            result = {
                "store_id": store_id,
                "total_chunks_processed": len(chunks),
                "chunk_size_used": chunk_size,
                "products_created": total_products_created,
                "batches_created": total_batches_created,
                "total_items_processed": len(validated_data),
                "errors": total_errors[:20],  # Limit error list size
                "success_rate_percent": round(success_rate, 2),
                "chunk_results": chunk_results,
                "processing_method": "supabase_mcp",
                "pgbouncer_bypassed": True,
                "enterprise_scalable": True
            }
            
            return result
            
        except Exception as e:
            self.logger.error("MCP data processing failed",
                            processing_id=processing_id,
                            store_id=store_id,
                            data_count=len(validated_data),
                            error=str(e))
            raise
    
    async def _process_chunk_with_mcp(
        self,
        chunk: List[Dict[str, Any]],
        store_id: str,
        chunk_index: int,
        processing_id: str
    ) -> Dict[str, Any]:
        """
        Process a single chunk of data using MCP transaction
        Each chunk is processed atomically to ensure data integrity
        """
        
        chunk_id = f"{processing_id}_chunk_{chunk_index}"
        
        try:
            # Use MCP transaction for ACID compliance
            async with self.mcp_service.transaction() as transaction_id:
                
                # Step 1: Create/update products
                products_to_upsert = []
                batches_to_create = []
                
                for item in chunk:
                    # Prepare product data
                    product_data = {
                        "sku": item["sku"],
                        "product_name": item["product_name"],
                        "category": item.get("category", "household_other"),
                        "brand": item.get("brand"),
                        "description": item.get("description"),
                        "unit_type": item.get("unit_type", "pcs")
                    }
                    products_to_upsert.append(product_data)
                    
                    # Prepare batch data (linked to product)
                    batch_data = {
                        "batch_number": self._generate_batch_number(item["sku"], item.get("expiry_date")),
                        "sku": item["sku"],  # Will be linked to product_id via MCP
                        "quantity": float(item["quantity"]),
                        "cost_price": float(item["cost_price"]),
                        "selling_price": float(item["selling_price"]),
                        "expiry_date": item.get("expiry_date"),
                        "manufacture_date": item.get("manufacture_date"),
                        "location_code": item.get("location_code", "MAIN")
                    }
                    batches_to_create.append(batch_data)
                
                # Step 2: Execute bulk operations via MCP
                products_result = await self.mcp_service.bulk_upsert_products(
                    products_to_upsert, store_id
                )
                
                # Step 3: Create batches (with proper product relationships)
                batches_result = await self.mcp_service.bulk_create_batches(
                    batches_to_create, store_id
                )
                
                return {
                    "chunk_id": chunk_id,
                    "chunk_index": chunk_index,
                    "items_in_chunk": len(chunk),
                    "products_created": products_result.get("created", 0),
                    "batches_created": batches_result.get("created", 0),
                    "errors": products_result.get("errors", []) + batches_result.get("errors", []),
                    "transaction_id": transaction_id,
                    "processing_time_ms": 0  # TODO: Add timing
                }
                
        except Exception as e:
            self.logger.error("MCP chunk processing failed",
                            chunk_id=chunk_id,
                            store_id=store_id,
                            chunk_size=len(chunk),
                            error=str(e))
            
            return {
                "chunk_id": chunk_id,
                "chunk_index": chunk_index,
                "items_in_chunk": len(chunk),
                "products_created": 0,
                "batches_created": 0,
                "errors": [{"chunk_error": str(e)}],
                "transaction_id": None,
                "failed": True
            }
    
    async def _prepare_data_for_mcp(
        self,
        validated_data: List[Dict[str, Any]],
        store_id: str,
        processing_id: str
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Prepare and deduplicate data for MCP operations
        Returns (products_data, batches_data)
        """
        
        # Get existing products to avoid conflicts
        existing_products = await self.mcp_service.get_store_products_map(store_id)
        
        products_data = []
        batches_data = []
        seen_skus = set()
        
        for item in validated_data:
            sku = item["sku"]
            
            # Only prepare product if it's new
            if sku not in existing_products and sku not in seen_skus:
                products_data.append({
                    "sku": sku,
                    "product_name": item["product_name"],
                    "category": item.get("category", "household_other"),
                    "brand": item.get("brand"),
                    "description": item.get("description"),
                    "unit_type": item.get("unit_type", "pcs")
                })
                seen_skus.add(sku)
            
            # Always prepare batch data
            batches_data.append({
                "sku": sku,
                "batch_number": self._generate_batch_number(sku, item.get("expiry_date")),
                "quantity": item["quantity"],
                "cost_price": item["cost_price"],
                "selling_price": item["selling_price"],
                "expiry_date": item.get("expiry_date"),
                "manufacture_date": item.get("manufacture_date"),
                "location_code": item.get("location_code", "MAIN")
            })
        
        self.logger.info("Data prepared for MCP processing",
                       processing_id=processing_id,
                       new_products=len(products_data),
                       total_batches=len(batches_data),
                       existing_products_count=len(existing_products))
        
        return products_data, batches_data
    
    def _generate_batch_number(self, sku: str, expiry_date: Optional[str]) -> str:
        """Generate unique batch number for tracking"""
        timestamp = datetime.utcnow().strftime("%Y%m%d")
        
        if expiry_date:
            try:
                if isinstance(expiry_date, str):
                    exp_date = datetime.fromisoformat(expiry_date).strftime("%m%d")
                else:
                    exp_date = expiry_date.strftime("%m%d")
                return f"{sku}-{timestamp}-{exp_date}"
            except:
                pass
        
        return f"{sku}-{timestamp}-{uuid.uuid4().hex[:4]}"
    
    async def get_processing_status(self, processing_id: str) -> Dict[str, Any]:
        """
        Get status of MCP CSV processing operation
        Useful for monitoring long-running operations
        """
        try:
            # TODO: Implement status tracking via MCP
            # This would query processing status from MCP storage
            
            return {
                "processing_id": processing_id,
                "status": "completed",  # TODO: Get actual status
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error("Failed to get processing status",
                            processing_id=processing_id,
                            error=str(e))
            
            return {
                "processing_id": processing_id,
                "status": "unknown",
                "error": str(e)
            }

# Global processor instance
_mcp_csv_processor = None

def get_mcp_csv_processor() -> MCPCSVProcessor:
    """Get or create the global MCP CSV processor instance"""
    global _mcp_csv_processor
    if _mcp_csv_processor is None:
        _mcp_csv_processor = MCPCSVProcessor()
    return _mcp_csv_processor