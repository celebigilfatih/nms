# NMS Project Structure

```
netconfigx/
│
├── README.md                          # Project overview
├── ARCHITECTURE.md                    # Detailed architecture & design decisions
├── SETUP_GUIDE.md                     # Deployment & operation guide
├── PROJECT_STRUCTURE.md               # This file
│
├── requirements.txt                   # Python dependencies
├── Dockerfile                         # Docker image definition
├── docker-compose.yml                 # Multi-container orchestration
├── .env.example                       # Configuration template
│
├── nms_service/                       # Main NMS Python service
│   │
│   ├── __init__.py                    # Package init
│   ├── orchestrator.py                # Main service orchestrator
│   │
│   ├── core/                          # Core components
│   │   ├── __init__.py
│   │   ├── models.py                  # Domain models (Alarm, InterfaceMetric, etc.)
│   │   ├── config.py                  # Configuration management (12-factor)
│   │   └── logger.py                  # Logging setup
│   │
│   ├── snmp/                          # SNMP operations
│   │   ├── __init__.py
│   │   ├── vendor_oids.py             # Vendor OID mappings (generic, Cisco, Fortinet, MikroTik)
│   │   ├── vendor_oids.json           # OID configuration (JSON format)
│   │   ├── session.py                 # SNMP session management
│   │   └── poller.py                  # Polling engine
│   │
│   ├── alarm/                         # Alarm generation & evaluation
│   │   └── __init__.py                # AlarmEngine - state tracking & rule evaluation
│   │
│   ├── database/                      # Database layer
│   │   ├── __init__.py
│   │   ├── models.py                  # SQLAlchemy ORM models
│   │   └── repository.py              # Data access objects (AlarmRepository, etc.)
│   │
│   ├── api/                           # Backend API integration
│   │   ├── __init__.py
│   │   └── client.py                  # HTTP client for Node.js backend
│   │
│   └── sql/                           # Database schemas & migrations
│       └── init_schema.sql            # PostgreSQL schema initialization
│
├── docs/                              # Documentation & examples
│   ├── API_INTEGRATION.js             # Node.js backend API endpoint examples
│   ├── UI_COMPONENTS.tsx              # Next.js React component examples
│   └── VENDOR_REFERENCE.md            # Vendor-specific OID reference
│
└── logs/                              # Application logs (created at runtime)
    └── nms.log                        # Main service log (rotating)
```

## File Descriptions

### Core Application Files

| File | Purpose |
|------|---------|
| `orchestrator.py` | Main service entry point; coordinates polling, alarms, and storage |
| `requirements.txt` | Python package dependencies (pysnmp, sqlalchemy, httpx, etc.) |
| `Dockerfile` | Docker image for containerized deployment |
| `docker-compose.yml` | Multi-container setup (PostgreSQL + NMS service) |

### Core Module (`nms_service/core/`)

| File | Purpose |
|------|---------|
| `models.py` | Data classes for alarms, metrics, inventory (Dataclasses) |
| `config.py` | Configuration management via environment variables |
| `logger.py` | Logging setup with file rotation and console output |

### SNMP Module (`nms_service/snmp/`)

| File | Purpose | Key Classes |
|------|---------|------------|
| `vendor_oids.py` | OID mapping for all vendors | `VendorOIDManager`, `OIDMapping` |
| `vendor_oids.json` | JSON export of OID mappings (human-readable) | - |
| `session.py` | Low-level SNMP operations | `SNMPSession`, `SNMPError` |
| `poller.py` | High-level polling orchestration | `SNMPPoller`, `DeviceConfig` |

### Alarm Module (`nms_service/alarm/`)

| File | Purpose | Key Classes |
|------|---------|------------|
| `__init__.py` | Alarm evaluation and state tracking | `AlarmEngine`, `AlarmRule` |

### Database Module (`nms_service/database/`)

| File | Purpose | Key Classes |
|------|---------|------------|
| `models.py` | SQLAlchemy ORM models | `Device`, `Alarm`, `InterfaceMetric`, `DeviceHealthMetric`, `DeviceInventory` |
| `repository.py` | Data access layer (Repository pattern) | `AlarmRepository`, `DeviceRepository`, `MetricsRepository` |

### API Module (`nms_service/api/`)

| File | Purpose | Key Classes |
|------|---------|------------|
| `client.py` | HTTP client for Node.js backend integration | `APIClient` |

### Documentation (`docs/`)

| File | Purpose |
|------|---------|
| `API_INTEGRATION.js` | Example Express.js endpoints for receiving alarms/metrics |
| `UI_COMPONENTS.tsx` | Example React components for alarm display |
| `VENDOR_REFERENCE.md` | OID reference for each vendor (if needed) |

## Data Flow Architecture

