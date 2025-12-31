"""Alarm engine for NMS

Evaluates metrics against thresholds and generates alarms.
Implements vendor-agnostic state comparison logic.
"""

from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from dataclasses import dataclass

from nms_service.core.logger import logger
from nms_service.core.config import config
from nms_service.core.models import (
    Alarm,
    AlarmType,
    AlarmSeverity,
    InterfaceMetric,
    DeviceHealthMetric,
    PreviousState,
)


@dataclass
class AlarmRule:
    """Alarm rule configuration"""
    alarm_type: AlarmType
    severity: AlarmSeverity
    description: str
    threshold: Optional[float] = None  # For threshold-based alarms
    metric_key: Optional[str] = None  # What to check (e.g., "cpu_usage")
    comparison_operator: Optional[str] = None  # ">=", "<=", "<", ">"


class AlarmEngine:
    """Core alarm generation and evaluation logic
    
    Responsibilities:
    - Compare current metrics with previous state
    - Evaluate threshold-based rules
    - Generate alarms for state changes
    - Handle alarm recovery/clearing
    - Support vendor-independent alarm logic
    """
    
    def __init__(self):
        """Initialize alarm engine"""
        self.previous_state: Dict[Tuple[int, str], PreviousState] = {}
        self.alarm_rules = self._default_alarm_rules()
    
    def _default_alarm_rules(self) -> List[AlarmRule]:
        """Define default alarm rules"""
        return [
            # Device unreachable is handled separately
            
            # Interface alarms
            AlarmRule(
                alarm_type=AlarmType.PORT_DOWN,
                severity=AlarmSeverity.CRITICAL,
                description="Interface is administratively up but operationally down",
            ),
            AlarmRule(
                alarm_type=AlarmType.PORT_UP,
                severity=AlarmSeverity.INFO,
                description="Interface recovered to up state",
            ),
            
            # Resource alarms
            AlarmRule(
                alarm_type=AlarmType.CPU_HIGH,
                severity=AlarmSeverity.WARNING,
                description="CPU usage exceeded threshold",
                threshold=config.alarm.cpu_threshold,
                metric_key="cpu_usage",
                comparison_operator=">=",
            ),
            AlarmRule(
                alarm_type=AlarmType.MEMORY_HIGH,
                severity=AlarmSeverity.WARNING,
                description="Memory usage exceeded threshold",
                threshold=config.alarm.memory_threshold,
                metric_key="memory_usage",
                comparison_operator=">=",
            ),
            AlarmRule(
                alarm_type=AlarmType.TEMPERATURE_HIGH,
                severity=AlarmSeverity.CRITICAL,
                description="Temperature exceeded threshold",
                threshold=config.alarm.temperature_threshold,
                metric_key="temperature",
                comparison_operator=">=",
            ),
        ]
    
    def evaluate_interface_metric(
        self,
        current_metric: InterfaceMetric,
    ) -> List[Alarm]:
        """Evaluate interface metrics and generate alarms
        
        Args:
            current_metric: Current interface metrics
            
        Returns:
            List of generated alarms (empty if none)
        """
        alarms = []
        state_key = (current_metric.device_id, f"iface_{current_metric.interface_index}")
        
        try:
            # Check for port down condition
            if current_metric.is_port_down():
                # Check if this is a new alarm or existing
                previous = self.previous_state.get(state_key)
                
                if previous is None or not previous.state.get("is_port_down", False):
                    # New port down alarm
                    alarm = Alarm(
                        device_id=current_metric.device_id,
                        type=AlarmType.PORT_DOWN,
                        severity=AlarmSeverity.CRITICAL,
                        message=(
                            f"Port {current_metric.interface_name} "
                            f"({current_metric.description}) is down"
                        ),
                        metadata={
                            "interface_index": current_metric.interface_index,
                            "interface_name": current_metric.interface_name,
                            "description": current_metric.description,
                            "admin_status": current_metric.admin_status,
                            "oper_status": current_metric.oper_status,
                        },
                    )
                    alarms.append(alarm)
                    logger.warning(
                        f"Port down alarm for device {current_metric.device_id}, "
                        f"interface {current_metric.interface_name}"
                    )
            else:
                # Port is up - check if we had a previous down alarm
                previous = self.previous_state.get(state_key)
                
                if previous is not None and previous.state.get("is_port_down", False):
                    # Port recovered
                    alarm = Alarm(
                        device_id=current_metric.device_id,
                        type=AlarmType.PORT_UP,
                        severity=AlarmSeverity.INFO,
                        message=(
                            f"Port {current_metric.interface_name} "
                            f"({current_metric.description}) recovered"
                        ),
                        metadata={
                            "interface_index": current_metric.interface_index,
                            "interface_name": current_metric.interface_name,
                            "description": current_metric.description,
                        },
                    )
                    alarms.append(alarm)
                    logger.info(
                        f"Port recovery alarm for device {current_metric.device_id}, "
                        f"interface {current_metric.interface_name}"
                    )
            
            # Store current state for next evaluation
            self.previous_state[state_key] = PreviousState(
                device_id=current_metric.device_id,
                metric_type="interface",
                metric_key=str(current_metric.interface_index),
                state={
                    "is_port_down": current_metric.is_port_down(),
                    "admin_status": current_metric.admin_status,
                    "oper_status": current_metric.oper_status,
                },
                timestamp=current_metric.timestamp,
            )
            
        except Exception as e:
            logger.error(f"Error evaluating interface metric: {e}")
        
        return alarms
    
    def evaluate_device_health(
        self,
        current_metric: DeviceHealthMetric,
    ) -> List[Alarm]:
        """Evaluate device health metrics and generate alarms
        
        Args:
            current_metric: Current device health metrics
            
        Returns:
            List of generated alarms
        """
        alarms = []
        state_key = (current_metric.device_id, "device_health")
        
        try:
            # Evaluate CPU threshold
            if (
                current_metric.cpu_usage is not None
                and current_metric.cpu_usage >= config.alarm.cpu_threshold
            ):
                previous = self.previous_state.get(state_key)
                was_high = (
                    previous is not None
                    and previous.state.get("cpu_high", False)
                )
                
                if not was_high:
                    alarm = Alarm(
                        device_id=current_metric.device_id,
                        device_name=current_metric.device_name,
                        type=AlarmType.CPU_HIGH,
                        severity=AlarmSeverity.WARNING,
                        message=(
                            f"CPU usage {current_metric.cpu_usage:.1f}% "
                            f"exceeded threshold {config.alarm.cpu_threshold}%"
                        ),
                        metadata={
                            "cpu_usage": current_metric.cpu_usage,
                            "threshold": config.alarm.cpu_threshold,
                        },
                    )
                    alarms.append(alarm)
                    logger.warning(
                        f"CPU high alarm for device {current_metric.device_id}: "
                        f"{current_metric.cpu_usage:.1f}%"
                    )
            
            # Evaluate memory threshold
            if (
                current_metric.memory_usage is not None
                and current_metric.memory_usage >= config.alarm.memory_threshold
            ):
                previous = self.previous_state.get(state_key)
                was_high = (
                    previous is not None
                    and previous.state.get("memory_high", False)
                )
                
                if not was_high:
                    alarm = Alarm(
                        device_id=current_metric.device_id,
                        device_name=current_metric.device_name,
                        type=AlarmType.MEMORY_HIGH,
                        severity=AlarmSeverity.WARNING,
                        message=(
                            f"Memory usage {current_metric.memory_usage:.1f}% "
                            f"exceeded threshold {config.alarm.memory_threshold}%"
                        ),
                        metadata={
                            "memory_usage": current_metric.memory_usage,
                            "threshold": config.alarm.memory_threshold,
                        },
                    )
                    alarms.append(alarm)
                    logger.warning(
                        f"Memory high alarm for device {current_metric.device_id}: "
                        f"{current_metric.memory_usage:.1f}%"
                    )
            
            # Evaluate temperature threshold
            if (
                current_metric.temperature is not None
                and current_metric.temperature >= config.alarm.temperature_threshold
            ):
                previous = self.previous_state.get(state_key)
                was_high = (
                    previous is not None
                    and previous.state.get("temperature_high", False)
                )
                
                if not was_high:
                    alarm = Alarm(
                        device_id=current_metric.device_id,
                        device_name=current_metric.device_name,
                        type=AlarmType.TEMPERATURE_HIGH,
                        severity=AlarmSeverity.CRITICAL,
                        message=(
                            f"Temperature {current_metric.temperature:.1f}°C "
                            f"exceeded threshold {config.alarm.temperature_threshold}°C"
                        ),
                        metadata={
                            "temperature": current_metric.temperature,
                            "threshold": config.alarm.temperature_threshold,
                        },
                    )
                    alarms.append(alarm)
                    logger.warning(
                        f"Temperature high alarm for device {current_metric.device_id}: "
                        f"{current_metric.temperature:.1f}°C"
                    )
            
            # Store current state
            self.previous_state[state_key] = PreviousState(
                device_id=current_metric.device_id,
                metric_type="device_health",
                metric_key=str(current_metric.device_id),
                state={
                    "cpu_usage": current_metric.cpu_usage,
                    "cpu_high": (
                        current_metric.cpu_usage >= config.alarm.cpu_threshold
                        if current_metric.cpu_usage is not None else False
                    ),
                    "memory_usage": current_metric.memory_usage,
                    "memory_high": (
                        current_metric.memory_usage >= config.alarm.memory_threshold
                        if current_metric.memory_usage is not None else False
                    ),
                    "temperature": current_metric.temperature,
                    "temperature_high": (
                        current_metric.temperature >= config.alarm.temperature_threshold
                        if current_metric.temperature is not None else False
                    ),
                },
                timestamp=current_metric.timestamp,
            )
            
        except Exception as e:
            logger.error(f"Error evaluating device health metric: {e}")
        
        return alarms
    
    def device_unreachable(
        self,
        device_id: int,
        device_name: str,
    ) -> List[Alarm]:
        """Generate device unreachable alarm
        
        Args:
            device_id: Device identifier
            device_name: Device name
            
        Returns:
            List with unreachable alarm
        """
        state_key = (device_id, "device_reachability")
        alarms = []
        
        try:
            previous = self.previous_state.get(state_key)
            was_unreachable = (
                previous is not None
                and previous.state.get("unreachable", False)
            )
            
            if not was_unreachable:
                alarm = Alarm(
                    device_id=device_id,
                    device_name=device_name,
                    type=AlarmType.DEVICE_UNREACHABLE,
                    severity=AlarmSeverity.CRITICAL,
                    message=f"Device {device_name} is unreachable",
                    metadata={},
                )
                alarms.append(alarm)
                logger.error(f"Device unreachable alarm for {device_name} ({device_id})")
            
            # Store state
            self.previous_state[state_key] = PreviousState(
                device_id=device_id,
                metric_type="reachability",
                metric_key=str(device_id),
                state={"unreachable": True},
                timestamp=datetime.utcnow(),
            )
            
        except Exception as e:
            logger.error(f"Error generating unreachable alarm: {e}")
        
        return alarms
    
    def device_recovered(
        self,
        device_id: int,
        device_name: str,
    ) -> List[Alarm]:
        """Generate device recovered alarm
        
        Args:
            device_id: Device identifier
            device_name: Device name
            
        Returns:
            List with recovery alarm
        """
        state_key = (device_id, "device_reachability")
        alarms = []
        
        try:
            previous = self.previous_state.get(state_key)
            was_unreachable = (
                previous is not None
                and previous.state.get("unreachable", False)
            )
            
            if was_unreachable:
                alarm = Alarm(
                    device_id=device_id,
                    device_name=device_name,
                    type=AlarmType.DEVICE_REACHABLE,
                    severity=AlarmSeverity.INFO,
                    message=f"Device {device_name} recovered",
                    metadata={},
                )
                alarms.append(alarm)
                logger.info(f"Device recovery alarm for {device_name} ({device_id})")
            
            # Store state
            self.previous_state[state_key] = PreviousState(
                device_id=device_id,
                metric_type="reachability",
                metric_key=str(device_id),
                state={"unreachable": False},
                timestamp=datetime.utcnow(),
            )
            
        except Exception as e:
            logger.error(f"Error generating recovery alarm: {e}")
        
        return alarms
    
    def clear_device_state(self, device_id: int) -> None:
        """Clear all state for a device
        
        Args:
            device_id: Device identifier
        """
        keys_to_remove = [k for k in self.previous_state.keys() if k[0] == device_id]
        for key in keys_to_remove:
            del self.previous_state[key]
        
        logger.debug(f"Cleared state for device {device_id}")
