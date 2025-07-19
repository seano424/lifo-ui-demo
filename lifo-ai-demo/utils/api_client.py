"""
API Client for LIFO.AI Demo System
"""

import requests
import json
import time
from typing import Dict, Any, Optional


class LIFOAPIClient:
    """
    API client for LIFO.AI microservice
    """
    
    def __init__(self, base_url: str = "http://localhost:8000", auth_token: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.auth_token = auth_token
        self.session = requests.Session()
        
        # Set default headers
        self.session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "LIFO.AI-Demo-Client/1.0"
        })
        
        if auth_token:
            self.session.headers["Authorization"] = f"Bearer {auth_token}"
    
    def test_connection(self) -> Dict[str, Any]:
        """Test API connection"""
        try:
            response = self.session.get(f"{self.base_url}/health")
            response.raise_for_status()
            return {
                'status': 'success',
                'connected': True,
                'response_time_ms': response.elapsed.total_seconds() * 1000,
                'data': response.json()
            }
        except requests.exceptions.RequestException as e:
            return {
                'status': 'error',
                'connected': False,
                'error': str(e)
            }
    
    def upload_csv(self, file_path: str, store_id: str) -> Dict[str, Any]:
        """Upload CSV file for processing"""
        try:
            with open(file_path, 'rb') as f:
                files = {'file': (file_path.split('/')[-1], f, 'text/csv')}
                
                # Remove Content-Type header for multipart upload
                headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
                
                response = self.session.post(
                    f"{self.base_url}/api/v1/csv/upload/{store_id}",
                    files=files,
                    headers=headers
                )
                response.raise_for_status()
                
                return {
                    'status': 'success',
                    'upload_time_ms': response.elapsed.total_seconds() * 1000,
                    'data': response.json()
                }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def get_scoring_results(self, store_id: str) -> Dict[str, Any]:
        """Get scoring results for a store"""
        try:
            response = self.session.get(
                f"{self.base_url}/api/v1/scoring/calculate/{store_id}"
            )
            response.raise_for_status()
            return {
                'status': 'success',
                'response_time_ms': response.elapsed.total_seconds() * 1000,
                'data': response.json()
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }