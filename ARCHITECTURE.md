# Network Monitoring System (NMS) - Architecture & Design

## Overview

The Network Monitoring System (NMS) is a lightweight, production-grade SNMP monitoring solution for network devices. It extends the existing Network Configuration Backup application with real-time monitoring capabilities.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SNMP Network Devices                         │
│   (Cisco, Fortinet, MikroTik, Generic - 192.168.0.0/24)         │
└────────────┬──────────────────────────────────┬──────────────────┘
             │                                  │
             │ SNMP v2c/v3                      │
             │ Polling every 30s-1h             │
             │                                  │
┌────────────▼──────────────────────────────────▼──────────────────┐
│                                                                   │
│                    NMS Python Service                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Orchestrator                            │   │
│  │  - Device registration & lifecycle                       │   │
│  │  - Polling cycle coordination                            │   │
│  │  - Result aggregation                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               SNMP Polling Engine                        │   │
│  │  - Synchronous polling (sync-ready for async)           │   │
│  │  - SNMPv2c/v3 support                                   │   │
│  │  - Multi-vendor OID handling                            │   │
│  │  - Graceful timeout/error handling                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               Vendor OID Manager                         │   │
│  │  - Generic (RFC standard MIBs)                          │   │
│  │  - Cisco-specific OIDs                                  │   │
│  │  - Fortinet FortiGate OIDs                              │   │
│  │  - MikroTik RouterOS OIDs                               │   │
│  │  - Easy to extend for new vendors                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 Alarm Engine                             │   │
│  │  - State comparison (previous vs. current)               │   │
│  │  - Threshold evaluation                                 │   │
│  │  - Severity classification                              │   │
│  │  - Recovery detection                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────┬───────────────────────────────┘
              │
              │ REST API (push model)
              │
    ┌─────────▼──────────────────────────────┐
    │   PostgreSQL Database                  │
    │  - Alarms table                        │
    │  - Interface metrics (time series)     │
    │  - Device health metrics               │
    │  - Device inventory                    │
    │  - Device configuration                │
    └──────────────────────────────────────┬─┘
                       │
                       │ SQL
                       │
    ┌──────────────────▼──────────────────┐
    │   Node.js Backend API                │
    │  - Stores alarms & metrics           │
    │  - Manages device database           │
    │  - Handles RBAC & auth               │
    │  - WebSocket for real-time updates   │
    └──────────────────┬───────────────────┘
                       │ JSON/WebSocket
                       │
    ┌──────────────────▼──────────────────┐
    │   Next.js Dashboard UI               │
    │  - Real-time alarm display           │
    │  - Device health monitoring          │
    │  - Interface status visualization    │
    │  - Historical trending               │
    │  - Alarm acknowledgment              │
    └──────────────────────────────────────┘
```

## Component Details

### 1. SNMP Polling Engine (`nms_service/snmp/`)

**Purpose**: Collect SNMP metrics from network devices

**Key Files**:
- `vendor_oids.py`: Vendor-agnostic OID mapping
- `vendor_oids.json`: OID configuration (JSON format for easy editing)
- `session.py`: SNMP session management & low-level operations
- `poller.py`: High-level polling orchestration

**Features**:
- Synchronous polling for simplicity (< 50 devices)
- Async-ready architecture for future scaling (> 50 devices)
- Support for SNMP v2c and v3
- Graceful handling of timeouts and unreachable devices
- Bulk walk support for efficiency
- Configurable per-device polling intervals

**Extensibility**:
- Add new vendor: Edit `vendor_oids.py` → OID mappings
- Add new OID: Update mapping → Automatically available across system
- No code changes needed for vendor additions

### 2. Vendor OID Manager (`nms_service/snmp/vendor_oids.py`)

**Purpose**: Centralized, vendor-independent OID mapping

**Supported Vendors**:
```python
GENERIC_OIDS      # RFC 1213, RFC 2863, RFC 2578 (standard MIBs)
CISCO_OIDS        # CISCO-PROCESS-MIB, CISCO-MEMORY-POOL-MIB, CISCO-ENVMON-MIB
FORTINET_OIDS     # FortiGate-specific OIDs
MIKROTIK_OIDS     # MikroTik RouterOS OIDs
```

**Adding New Vendor**:
```python
# In vendor_oids.py
NEWVENDOR_OIDS = {
    "1.3.6.1.4.1.xxxxx.1.1": OIDMapping(
        oid="1.3.6.1.4.1.xxxxx.1.1",
        name="vendor_cpu_usage",
        description="New Vendor CPU Usage",
        metric_type="gauge",
        unit="%",
        vendor="newvendor"
    ),
    # ... more OIDs
}

# Update __init__ to register:
self._register_oids(self.NEWVENDOR_OIDS)

# Update JSON export:
# nms_service/snmp/vendor_oids.json
```

### 3. Alarm Engine (`nms_service/alarm/__init__.py`)

**Purpose**: Evaluate metrics and generate alarms

**Alarm Types**:
```python
PORT_DOWN               # ifAdminStatus=up, ifOperStatus=down
DEVICE_UNREACHABLE      # SNMP timeout or connectivity lost
CPU_HIGH                # CPU usage > threshold
MEMORY_HIGH             # Memory usage > threshold
TEMPERATURE_HIGH        # Temperature > threshold
FAN_FAILURE            # Temperature or health sensor failure
DEVICE_REACHABLE       # Recovery alarm
PORT_UP                # Interface recovered
```

**Alarm Severity**:
- `critical`: Immediate attention needed
- `warning`: Non-critical, monitor situation
- `info`: Informational (recovery events)

**State Tracking**:
- Compares current metrics with previous state
- Detects state transitions (up→down, down→up)
- Generates alarms only on state change (no duplicates)
- Supports threshold-based alarms with configurable thresholds

**Extensibility**:
Add new alarm rule:
```python
def evaluate_custom_metric(self, metric):
    # Check against previous state
    # Generate alarm if threshold exceeded or state changed
    # Update state for next evaluation
    pass
```

### 4. Database Layer (`nms_service/database/`)

**Schema**:
```sql
devices                  # Network devices to monitor
alarms                   # Alarm records with history
interface_metrics        # Time-series interface data
device_health_metrics    # Time-series CPU/memory/temp
device_inventory         # Hardware/firmware information
```

**Repository Pattern**:
- `repository.py`: Data access layer
- `models.py`: SQLAlchemy ORM models

**Time-Series Design**:
- Metrics stored as individual rows (time-series format)
- Indexed by (device_id, collected_at) for efficient queries
- Supports retention policies via external tools
- Ready for TimescaleDB migration for massive scale

### 5. Orchestrator Service (`nms_service/orchestrator.py`)

**Purpose**: Coordinate all components and manage service lifecycle

**Workflow**:
```
1. Load device config from database
2. Initialize SNMP poller & register devices
3. Loop:
   a. Poll all interfaces (30s default)
   b. Poll device health (5min default)
   c. Evaluate metrics for alarms
   d. Store results in database
   e. Send to Node.js API
4. Graceful shutdown on signal
```

**Scalability Path**:
```
< 50 devices:    Single poller process (current)
50-500 devices:  Async poller with asyncio
500+ devices:    Distributed pollers with job queue
                 (e.g., Celery + Redis)
```

### 6. Configuration Management (`nms_service/core/config.py`)

**12-Factor App Principles**:
- All config via environment variables
- No hardcoded credentials
- Per-environment settings (.env files)

**Configuration Categories**:
```
Database        → DB_HOST, DB_PORT, DB_USER, DB_PASSWORD
SNMP            → SNMP_TIMEOUT, SNMP_RETRIES, MAX_CONCURRENT_POLLERS
Polling         → INTERFACE_POLL_INTERVAL, CPU_MEMORY_POLL_INTERVAL
Alarms          → CPU_THRESHOLD, MEMORY_THRESHOLD, TEMPERATURE_THRESHOLD
Backend API     → BACKEND_API_URL, API_TIMEOUT
```

### 7. REST API Integration (`nms_service/api/client.py`)

**HTTP Client**:
- Httpx library (async-capable, modern)
- Retry logic and timeout handling
- Health check endpoint

**API Endpoints**:
```
POST   /api/alarms                → Create alarm
GET    /api/alarms                → List alarms (with filters)
PATCH  /api/alarms/{id}/acknowledge → Acknowledge alarm
POST   /api/metrics               → Send metrics
GET    /api/health                → Backend health check
```

## Deployment Architecture

### Docker Compose (Development & Small Deployments)

```yaml
postgres      # PostgreSQL 15 (database)
  ↑
nms_service   # Python NMS (polling + alarms)
  ↓
backend       # Node.js API (existing)
  ↓
frontend      # Next.js UI (existing)
```

**Network**: `nms_network` bridge (isolated)

### Kubernetes (Enterprise Deployment)

```
┌──────────────────────────────────────────────────┐
│           Kubernetes Cluster                     │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │     NMS Service StatefulSet                │  │
│  │  - 1 controller (polling coordination)     │  │
│  │  - N workers (parallel SNMP polling)       │  │
│  │  - Distributed via Kubernetes Job Queue    │  │
│  └────────────────────────────────────────────┘  │
│           ↓                                       │
│  ┌────────────────────────────────────────────┐  │
│  │   PostgreSQL (CloudSQL/RDS recommended)    │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
```

## Data Flow Example: Port Down Alarm

```
1. SNMP Poller
   ├─ Walk ifTable on device
   ├─ Get Gi0/0/1: ifAdminStatus=up(1), ifOperStatus=down(2)
   └─ Create InterfaceMetric(is_port_down=true)

