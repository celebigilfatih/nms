"""Main NMS orchestration service

Coordinates SNMP polling, alarm evaluation, and data storage.
Designed for gradual scalability from single poller to distributed system.
"""

import time
from typing import Dict, List
from datetime import datetime, timedelta

from nms_service.core.logger import logger
from nms_service.core.config import config
from nms_service.snmp.poller import SNMPPoller, DeviceConfig
from nms_service.alarm import AlarmEngine
from nms_service.database.models import db_manager
from nms_service.database.repository import (
    AlarmRepository,
    DeviceRepository,
    MetricsRepository,
)
from nms_service.api.client import APIClient


class NMSOrchestrator:
    """Main NMS service orchestrator
    
    Responsibilities:
    - Manage SNMP polling lifecycle
    - Coordinate alarm evaluation
    - Store metrics and alarms
    - Integrate with backend API
    - Provide monitoring status
    """
    
    def __init__(self):
        """Initialize NMS orchestrator"""
        self.poller = SNMPPoller()
        self.alarm_engine = AlarmEngine()
        self.api_client = APIClient()
        self.last_inventory_poll: Dict[int, datetime] = {}
        
        # Initialize database
        db_manager.init_db()
        
        logger.info("NMS Orchestrator initialized")
    
    def register_devices_from_db(self) -> int:
        """Load and register devices from database
        
        Returns:
            Number of devices registered
        """
        try:
            session = db_manager.get_session()
            device_repo = DeviceRepository(session)
            
            devices = device_repo.get_all_enabled()
            count = 0
            
            for device in devices:
                config = DeviceConfig(
                    device_id=device.id,
                    device_name=device.name,
                    ip_address=device.ip_address,
                    community_string=device.snmp_community,
                    vendor=device.vendor,
                    snmp_port=device.snmp_port,
                    snmp_version=device.snmp_version,
                    enabled=device.polling_enabled,
                )
                self.poller.register_device(config)
                count += 1
            
            session.close()
            logger.info(f"Registered {count} devices from database")
            return count
            
        except Exception as e:
            logger.error(f"Failed to register devices from DB: {e}")
            return 0
    
    def poll_cycle(self) -> None:
        """Execute single polling cycle
        
        - Poll all registered devices
        - Evaluate metrics for alarms
        - Store results in database
        - Send to API
        """
        logger.debug("Starting polling cycle")
        cycle_start = time.time()
        
        try:
            session = db_manager.get_session()
            alarm_repo = AlarmRepository(session)
            metrics_repo = MetricsRepository(session)
            
            for device_id, session_obj in self.poller.sessions.items():
                try:
                    device_name = session_obj.device_name
                    logger.debug(f"Polling device {device_name}")
                    
                    device_is_online = False
                    
                    # Poll interfaces
                    try:
                        interfaces = self.poller.poll_interfaces(device_id)
                        
                        if interfaces:
                            device_is_online = True
                            # Device is online - mark it as such
                            self.api_client.update_device_status(device_id, "online")
                            device_repo = DeviceRepository(session)
                            device_repo.update_status(device_id, "online")
                            
                            # Check if inventory polling is due
                            now = datetime.utcnow()
                            last_poll = self.last_inventory_poll.get(device_id)
                            interval = timedelta(seconds=config.polling.inventory_poll_interval)
                            
                            if not last_poll or (now - last_poll) > interval:
                                try:
                                    inventory = self.poller.poll_inventory(device_id)
                                    if inventory:
                                        vendor_model = inventory.model
                                        if inventory.vendor and inventory.model:
                                            vendor_model = f"{inventory.vendor} {inventory.model}"
                                        elif inventory.vendor:
                                            vendor_model = inventory.vendor
                                            
                                        metrics_repo.save_inventory(
                                            device_id=device_id,
                                            sys_descr=inventory.sys_descr,
                                            serial_number=inventory.serial_number,
                                            firmware_version=inventory.firmware_version,
                                            vendor_model=vendor_model
                                        )
                                        self.last_inventory_poll[device_id] = now
                                        logger.info(f"Updated inventory for {device_name}")
                                except Exception as e:
                                    logger.error(f"Inventory poll failed for {device_name}: {e}")
                            
                            for iface_metric in interfaces:
                                # Generate alarms for interface
                                alarms = self.alarm_engine.evaluate_interface_metric(iface_metric)
                            
                                for alarm in alarms:
                                    alarm.device_name = device_name
                                    # Store in database
                                    alarm_repo.create(alarm)
                                    # Send to API
                                    self.api_client.create_alarm(alarm)
                            
                                # Store metrics in database
                                metrics_repo.save_interface_metrics(
                                    device_id=iface_metric.device_id,
                                    interface_index=iface_metric.interface_index,
                                    interface_name=iface_metric.interface_name,
                                    description=iface_metric.description,
                                    admin_status=iface_metric.admin_status,
                                    oper_status=iface_metric.oper_status,
                                    speed=iface_metric.speed,
                                    in_octets=iface_metric.in_octets,
                                    out_octets=iface_metric.out_octets,
                                    mtu=iface_metric.mtu,
                                )
                                
                                # Note: Interface metrics are no longer sent to the generic /metrics API 
                                # to avoid cluttering the System Metrics dashboard. They are available 
                                # via the interfaces table.
                        
                            logger.debug(
                                f"Polled {len(interfaces)} interfaces for {device_name}"
                            )
                        
                    except Exception as e:
                        logger.error(f"Interface polling failed for {device_name}: {e}")
                    
                    # Poll device health
                    try:
                        device_repo = DeviceRepository(session)
                        device_db_obj = device_repo.get_by_id(device_id)
                        
                        if device_db_obj:
                            health_metric = self.poller.poll_device_health(
                                device_id,
                                device_db_obj.vendor,
                            )
                            
                            if health_metric:
                                device_is_online = True
                                # Device is online - update status
                                self.api_client.update_device_status(device_id, "online")
                                device_repo.update_status(device_id, "online")
                                
                                # Generate alarms
                                alarms = self.alarm_engine.evaluate_device_health(
                                    health_metric
                                )
                                
                                for alarm in alarms:
                                    alarm.device_name = device_name
                                    alarm_repo.create(alarm)
                                    self.api_client.create_alarm(alarm)
                                
                                # Store metrics
                                metrics_repo.save_health_metrics(
                                    device_id=health_metric.device_id,
                                    device_name=health_metric.device_name,
                                    uptime_seconds=health_metric.uptime_seconds,
                                    cpu_usage=health_metric.cpu_usage,
                                    memory_usage=health_metric.memory_usage,
                                    temperature=health_metric.temperature,
                                )
                                
                                # Send to API
                                self.api_client.send_metrics(
                                    device_id=device_id,
                                    metric_type="health",
                                    data={
                                        "cpu_usage": health_metric.cpu_usage,
                                        "memory_usage": health_metric.memory_usage,
                                        "temperature": health_metric.temperature,
                                        "uptime_seconds": health_metric.uptime_seconds,
                                    },
                                )
                    
                    except Exception as e:
                        logger.error(f"Health polling failed for {device_name}: {e}")

                    # If both failed, mark offline
                    if not device_is_online:
                        try:
                            logger.debug(f"Device {device_name} is offline, updating status")
                            self.api_client.update_device_status(device_id, "offline")
                            device_repo = DeviceRepository(session)
                            device_repo.update_status(device_id, "offline")
                        except Exception as e:
                            logger.error(f"Failed to mark device {device_id} as offline: {e}")
                
                except Exception as e:
                    logger.error(f"Error polling device {device_id}: {e}")
            
            session.close()
            
        except Exception as e:
            logger.error(f"Polling cycle failed: {e}")
        
        cycle_time = time.time() - cycle_start
        logger.debug(f"Polling cycle completed in {cycle_time:.2f}s")
    
    def run(self) -> None:
        """Run NMS service continuously
        
        Implements polling loop with configurable intervals.
        Designed to be wrapped with process supervisor (systemd, Docker, k8s, etc).
        """
        logger.info("Starting NMS service")
        
        # Load devices from database
        self.register_devices_from_db()
        
        if not self.poller.sessions:
            logger.error("No devices registered, exiting")
            return
        
        # Main polling loop
        try:
            while True:
                try:
                    # Execute polling cycle
                    self.poll_cycle()
                    
                    # Sleep before next cycle
                    time.sleep(config.polling.interface_poll_interval)
                    
                except KeyboardInterrupt:
                    logger.info("Received keyboard interrupt, shutting down")
                    break
                except Exception as e:
                    logger.error(f"Error in polling loop: {e}")
                    time.sleep(5)  # Brief pause before retry
        
        finally:
            self.shutdown()
    
    def shutdown(self) -> None:
        """Graceful shutdown"""
        logger.info("Shutting down NMS service")
        
        try:
            self.poller.close_all()
            self.api_client.close()
            db_manager.close()
            logger.info("NMS service shutdown complete")
        except Exception as e:
            logger.error(f"Error during shutdown: {e}")


def main():
    """Entry point for NMS service"""
    try:
        # Validate configuration
        config.validate()
        
        # Create and run orchestrator
        orchestrator = NMSOrchestrator()
        orchestrator.run()
    
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        exit(1)


if __name__ == "__main__":
    main()
