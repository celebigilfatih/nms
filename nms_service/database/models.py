"""Database models for alarms and metrics

Uses SQLAlchemy ORM for PostgreSQL persistence.
"""

from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    String,
    Float,
    Boolean,
    DateTime,
    Text,
    JSON,
    Enum as SQLEnum,
    Index,
    ForeignKey,
    create_engine,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

from nms_service.core.models import AlarmType, AlarmSeverity
from nms_service.core.config import config

Base = declarative_base()


class Device(Base):
    """Monitored device"""
    __tablename__ = "devices"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False, unique=True)
    ip_address = Column(String(45), nullable=False)  # IPv4 or IPv6
    vendor = Column(String(50), nullable=False)  # "cisco", "fortinet", "mikrotik", "generic"
    device_type = Column(String(100), nullable=True)
    snmp_community = Column(String(255), nullable=True)  # Encrypted in production
    snmp_version = Column(String(10), default="2c")
    snmp_port = Column(Integer, default=161)
    snmp_username = Column(String(255), nullable=True)
    snmp_auth_protocol = Column(String(20), nullable=True)
    snmp_auth_password = Column(String(255), nullable=True)
    snmp_priv_protocol = Column(String(20), nullable=True)
    snmp_priv_password = Column(String(255), nullable=True)
    polling_enabled = Column(Boolean, default=True)
    polling_interval = Column(Integer, default=300)
    connection_status = Column(String(20), default="offline")
    last_polled = Column(DateTime, nullable=True)
    last_online = Column(DateTime, nullable=True)
    location = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(String(255), nullable=True)
    ssh_username = Column(String(255), nullable=True)
    ssh_password = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_device_ip", "ip_address"),
        Index("idx_device_polling", "polling_enabled"),
    )


class Alarm(Base):
    """Stored alarm records"""
    __tablename__ = "alarms"
    
    id = Column(Integer, primary_key=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    
    alarm_code = Column(String(50), nullable=False)
    severity = Column(SQLEnum(AlarmSeverity), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(50), default="active")
    source = Column(String(100), nullable=True)
    
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(Integer, nullable=True)
    
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, nullable=True)
    
    alarm_metadata = Column(JSON, default={})  # Vendor-specific data
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_alarm_device", "device_id"),
        Index("idx_alarm_severity", "severity"),
        Index("idx_alarm_created", "created_at"),
        Index("idx_alarm_status", "status"),
    )


class Interface(Base):
    """Network interfaces status (Current state)"""
    __tablename__ = "interfaces"
    
    id = Column(Integer, primary_key=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    name = Column(String(255), nullable=False)
    ip_address = Column(String(45), nullable=True)
    status = Column(String(50))
    in_octets = Column(BigInteger, default=0)
    out_octets = Column(BigInteger, default=0)
    in_errors = Column(BigInteger, default=0)
    out_errors = Column(BigInteger, default=0)
    speed = Column(BigInteger, default=0)
    mtu = Column(Integer, default=1500)
    type = Column(String(100))
    
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_interface_device", "device_id"),
        Index("idx_interface_name", "name"),
    )


class InterfaceMetric(Base):
    """Interface metrics time series data"""
    __tablename__ = "interface_metrics"
    
    id = Column(Integer, primary_key=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    interface_index = Column(Integer, nullable=False)
    interface_name = Column(String(100))
    description = Column(String(255))
    
    admin_status = Column(String(10))  # "up", "down"
    oper_status = Column(String(10))   # "up", "down"
    speed = Column(BigInteger)  # bps
    in_octets = Column(BigInteger)
    out_octets = Column(BigInteger)
    
    collected_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_interface_device_idx", "device_id", "interface_index"),
        Index("idx_interface_collected", "collected_at"),
    )


class DeviceHealthMetric(Base):
    """Device health/resource metrics time series"""
    __tablename__ = "device_health_metrics"
    
    id = Column(Integer, primary_key=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    device_name = Column(String(255))
    
    uptime_seconds = Column(Integer)
    cpu_usage = Column(Float)  # percentage
    memory_usage = Column(Float)  # percentage
    temperature = Column(Float)  # celsius
    
    collected_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_health_device", "device_id"),
        Index("idx_health_collected", "collected_at"),
    )


class DeviceInventory(Base):
    """Device hardware/inventory information"""
    __tablename__ = "device_inventory"
    
    id = Column(Integer, primary_key=True)
    device_id = Column(Integer, ForeignKey("devices.id"), unique=True, nullable=False)
    
    sys_descr = Column(Text)
    serial_number = Column(String(255))
    firmware_version = Column(String(255))
    vendor_model = Column(String(255))
    
    collected_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_inventory_device", "device_id"),
    )


class DatabaseManager:
    """Manage database connection and sessions"""
    
    def __init__(self):
        """Initialize database connection"""
        self.engine = create_engine(
            config.database.connection_string,
            pool_size=config.database.pool_size,
            max_overflow=config.database.max_overflow,
            echo=config.debug,
        )
        self.SessionLocal = sessionmaker(bind=self.engine)
    
    def init_db(self) -> None:
        """Create all tables"""
        Base.metadata.create_all(self.engine)
    
    def get_session(self) -> Session:
        """Get a new database session"""
        return self.SessionLocal()
    
    def close(self) -> None:
        """Close database connection"""
        self.engine.dispose()


# Global database manager instance
db_manager = DatabaseManager()
