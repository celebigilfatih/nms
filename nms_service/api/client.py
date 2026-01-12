"""REST API client for Node.js backend

Integrates with Node.js backend to store alarms and metrics.
"""

import httpx
from typing import Optional, List, Dict, Any
from datetime import datetime

from nms_service.core.logger import logger
from nms_service.core.config import config
from nms_service.core.models import (
    Alarm,
    AlarmType,
    AlarmSeverity,
)


class APIClient:
    """HTTP client for backend API communication"""
    
    def __init__(self):
        """Initialize API client"""
        self.base_url = config.api.base_url
        self.timeout = config.api.timeout
        self.client = httpx.Client(timeout=self.timeout)
    
    def _build_url(self, endpoint: str) -> str:
        """Build full URL for endpoint
        
        Args:
            endpoint: API endpoint path
            
        Returns:
            Full URL
        """
        return f"{self.base_url}/api{endpoint}"
    
    def create_alarm(self, alarm: Alarm) -> Optional[Dict[str, Any]]:
        """Create alarm via API
        
        Args:
            alarm: Alarm model
            
        Returns:
            Response data or None if failed
        """
        try:
            payload = {
                "device_id": alarm.device_id,
                "device_name": alarm.device_name,
                "type": alarm.type.value,
                "severity": alarm.severity.value,
                "message": alarm.message,
                "metadata": alarm.metadata,
            }
            
            response = self.client.post(
                self._build_url("/alarms"),
                json=payload,
            )
            
            if response.status_code in (200, 201):
                logger.debug(f"Created alarm via API: {response.json()}")
                return response.json()
            else:
                logger.warning(
                    f"API alarm creation failed: {response.status_code} "
                    f"{response.text}"
                )
                return None
                
        except Exception as e:
            logger.error(f"API call failed for create_alarm: {e}")
            return None
    
    def get_active_alarms(
        self,
        device_id: Optional[int] = None,
    ) -> Optional[List[Dict[str, Any]]]:
        """Get active alarms from API
        
        Args:
            device_id: Filter by device (optional)
            
        Returns:
            List of alarm records or None if failed
        """
        try:
            params = {"resolved": False}
            if device_id:
                params["device_id"] = device_id
            
            response = self.client.get(
                self._build_url("/alarms"),
                params=params,
            )
            
            if response.status_code == 200:
                logger.debug(f"Retrieved {len(response.json())} active alarms")
                return response.json()
            else:
                logger.warning(
                    f"API alarm retrieval failed: {response.status_code}"
                )
                return None
                
        except Exception as e:
            logger.error(f"API call failed for get_active_alarms: {e}")
            return None
    
    def acknowledge_alarm(
        self,
        alarm_id: int,
        acknowledged_by: str = "nms_service",
    ) -> bool:
        """Acknowledge alarm via API
        
        Args:
            alarm_id: Alarm ID
            acknowledged_by: User/system acknowledging
            
        Returns:
            Success status
        """
        try:
            payload = {"acknowledged_by": acknowledged_by}
            
            response = self.client.patch(
                self._build_url(f"/alarms/{alarm_id}/acknowledge"),
                json=payload,
            )
            
            if response.status_code in (200, 204):
                logger.debug(f"Acknowledged alarm {alarm_id}")
                return True
            else:
                logger.warning(
                    f"API acknowledge failed: {response.status_code}"
                )
                return False
                
        except Exception as e:
            logger.error(f"API call failed for acknowledge_alarm: {e}")
            return False
    
    def update_device_status(
        self,
        device_id: int,
        status: str,  # "online", "offline"
    ) -> bool:
        """Update device connection status via API
        
        Args:
            device_id: Device ID
            status: Connection status (online/offline)
            
        Returns:
            Success status
        """
        try:
            payload = {"connection_status": status}
            
            response = self.client.patch(
                self._build_url(f"/devices/{device_id}"),
                json=payload,
            )
            
            if response.status_code in (200, 204):
                logger.debug(f"Updated device {device_id} status to {status}")
                return True
            else:
                logger.warning(
                    f"API device status update failed: {response.status_code}"
                )
                return False
                
        except Exception as e:
            logger.error(f"API call failed for update_device_status: {e}")
            return False
    
    def send_metrics(
        self,
        device_id: int,
        metric_type: str,  # "interface", "health", "inventory"
        data: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """Send metrics to API
        
        Args:
            device_id: Device ID
            metric_type: Type of metric
            data: Metric data
            
        Returns:
            Response data or None if failed
        """
        try:
            payload = {
                "device_id": device_id,
                "type": metric_type,
                "data": data,
                "timestamp": datetime.utcnow().isoformat(),
            }
            
            response = self.client.post(
                self._build_url("/metrics"),
                json=payload,
            )
            
            if response.status_code in (200, 201):
                logger.debug(f"Sent {metric_type} metrics for device {device_id}")
                return response.json()
            else:
                logger.warning(
                    f"API metrics send failed: {response.status_code}"
                )
                return None
                
        except Exception as e:
            logger.error(f"API call failed for send_metrics: {e}")
            return None
    
    def health_check(self) -> bool:
        """Check backend API health
        
        Returns:
            True if API is healthy
        """
        try:
            response = self.client.get(
                self._build_url("/health"),
                timeout=5,
            )
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"API health check failed: {e}")
            return False
    
    def close(self) -> None:
        """Close HTTP client"""
        try:
            self.client.close()
        except Exception as e:
            logger.warning(f"Error closing API client: {e}")
    
    def __enter__(self):
        """Context manager entry"""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()