2. Alarm Engine
   ├─ Read previous state: is_port_down=false
   ├─ Compare: false → true (state change detected!)
   ├─ Generate Alarm(type=PORT_DOWN, severity=CRITICAL)
   └─ Update state: is_port_down=true

3. Database Repository
   ├─ INSERT alarm row
   └─ INSERT interface_metrics row

4. API Client
   ├─ POST /api/alarms (to Node.js backend)
   └─ POST /api/metrics

5. Next.js Dashboard
   ├─ WebSocket update from backend
   └─ Display red card: "Gi0/0/1 is down"

6. User Action
   ├─ Click "Acknowledge"
   └─ PATCH /api/alarms/{id}/acknowledge
```

## Performance Characteristics

### Polling Performance
- Interface polling: ~500ms per device (15 interfaces)
- Health polling: ~100ms per device
- Inventory polling: ~50ms per device

### Database Queries
- Alarms: O(1) insert, O(n) for queries
- Metrics: O(1) insert, O(n) for time-range queries
- Indexed by (device_id, timestamp) for efficiency

### Memory Usage
- < 50 devices: ~50-100 MB (Orchestrator + poller)
- Per-device: ~1-2 MB (state tracking)

### Network
- SNMP polling: ~1-2 KB per device poll
- API pushes: ~500B-1KB per metric batch

## Scaling Path

### Phase 1: Single Poller (Current)
- Synchronous polling
- 1-50 devices
- Single Python process
- Suitable for: SMB, branch offices, labs

### Phase 2: Async Poller
- Migrate to asyncio
- 50-200 devices
- Still single process
- ~20% performance improvement

### Phase 3: Distributed Polling
- Job queue (Celery + Redis)
- Multiple worker processes
- 200+ devices
- Horizontal scaling

### Phase 4: Multi-Tenant SaaS
- Separate database per customer
- Role-based access control (RBAC)
- Usage metering
- Custom OID mappings per tenant

## Security Considerations

### SNMP Credentials
- Store encrypted in database
- Use environment variables for bootstrap
- Rotate credentials regularly
- Support SNMP v3 with authentication

### Backend API
- Implement API key authentication
- HTTPS only (TLS 1.3+)
- Rate limiting
- Input validation

### Database
- Least privilege database user
- Network isolation (private VPC)
- Backup & recovery testing
- Audit logging

## Monitoring the Monitors

### NMS Service Health Checks
- Periodically verify database connectivity
- Health endpoint on API client
- Process restart on failure (systemd/Docker)
- Alerting for NMS service failures

### Operational Metrics
- Polling cycle duration
- Device reachability percentage
- Alarm generation rate
- Database insert performance

## API Payload Examples

### Alarm Creation
```json
{
  "device_id": 1,
  "device_name": "Router-Core-01",
  "type": "port_down",
  "severity": "critical",
  "message": "Port Gi0/0/1 (Uplink to ISP) is down",
  "metadata": {
    "interface_index": 1,
    "interface_name": "Gi0/0/1",
    "description": "Uplink to ISP",
    "admin_status": "up",
    "oper_status": "down"
  }
}
```

### Metrics Submission
```json
{
  "device_id": 1,
  "type": "health",
  "data": {
    "cpu_usage": 45.3,
    "memory_usage": 62.1,
    "temperature": 55.2,
    "uptime_seconds": 125489
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Future Enhancements

### Phase 1 (Q1)
- SNMP Trap listener (event-driven)
- NetFlow/sFlow support
- Device group management
- Custom alarm rules UI

### Phase 2 (Q2)
- Time-series optimization (TimescaleDB)
- Dashboard builder (custom views)
- Mobile app (React Native)
- SMS/Slack notifications

### Phase 3 (Q3)
- Machine learning anomaly detection
- Predictive alerting
- AI-powered root cause analysis
- Multi-vendor automatic discovery

## Contributing

To add support for a new vendor:

1. Identify OIDs in vendor MIB documentation
2. Add OID mappings to `vendor_oids.py`
3. Test with actual device (optional)
4. Update `vendor_oids.json` export
5. Document in ARCHITECTURE.md

No changes needed to core engine!

## References

- SNMP RFCs: RFC 1213, RFC 2863, RFC 3418
- Python SNMP: https://github.com/etingof/pysnmp
- Cisco MIBs: https://www.cisco.com/c/en/us/support/docs/ip/simple-network-management-protocol-snmp/
- MikroTik MIBs: https://wiki.mikrotik.com/wiki/Manual:SNMP
- FortiGate OIDs: https://docs.fortinet.com/document/fortigate/7.4.0/snmp-oid-reference/

## License

Same as parent Network Configuration Backup application
