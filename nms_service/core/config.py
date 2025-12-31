"""Configuration management for NMS service

Loads configuration from environment variables and config files.
Follows 12-factor app principles.
"""

import os
from dataclasses import dataclass
from typing import Optional, Dict, List
import json
from pathlib import Path


@dataclass
class DatabaseConfig:
    """PostgreSQL database configuration"""
    host: str
    port: int
    username: str
    password: str
    database: str
    pool_size: int = 10
    max_overflow: int = 20
    
    @property
    def connection_string(self) -> str:
        """Generate SQLAlchemy connection string"""
        return (
            f"postgresql://{self.username}:{self.password}@"
            f"{self.host}:{self.port}/{self.database}"
        )


@dataclass
class SNMPConfig:
    """SNMP global configuration"""
    snmp_timeout: int = 5  # seconds
    snmp_retries: int = 3
    max_concurrent_pollers: int = 20
    bulk_walk_enabled: bool = True


@dataclass
class PollingConfig:
    """Polling interval configuration"""
    interface_poll_interval: int = 30  # seconds
    cpu_memory_poll_interval: int = 300  # 5 minutes
    inventory_poll_interval: int = 3600  # 1 hour


@dataclass
class AlarmConfig:
    """Alarm engine thresholds"""
    cpu_threshold: float = 80.0
    memory_threshold: float = 80.0
    temperature_threshold: float = 80.0


@dataclass
class APIConfig:
    """Node.js backend API configuration"""
    base_url: str
    timeout: int = 10
    retry_attempts: int = 3


class Config:
    """Main configuration class"""
    
    def __init__(self):
        self.env = os.getenv("NMS_ENV", "development")
        self.debug = os.getenv("NMS_DEBUG", "false").lower() == "true"
        self.log_level = os.getenv("NMS_LOG_LEVEL", "INFO")
        
        # Database
        self.database = DatabaseConfig(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", 5432)),
            username=os.getenv("DB_USER", "nms_user"),
            password=os.getenv("DB_PASSWORD", ""),  # Should be set in production
            database=os.getenv("DB_NAME", "nms_db"),
            pool_size=int(os.getenv("DB_POOL_SIZE", 10)),
        )
        
        # SNMP
        self.snmp = SNMPConfig(
            snmp_timeout=int(os.getenv("SNMP_TIMEOUT", 5)),
            snmp_retries=int(os.getenv("SNMP_RETRIES", 3)),
            max_concurrent_pollers=int(os.getenv("MAX_CONCURRENT_POLLERS", 20)),
        )
        
        # Polling intervals
        self.polling = PollingConfig(
            interface_poll_interval=int(os.getenv("INTERFACE_POLL_INTERVAL", 30)),
            cpu_memory_poll_interval=int(os.getenv("CPU_MEMORY_POLL_INTERVAL", 300)),
            inventory_poll_interval=int(os.getenv("INVENTORY_POLL_INTERVAL", 3600)),
        )
        
        # Alarm thresholds
        self.alarm = AlarmConfig(
            cpu_threshold=float(os.getenv("CPU_THRESHOLD", 80.0)),
            memory_threshold=float(os.getenv("MEMORY_THRESHOLD", 80.0)),
            temperature_threshold=float(os.getenv("TEMPERATURE_THRESHOLD", 80.0)),
        )
        
        # Backend API
        self.api = APIConfig(
            base_url=os.getenv("BACKEND_API_URL", "http://localhost:3000"),
            timeout=int(os.getenv("API_TIMEOUT", 10)),
        )
        
        # Vendor OID mapping path
        self.vendor_oid_config_path = os.getenv(
            "VENDOR_OID_CONFIG_PATH",
            str(Path(__file__).parent.parent / "snmp" / "vendor_oids.json")
        )
    
    def validate(self) -> None:
        """Validate critical configuration"""
        if not self.database.password and self.env == "production":
            raise ValueError("DB_PASSWORD must be set in production")
    
    def __repr__(self) -> str:
        return (
            f"Config(env={self.env}, db_host={self.database.host}, "
            f"api_url={self.api.base_url})"
        )


# Global config instance
config = Config()
