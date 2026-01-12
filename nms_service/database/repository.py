"""Database repository layer for alarms and metrics

Provides clean data access interfaces to domain models.
"""

from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_

from nms_service.core.logger import logger
from nms_service.core.models import (
    Alarm as AlarmModel,
    AlarmType,
    AlarmSeverity,
)
from nms_service.database.models import (
    Alarm as AlarmDB,
    Device as DeviceDB,
    InterfaceMetric as InterfaceMetricDB,
    DeviceHealthMetric as DeviceHealthMetricDB,
    DeviceInventory as DeviceInventoryDB,
)


class AlarmRepository:
    """Repository for alarm data access"""
    
    def __init__(self, session: Session):
        """Initialize with database session
        
        Args:
            session: SQLAlchemy session
        """
        self.session = session
    
    def create(self, alarm: AlarmModel) -> AlarmDB:
        """Create a new alarm record
        
        Args:
            alarm: Alarm model
            
        Returns:
            Created AlarmDB record
        """
        try:
            db_alarm = AlarmDB(
                device_id=alarm.device_id,
                device_name=alarm.device_name,
                type=alarm.type,
                severity=alarm.severity,
                message=alarm.message,
                acknowledged=alarm.acknowledged,
                metadata=alarm.metadata,
            )
            self.session.add(db_alarm)
            self.session.commit()
            logger.debug(f"Created alarm: {db_alarm.id}")
            return db_alarm
        except Exception as e:
            self.session.rollback()
            logger.error(f"Failed to create alarm: {e}")
            raise
    
    def get_by_id(self, alarm_id: int) -> Optional[AlarmDB]:
        """Get alarm by ID
        
        Args:
            alarm_id: Alarm ID
            
        Returns:
            AlarmDB or None
        """
        return self.session.query(AlarmDB).filter(AlarmDB.id == alarm_id).first()
    
    def get_active(
        self,
        device_id: Optional[int] = None,
        severity: Optional[AlarmSeverity] = None,
        limit: int = 100,
    ) -> List[AlarmDB]:
        """Get active (unresolved) alarms
        
        Args:
            device_id: Filter by device (optional)
            severity: Filter by severity (optional)
            limit: Maximum results
            
        Returns:
            List of AlarmDB records
        """
        query = self.session.query(AlarmDB).filter(AlarmDB.resolved == False)
        
        if device_id:
            query = query.filter(AlarmDB.device_id == device_id)
        
        if severity:
            query = query.filter(AlarmDB.severity == severity)
        
        return query.order_by(desc(AlarmDB.created_at)).limit(limit).all()
    
    def get_recent(
        self,
        days: int = 7,
        device_id: Optional[int] = None,
        limit: int = 500,
    ) -> List[AlarmDB]:
        """Get recent alarms
        
        Args:
            days: Look back N days
            device_id: Filter by device (optional)
            limit: Maximum results
            
        Returns:
            List of AlarmDB records
        """
        since = datetime.utcnow() - timedelta(days=days)
        query = self.session.query(AlarmDB).filter(AlarmDB.created_at >= since)
        
        if device_id:
            query = query.filter(AlarmDB.device_id == device_id)
        
        return query.order_by(desc(AlarmDB.created_at)).limit(limit).all()
    
    def acknowledge(
        self,
        alarm_id: int,
        acknowledged_by: str = "system",
    ) -> bool:
        """Acknowledge an alarm
        
        Args:
            alarm_id: Alarm ID
            acknowledged_by: User/system acknowledging
            
        Returns:
            Success status
        """
        try:
            alarm = self.get_by_id(alarm_id)
            if alarm:
                alarm.acknowledged = True
                alarm.acknowledged_at = datetime.utcnow()
                alarm.acknowledged_by = acknowledged_by
                self.session.commit()
                logger.info(f"Acknowledged alarm {alarm_id}")
                return True
            return False
        except Exception as e:
            self.session.rollback()
            logger.error(f"Failed to acknowledge alarm: {e}")
            return False
    
    def resolve(self, alarm_id: int) -> bool:
        """Resolve (close) an alarm
        
        Args:
            alarm_id: Alarm ID
            
        Returns:
            Success status
        """
        try:
            alarm = self.get_by_id(alarm_id)
            if alarm:
                alarm.resolved = True
                alarm.resolved_at = datetime.utcnow()
                self.session.commit()
                logger.info(f"Resolved alarm {alarm_id}")
                return True
            return False
        except Exception as e:
            self.session.rollback()
            logger.error(f"Failed to resolve alarm: {e}")
            return False
    
    def get_active_by_type(self, alarm_type: AlarmType) -> List[AlarmDB]:
        """Get all active alarms of a specific type
        
        Args:
            alarm_type: Alarm type filter
            
        Returns:
            List of AlarmDB records
        """
        return self.session.query(AlarmDB).filter(
            and_(AlarmDB.resolved == False, AlarmDB.type == alarm_type)
        ).all()