```
                    SNMP Devices
                       (5 min)
                          ↓
                ┌─────────────────────┐
                │   SNMP Poller       │
                │  (session.py)       │
                └──────────┬──────────┘
                           ↓
        ┌──────────────────────────────────────┐
        │  Vendor OID Manager                  │
        │  (vendor_oids.py)                    │
        │  - Normalize metrics                 │
        │  - Multi-vendor support              │
        └──────────────────┬───────────────────┘
                           ↓
        ┌──────────────────────────────────────┐
        │  Alarm Engine                        │
        │  (alarm/__init__.py)                 │
        │  - Compare with previous state       │
        │  - Generate alarms if state changed  │
        │  - Evaluate thresholds               │
        └──────────────────┬───────────────────┘
                           ↓
        ┌──────────────────────────────────────┐
        │  Database Repository Layer           │
        │  (database/repository.py)            │
        │  - Store alarms                      │
        │  - Store metrics                     │
        └──────────────────┬───────────────────┘
                           ↓
        ┌──────────────────────────────────────┐
        │  PostgreSQL Database                 │
        │  - alarms table                      │
        │  - metrics tables                    │
        │  - devices table                     │
        └─────────────────────────────────────┘
                           ↓
        ┌──────────────────────────────────────┐
        │  API Client                          │
        │  (api/client.py)                     │
        │  - POST alarms to backend            │
        │  - POST metrics to backend           │
        └──────────────────┬───────────────────┘
                           ↓
        ┌──────────────────────────────────────┐
        │  Node.js Backend API                 │
        │  (existing)                          │
        │  - /api/alarms                       │
        │  - /api/metrics                      │
        └──────────────────┬───────────────────┘
                           ↓
        ┌──────────────────────────────────────┐
        │  Next.js Dashboard UI                │
        │  (existing)                          │
        │  - Displays alarms                   │
        │  - Shows metrics                     │
        │  - Allows acknowledgment             │
        └──────────────────────────────────────┘
```

## Configuration Hierarchy

```
Defaults (hardcoded)
    ↓
Environment Variables (.env file)
    ↓
Runtime Config (config.py)
```

Example:
```
# 1. Hardcoded default
SNMP_TIMEOUT = 5  # seconds

# 2. Environment variable
export SNMP_TIMEOUT=10

# 3. Runtime access
from nms_service.core.config import config
timeout = config.snmp.snmp_timeout  # Returns 10
```

## Adding Support for New Vendor

### Step 1: Update Vendor OID Mapping

Edit `nms_service/snmp/vendor_oids.py`:

```python
# Add NEWVENDOR_OIDS dictionary
NEWVENDOR_OIDS = {
    "1.3.6.1.4.1.xxxxx.1.1": OIDMapping(
        oid="1.3.6.1.4.1.xxxxx.1.1",
        name="vendor_metric_name",
        description="Description",
        metric_type="gauge",
        unit="%",
        vendor="newvendor"
    ),
    # ... more OIDs
}

# Update __init__ method:
def __init__(self):
    # ... existing code
    self._register_oids(self.NEWVENDOR_OIDS)  # Add this line
```

### Step 2: Update Poller (if needed)

Edit `nms_service/snmp/poller.py` if vendor requires special handling:

```python
def poll_device_health(self, device_id, vendor):
    # ... existing code
    elif vendor.lower() == "newvendor":
        cpu_oid = "1.3.6.1.4.1.xxxxx.1.1"
        # ... fetch and convert metrics
```

### Step 3: Export JSON

```bash
python3 << 'EOF'
from nms_service.snmp.vendor_oids import oid_manager
from pathlib import Path
oid_manager.to_json(Path("nms_service/snmp/vendor_oids.json"))
EOF
```

That's it! No other changes needed.

## Testing the System

### Unit Test Example

```python
# Test alarm generation
from nms_service.alarm import AlarmEngine
from nms_service.core.models import InterfaceMetric

engine = AlarmEngine()
metric = InterfaceMetric(
    device_id=1,
    interface_index=1,
    interface_name="Gi0/0/1",
    description="Test",
    admin_status="up",
    oper_status="down",
    speed=1000000000,
    in_octets=0,
    out_octets=0
)

alarms = engine.evaluate_interface_metric(metric)
assert len(alarms) == 1
assert alarms[0].type == AlarmType.PORT_DOWN
```

### Integration Test Example

```bash
# Start service
docker-compose up -d

# Wait for initialization
sleep 5

# Check logs
docker-compose logs nms_service

# Query alarms
psql -h localhost -U nms_user -d nms_db -c "SELECT COUNT(*) FROM alarms;"

# Stop service
docker-compose down
```

## Performance Tuning Guide

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for performance optimization tips.

## Security Checklist

- [ ] Database password is strong and unique
- [ ] SNMP credentials are stored securely
- [ ] No hardcoded credentials in code
- [ ] All external API communication is HTTPS
- [ ] Database backups are encrypted
- [ ] Network access is restricted (firewall rules)
- [ ] Regular security audits planned

## Version History

- **1.0.0** - Initial release
  - SNMP v2c/v3 support
  - Cisco, Fortinet, MikroTik, Generic OID support
  - Alarm engine with state tracking
  - PostgreSQL persistence
  - Docker deployment

## Next Steps for Implementation

1. **Extend to SNMP Trap Support**
   - Add `nms_service/snmp/trap_receiver.py`
   - Event-driven alarming vs. polling

2. **Async Scaling**
   - Replace sync poller with asyncio
   - Support 50-200 devices in single process

3. **Distributed Polling**
   - Job queue (Celery + Redis)
   - Multiple worker processes
   - Support 200+ devices

4. **Multi-Tenant SaaS**
   - Separate databases per customer
   - RBAC implementation
   - Usage metering

5. **Advanced Features**
   - NetFlow/sFlow analytics
   - ML-based anomaly detection
   - Predictive alerting
   - Custom rule engine

---

**Ready to Deploy?** See [SETUP_GUIDE.md](SETUP_GUIDE.md)

**Want to Understand the Design?** See [ARCHITECTURE.md](ARCHITECTURE.md)
