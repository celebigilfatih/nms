"""SNMP polling engine for periodic data collection

Synchronous polling with async-ready architecture for scalability.
Supports multiple vendors and configurable polling intervals.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
import time

from nms_service.core.logger import logger
from nms_service.core.models import (
    InterfaceMetric,
    DeviceHealthMetric,
    DeviceInventory,
    SNMPMetric,
)
from nms_service.snmp.session import SNMPSession, SNMPError, SNMPDeviceUnreachable
from nms_service.snmp.vendor_oids import oid_manager


@dataclass
class DeviceConfig:
    """Device polling configuration"""
    device_id: int
    device_name: str
    ip_address: str
    community_string: str
    vendor: str  # "generic", "cisco", "fortinet", "mikrotik"
    snmp_port: int = 161
    snmp_version: str = "2c"
    enabled: bool = True
    
    # Poll intervals (override global defaults)
    interface_poll_interval: Optional[int] = None
    health_poll_interval: Optional[int] = None
    inventory_poll_interval: Optional[int] = None


class SNMPPoller:
    """Synchronous SNMP poller for collecting metrics
    
    Architecture supports async scaling:
    - Currently synchronous for < 50 devices
    - Ready for async/concurrent refactoring for > 50 devices
    - Distributed polling can be added by spawning multiple instances
    """
    
    def __init__(self):
        """Initialize SNMP poller"""
        self.sessions: Dict[int, SNMPSession] = {}
        self.last_poll_time: Dict[int, Dict[str, datetime]] = {}
    
    def register_device(self, config: DeviceConfig) -> None:
        """Register a device for polling
        
        Args:
            config: Device configuration
        """
        if not config.enabled:
            logger.info(f"Device {config.device_name} is disabled, skipping")
            return
        
        try:
            session = SNMPSession(
                device_id=config.device_id,
                device_name=config.device_name,
                ip_address=config.ip_address,
                community_string=config.community_string,
                version=config.snmp_version,
                port=config.snmp_port,
            )
            
            self.sessions[config.device_id] = session
            self.last_poll_time[config.device_id] = {}
            
            logger.info(
                f"Device registered: {config.device_name} "
                f"({config.ip_address}) - Vendor: {config.vendor}"
            )
        except Exception as e:
            logger.error(
                f"Failed to register device {config.device_name}: {e}"
            )
    
    def unregister_device(self, device_id: int) -> None:
        """Unregister a device
        
        Args:
            device_id: Device identifier
        """
        if device_id in self.sessions:
            self.sessions[device_id].close()
            del self.sessions[device_id]
            del self.last_poll_time[device_id]
            logger.info(f"Device {device_id} unregistered")
    
    def poll_interfaces(
        self,
        device_id: int,
    ) -> List[InterfaceMetric]:
        """Poll interface metrics for a device
        
        Args:
            device_id: Device identifier
            
        Returns:
            List of InterfaceMetric objects
        """
        if device_id not in self.sessions:
            logger.warning(f"Device {device_id} not registered")
            return []
        
        session = self.sessions[device_id]
        metrics = []
        
        try:
            # Walk the interface table
            interface_oids = oid_manager.get_interface_oids()
            
            # Get interface indices first
            indices = session.walk("1.3.6.1.2.1.2.2.1.1")
            
            for index_oid, index_value in indices.items():
                try:
                    iface_idx = int(index_value)
                    
                    # Collect all interface metrics for this index
                    oids_to_fetch = {
                        "descr": "1.3.6.1.2.1.2.2.1.2." + str(iface_idx),
                        "type": "1.3.6.1.2.1.2.2.1.3." + str(iface_idx),
                        "mtu": "1.3.6.1.2.1.2.2.1.4." + str(iface_idx),
                        "speed": "1.3.6.1.2.1.2.2.1.5." + str(iface_idx),
                        "admin_status": "1.3.6.1.2.1.2.2.1.7." + str(iface_idx),
                        "oper_status": "1.3.6.1.2.1.2.2.1.8." + str(iface_idx),
                        "in_octets": "1.3.6.1.2.1.2.2.1.10." + str(iface_idx),
                        "out_octets": "1.3.6.1.2.1.2.2.1.16." + str(iface_idx),
                    }
                    
                    values = session.get_multiple(list(oids_to_fetch.values()))
                    
                    # Convert values to correct status strings
                    admin_status_int = values.get(oids_to_fetch["admin_status"], 1)
                    oper_status_int = values.get(oids_to_fetch["oper_status"], 2)
                    
                    admin_status = "up" if admin_status_int == 1 else "down"
                    oper_status = "up" if oper_status_int == 1 else "down"
                    
                    metric = InterfaceMetric(
                        device_id=device_id,
                        interface_index=iface_idx,
                        interface_name=f"if{iface_idx}",
                        description=str(values.get(
                            oids_to_fetch["descr"], f"Interface {iface_idx}"
                        )),
                        admin_status=admin_status,
                        oper_status=oper_status,
                        speed=int(values.get(oids_to_fetch["speed"], 0)),
                        in_octets=int(values.get(oids_to_fetch["in_octets"], 0)),
                        out_octets=int(values.get(oids_to_fetch["out_octets"], 0)),
                        timestamp=datetime.utcnow(),
                    )
                    
                    metrics.append(metric)
                    
                except (ValueError, TypeError, KeyError) as e:
                    logger.warning(
                        f"Failed to parse interface {iface_idx} metrics: {e}"
                    )
                    continue
            
            logger.info(
                f"Polled {len(metrics)} interfaces for device {device_id}"
            )
            
        except SNMPDeviceUnreachable as e:
            logger.warning(f"Device {device_id} unreachable: {e}")
        except Exception as e:
            logger.error(f"Interface polling failed for device {device_id}: {e}")
        
        return metrics
    
    def poll_device_health(
        self,
        device_id: int,
        vendor: str,
    ) -> Optional[DeviceHealthMetric]:
        """Poll device health metrics (CPU, memory, temperature)
        
        Args:
            device_id: Device identifier
            vendor: Vendor name for OID selection
            
        Returns:
            DeviceHealthMetric or None if failed
        """
        if device_id not in self.sessions:
            logger.warning(f"Device {device_id} not registered")
            return None
        
        session = self.sessions[device_id]
        
        try:
            # Get basic system info
            sys_name = session.get("1.3.6.1.2.1.1.5.0")
            uptime_ticks = session.get("1.3.6.1.2.1.1.3.0")
            
            if uptime_ticks is None:
                logger.warning(f"Could not get uptime for device {device_id}")
                return None
            
            uptime_seconds = int(int(uptime_ticks) * 0.01)  # Convert ticks to seconds
            
            # Get vendor-specific metrics
            cpu_usage = None
            memory_usage = None
            temperature = None
            
            if vendor.lower() == "cisco":
                cpu_oid = "1.3.6.1.4.1.9.9.109.1.1.1.1.5"  # 1-minute average
                mem_used_oid = "1.3.6.1.4.1.9.9.48.1.1.1.5"
                mem_free_oid = "1.3.6.1.4.1.9.9.48.1.1.1.6"
                temp_oid = "1.3.6.1.4.1.9.9.13.1.3.1.3"
                
                cpu_value = session.get(cpu_oid)
                if cpu_value is not None:
                    cpu_usage = float(cpu_value)
                
                mem_used = session.get(mem_used_oid)
                mem_free = session.get(mem_free_oid)
                if mem_used is not None and mem_free is not None:
                    total_mem = int(mem_used) + int(mem_free)
                    if total_mem > 0:
                        memory_usage = (int(mem_used) / total_mem) * 100
                
                temp_value = session.get(temp_oid)
                if temp_value is not None:
                    temperature = float(temp_value)
            
            elif vendor.lower() == "fortinet":
                cpu_oid = "1.3.6.1.4.1.12356.101.13.2.1.1.2"
                mem_oid = "1.3.6.1.4.1.12356.101.13.2.1.2.1"
                temp_oid = "1.3.6.1.4.1.12356.101.13.2.1.3.1"
                
                cpu_value = session.get(cpu_oid)
                if cpu_value is not None:
                    cpu_usage = float(cpu_value)
                
                mem_value = session.get(mem_oid)
                if mem_value is not None:
                    memory_usage = float(mem_value)
                
                temp_value = session.get(temp_oid)
                if temp_value is not None:
                    temperature = float(temp_value)
            
            elif vendor.lower() == "mikrotik":
                cpu_oid = "1.3.6.1.4.1.14988.1.1.3.2"
                mem_total_oid = "1.3.6.1.4.1.14988.1.1.3.3"
                mem_free_oid = "1.3.6.1.4.1.14988.1.1.3.4"
                
                cpu_value = session.get(cpu_oid)
                if cpu_value is not None:
                    cpu_usage = float(cpu_value)
                
                mem_total = session.get(mem_total_oid)
                mem_free = session.get(mem_free_oid)
                if mem_total is not None and mem_free is not None:
                    used = int(mem_total) - int(mem_free)
                    if int(mem_total) > 0:
                        memory_usage = (used / int(mem_total)) * 100
            
            metric = DeviceHealthMetric(
                device_id=device_id,
                device_name=str(sys_name) if sys_name else f"Device{device_id}",
                uptime_seconds=uptime_seconds,
                cpu_usage=cpu_usage,
                memory_usage=memory_usage,
                temperature=temperature,
                timestamp=datetime.utcnow(),
            )
            
            logger.debug(f"Polled health metrics for device {device_id}")
            return metric
            
        except SNMPDeviceUnreachable as e:
            logger.warning(f"Device {device_id} unreachable: {e}")
            return None
        except Exception as e:
            logger.error(f"Health polling failed for device {device_id}: {e}")
            return None
    
    def poll_inventory(
        self,
        device_id: int,
    ) -> Optional[DeviceInventory]:
        """Poll device hardware/inventory information
        
        Args:
            device_id: Device identifier
            
        Returns:
            DeviceInventory or None if failed
        """
        if device_id not in self.sessions:
            logger.warning(f"Device {device_id} not registered")
            return None
        
        session = self.sessions[device_id]
        
        try:
            sys_descr = session.get("1.3.6.1.2.1.1.1.0")
            sys_name = session.get("1.3.6.1.2.1.1.5.0")
            
            if sys_descr is None:
                logger.warning(f"Could not get system description for device {device_id}")
                return None
            
            inventory = DeviceInventory(
                device_id=device_id,
                sys_descr=str(sys_descr),
                serial_number=None,  # Device-specific, implement as needed
                firmware_version=None,  # Device-specific
                vendor=None,  # Extracted from sysDescr if needed
                timestamp=datetime.utcnow(),
            )
            
            logger.debug(f"Polled inventory for device {device_id}")
            return inventory
            
        except SNMPDeviceUnreachable as e:
            logger.warning(f"Device {device_id} unreachable: {e}")
            return None
        except Exception as e:
            logger.error(f"Inventory polling failed for device {device_id}: {e}")
            return None
    
    def close_all(self) -> None:
        """Close all SNMP sessions"""
        for session in self.sessions.values():
            try:
                session.close()
            except Exception as e:
                logger.warning(f"Error closing session: {e}")
        
        self.sessions.clear()
        self.last_poll_time.clear()
        logger.info("All SNMP sessions closed")
    
    def __repr__(self) -> str:
        return f"SNMPPoller(devices={len(self.sessions)})"