class DeviceRepository:
    """Repository for device data access"""
    
    def __init__(self, session: Session):
        """Initialize with database session
        
        Args:
            session: SQLAlchemy session
        """
        self.session = session
    
    def create(
        self,
        name: str,
        ip_address: str,
        vendor: str,
        community_string: str,
        snmp_version: str = "2c",
        snmp_port: int = 161,
    ) -> DeviceDB:
        """Create a new device
        
        Args:
            name: Device name
            ip_address: IP address
            vendor: Vendor name
            community_string: SNMP community
            snmp_version: SNMP version
            snmp_port: SNMP port
            
        Returns:
            Created DeviceDB record
        """
        try:
            device = DeviceDB(
                name=name,
                ip_address=ip_address,
                vendor=vendor,
                snmp_community=community_string,
                snmp_version=snmp_version,
                snmp_port=snmp_port,
            )
            self.session.add(device)
            self.session.commit()
            logger.info(f"Created device: {name} ({ip_address})")
            return device
        except Exception as e:
            self.session.rollback()
            logger.error(f"Failed to create device: {e}")
            raise
    
    def get_all_enabled(self) -> List[DeviceDB]:
        """Get all enabled devices
        
        Returns:
            List of DeviceDB records
        """
        return self.session.query(DeviceDB).filter(DeviceDB.polling_enabled == True).all()
    
    def get_by_id(self, device_id: int) -> Optional[DeviceDB]:
        """Get device by ID
        
        Args:
            device_id: Device ID
            
        Returns:
            DeviceDB or None
        """
        return self.session.query(DeviceDB).filter(DeviceDB.id == device_id).first()
    
    def get_by_name(self, name: str) -> Optional[DeviceDB]:
        """Get device by name
        
        Args:
            name: Device name
            
        Returns:
            DeviceDB or None
        """
        return self.session.query(DeviceDB).filter(DeviceDB.name == name).first()
    
    def update_status(self, device_id: int, status: str) -> bool:
        """Update device connection status
        
        Args:
            device_id: Device ID
            status: Connection status ("online" or "offline")
            
        Returns:
            Success status
        """
        try:
            device = self.get_by_id(device_id)
            if device:
                device.connection_status = status
                device.last_polled = datetime.utcnow()
                self.session.commit()
                logger.debug(f"Updated device {device_id} status to {status}")
                return True
            return False
        except Exception as e:
            self.session.rollback()
            logger.error(f"Failed to update device status: {e}")
            return False


class MetricsRepository:
    """Repository for metrics data access"""
    
    def __init__(self, session: Session):
        """Initialize with database session
        
        Args:
            session: SQLAlchemy session
        """
        self.session = session
    
    def save_interface_metrics(
        self,
        device_id: int,
        interface_index: int,
        interface_name: str,
        description: str,
        admin_status: str,
        oper_status: str,
        speed: int,
        in_octets: int,
        out_octets: int,
    ) -> InterfaceMetricDB:
        """Save interface metrics
        
        Args:
            device_id: Device ID
            interface_index: Interface index
            interface_name: Interface name
            description: Interface description
            admin_status: Admin status
            oper_status: Operational status
            speed: Interface speed
            in_octets: Input octets
            out_octets: Output octets
            
        Returns:
            Created InterfaceMetricDB record
        """
        try:
            metric = InterfaceMetricDB(
                device_id=device_id,
                interface_index=interface_index,
                interface_name=interface_name,
                description=description,
                admin_status=admin_status,
                oper_status=oper_status,
                speed=speed,
                in_octets=in_octets,
                out_octets=out_octets,
            )
            self.session.add(metric)
            self.session.commit()
            return metric
        except Exception as e:
            self.session.rollback()
            logger.error(f"Failed to save interface metrics: {e}")
            raise
    
    def save_health_metrics(
        self,
        device_id: int,
        device_name: str,
        uptime_seconds: int,
        cpu_usage: Optional[float] = None,
        memory_usage: Optional[float] = None,
        temperature: Optional[float] = None,
    ) -> DeviceHealthMetricDB:
        """Save device health metrics
        
        Args:
            device_id: Device ID
            device_name: Device name
            uptime_seconds: Uptime in seconds
            cpu_usage: CPU usage percentage
            memory_usage: Memory usage percentage
            temperature: Temperature in celsius
            
        Returns:
            Created DeviceHealthMetricDB record
        """
        try:
            metric = DeviceHealthMetricDB(
                device_id=device_id,
                device_name=device_name,
                uptime_seconds=uptime_seconds,
                cpu_usage=cpu_usage,
                memory_usage=memory_usage,
                temperature=temperature,
            )
            self.session.add(metric)
            self.session.commit()
            return metric
        except Exception as e:
            self.session.rollback()
            logger.error(f"Failed to save health metrics: {e}")
            raise
    
    def get_latest_health(
        self,
        device_id: int,
        hours: int = 24,
    ) -> List[DeviceHealthMetricDB]:
        """Get latest health metrics for device
        
        Args:
            device_id: Device ID
            hours: Look back N hours
            
        Returns:
            List of DeviceHealthMetricDB records
        """
        since = datetime.utcnow() - timedelta(hours=hours)
        return self.session.query(DeviceHealthMetricDB).filter(
            and_(
                DeviceHealthMetricDB.device_id == device_id,
                DeviceHealthMetricDB.collected_at >= since,
            )
        ).order_by(desc(DeviceHealthMetricDB.collected_at)).all()
