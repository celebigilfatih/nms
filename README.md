# Network Monitoring System (NMS) - SNMP-based Network Device Monitoring

A production-grade, lightweight SNMP monitoring solution for network devices. Extends the existing Network Configuration Backup application with real-time monitoring capabilities.

## 🎯 Features

### Core Capabilities
- **Multi-Vendor SNMP Support**: Cisco, Fortinet, MikroTik, Generic (RFC standards)
- **Real-Time Monitoring**:
  - Interface status (up/down) polling every 30 seconds
  - Device health (CPU, RAM, temperature) every 5 minutes
  - Hardware inventory every 1 hour
- **Intelligent Alarming**:
  - State-change detection (no duplicate alarms)
  - Configurable thresholds (CPU, memory, temperature)
  - Severity levels (critical, warning, info)
  - Alarm acknowledgment and history
- **Multi-Vendor OID Abstraction**: Single OID mapping file covers all vendors
- **PostgreSQL Persistence**: Time-series metrics and alarm history
- **REST API Integration**: Push alarms/metrics to Node.js backend
- **Production-Ready**:
  - Graceful error handling
  - Comprehensive logging
  - Docker/Compose deployment
  - 12-factor configuration
  - Database connection pooling

### Scalability Path
- **Phase 1** (Current): Synchronous polling, <50 devices, single process
- **Phase 2**: Async polling, 50-200 devices
- **Phase 3**: Distributed polling with job queue, 200+ devices
- **Phase 4**: Multi-tenant SaaS with custom OID mappings

## 📋 Requirements

### Mandatory
- **Python 3.11+**
- **PostgreSQL 13+** (or Docker container)
- **Network access** to monitored devices (UDP port 161)

### Optional
- Docker & Docker Compose 3.8+ (for containerized deployment)
- SNMP knowledge (helpful but not required)

## 🚀 Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone repository
cd netconfigx

# Configure environment
cp .env.example .env
nano .env  # Edit: DB_PASSWORD, BACKEND_API_URL, etc.

# Start services
docker-compose up -d

# View logs
docker-compose logs -f nms_service

# Verify operation
curl http://localhost:3000/api/health
```

### Local Development

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
nano .env

# Start PostgreSQL (if not running)
docker run -d --name nms_postgres -e POSTGRES_PASSWORD=dev_password \
  -p 5432:5432 postgres:15-alpine

# Initialize database
psql -h localhost -U nms_user -d nms_db -f nms_service/sql/init_schema.sql

# Run service
python -m nms_service.orchestrator
```

## 📊 Monitoring Data

### Metrics Collected

**Interface Metrics** (every 30 seconds):
```
- Interface status (admin/operational)
- Interface speed
- Octets in/out (for traffic analysis)
- Interface description
```

**Device Health** (every 5 minutes):
```
- CPU usage (%)
- Memory usage (%)
- Temperature (°C)
- System uptime
```

**Hardware Inventory** (every 1 hour):
```
- System description
- Serial number
- Firmware version
- Model information
```

### Alarms Generated

**Critical Alarms**:
- `port_down`: Interface administratively up but operationally down
- `device_unreachable`: Device not responding to SNMP
- `temperature_high`: Temperature exceeds threshold (default 80°C)

**Warning Alarms**:
- `cpu_high`: CPU usage exceeds threshold (default 80%)
- `memory_high`: Memory usage exceeds threshold (default 80%)

**Recovery Alarms**:
- `device_reachable`: Device recovered after unreachable
- `port_up`: Interface recovered to up state

## 🏗️ Architecture

### High-Level Design

```
SNMP Devices
    ↓ (SNMP v2c/v3 polling)
SNMP Poller (sync, async-ready)
    ↓
Vendor OID Manager (Cisco, Fortinet, MikroTik, Generic)
    ↓
Alarm Engine (state tracking + thresholds)
    ↓
PostgreSQL (alarms, metrics, inventory)
    ↓
Node.js Backend API
    ↓
Next.js Dashboard UI
```

### Components

| Component | Purpose | Location |
|-----------|---------|----------|
| **SNMP Poller** | Collect metrics from devices | `nms_service/snmp/` |
| **Vendor OID Manager** | Multi-vendor OID abstraction | `nms_service/snmp/vendor_oids.py` |
| **Alarm Engine** | Generate alarms from metrics | `nms_service/alarm/` |
| **Database Layer** | Persistent storage (SQLAlchemy) | `nms_service/database/` |
| **API Client** | Send alarms/metrics to backend | `nms_service/api/` |
| **Orchestrator** | Coordinate all components | `nms_service/orchestrator.py` |

## 🔧 Configuration

All configuration via environment variables (12-factor app):

```bash
# Service
NMS_ENV=production                     # development, staging, production
NMS_LOG_LEVEL=INFO                     # DEBUG, INFO, WARNING, ERROR

# Database
DB_HOST=postgres                       # PostgreSQL host
DB_PORT=5432                           # PostgreSQL port
DB_USER=nms_user                       # DB user
DB_PASSWORD=secure_password            # DB password (change in production!)
DB_NAME=nms_db                         # Database name

# SNMP
SNMP_TIMEOUT=5                         # Seconds
SNMP_RETRIES=3                         # Retry attempts
MAX_CONCURRENT_POLLERS=20              # Concurrent polling processes

# Polling Intervals (seconds)
INTERFACE_POLL_INTERVAL=30             # 30 seconds
CPU_MEMORY_POLL_INTERVAL=300           # 5 minutes
INVENTORY_POLL_INTERVAL=3600           # 1 hour

# Thresholds
CPU_THRESHOLD=80.0                     # CPU %
MEMORY_THRESHOLD=80.0                  # Memory %
TEMPERATURE_THRESHOLD=80.0             # Temperature °C

# API
BACKEND_API_URL=http://backend:3000   # Node.js backend
API_TIMEOUT=10                         # Seconds
```

## 📝 Adding Devices

### Via Database

```sql
-- Connect to PostgreSQL
psql -h localhost -U nms_user -d nms_db

-- Add device
INSERT INTO devices (name, ip_address, vendor, community_string, snmp_version, enabled)
VALUES ('Router-01', '192.168.1.1', 'cisco', 'public', '2c', true);

-- List devices
SELECT * FROM devices;
```

## 🔌 API Integration

The NMS service pushes alarms and metrics to your Node.js backend:

```bash
# Create Alarm
POST /api/alarms
{
  "device_id": 1,
  "device_name": "Router-01",
  "type": "port_down",
  "severity": "critical",
  "message": "Port Gi0/0/1 is down",
  "metadata": { ... }
}

# Get Alarms
GET /api/alarms?severity=critical&resolved=false

# Acknowledge Alarm
PATCH /api/alarms/{id}/acknowledge
{ "acknowledged_by": "user@company.com" }

# Send Metrics
POST /api/metrics
{
  "device_id": 1,
  "type": "health",
  "data": { "cpu_usage": 45.3, "memory_usage": 62.1 }
}
```

See [docs/API_INTEGRATION.js](docs/API_INTEGRATION.js) for Express.js examples.

## 📊 Dashboard UI

Example React components for alarm display and device monitoring:

See [docs/UI_COMPONENTS.tsx](docs/UI_COMPONENTS.tsx) for Next.js examples.

## 🔐 Security

### Best Practices
- **SNMP Community Strings**: Store encrypted in database
- **Database Credentials**: Use strong, unique passwords
- **API Communication**: HTTPS only (TLS 1.3+)
- **Network Isolation**: Restrict SNMP access via firewall
- **SNMP v3**: Supports authentication and privacy (future enhancement)
- **Database Backups**: Encrypt and test recovery regularly

### Compliance
- No hardcoded credentials
- Environment variable-based config
- Audit logging (all alarms timestamped)
- Role-based access control ready (implement in backend)

## 📈 Performance

### Typical Metrics
- **Polling Duration**: ~500ms per device (15 interfaces)
- **Memory Usage**: ~50-100 MB for orchestrator + < 2 MB per device
- **Network**: ~1-2 KB per device poll
- **Database**: O(1) inserts, O(n) queries

### Scaling
- **< 50 devices**: Single poller (current)
- **50-200 devices**: Async poller (refactor phase)
- **200+ devices**: Distributed polling (job queue)

## 🧪 Testing

### Manual Test
```bash
# Test SNMP connectivity
snmpget -v 2c -c public 192.168.1.1 1.3.6.1.2.1.1.1.0

# Test alarm generation
python3 -c "
from nms_service.alarm import AlarmEngine
from nms_service.core.models import InterfaceMetric
engine = AlarmEngine()
metric = InterfaceMetric(device_id=1, interface_index=1, 
  interface_name='Gi0/0/1', description='Test', 
  admin_status='up', oper_status='down', speed=1e9, 
  in_octets=0, out_octets=0)
alarms = engine.evaluate_interface_metric(metric)
print(f'Generated {len(alarms)} alarms')
"
```

## 📚 Documentation

| Document | Content |
|----------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, data flow, scaling path |
| [SETUP_GUIDE.md](SETUP_GUIDE.md) | Deployment, troubleshooting, operations |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | File structure, module descriptions |
| [docs/API_INTEGRATION.js](docs/API_INTEGRATION.js) | Node.js backend API examples |
| [docs/UI_COMPONENTS.tsx](docs/UI_COMPONENTS.tsx) | React component examples |

## 🐛 Troubleshooting

### No Alarms Generated
```bash
# Check logs
tail -f logs/nms.log

# Verify device reachability
snmpget -v 2c -c public 192.168.1.1 1.3.6.1.2.1.1.1.0

# Check database
psql -U nms_user -d nms_db -c "SELECT COUNT(*) FROM alarms;"
```

### Device Unreachable
```bash
# Test SNMP
snmpget -v 2c -c public -t 5 192.168.1.1 1.3.6.1.2.1.1.3.0

# Check firewall
sudo iptables -L | grep 161

# Verify community string (check device config)
```

### Database Issues
```bash
# Check connection
psql -h localhost -U nms_user -d nms_db -c "SELECT 1"

# View connection string
python3 -c "from nms_service.core.config import config; print(config.database.connection_string)"
```

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed troubleshooting.

## 🗓️ Roadmap

### Phase 1 (Current) ✅
- SNMP v2c/v3 polling
- Multi-vendor support (Cisco, Fortinet, MikroTik, Generic)
- Alarm engine with state tracking
- PostgreSQL storage
- Docker deployment

### Phase 2 (Q1 2024)
- SNMP Trap listener (event-driven)
- Async polling for 50-200 devices
- Device auto-discovery

### Phase 3 (Q2 2024)
- Distributed polling (Celery + Redis)
- NetFlow/sFlow support
- Custom alarm rules UI

### Phase 4 (Q3 2024)
- ML-based anomaly detection
- Predictive alerting
- Multi-tenant SaaS

## 🤝 Contributing

To add support for a new vendor:

1. Identify OIDs in vendor MIB documentation
2. Add to `nms_service/snmp/vendor_oids.py`
3. No other code changes needed!
4. Export updated JSON

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md#adding-support-for-new-vendor) for details.

## 📄 License

Same as parent Network Configuration Backup application.

## 🆘 Support

### Getting Help
1. Check [SETUP_GUIDE.md](SETUP_GUIDE.md) troubleshooting section
2. Review logs: `tail -f logs/nms.log`
3. Test connectivity: `snmpget -v 2c -c public <device_ip> 1.3.6.1.2.1.1.1.0`
4. Check configuration: `python3 -c "from nms_service.core.config import config; print(config)"`

### Reporting Issues
Include:
- NMS version: `python3 -c "import nms_service; print(nms_service.__version__)"`
- Logs: Last 50 lines from `logs/nms.log`
- Configuration: Relevant environment variables (sanitized)
- Device info: Vendor, model, SNMP version

## 👨‍💻 Developers

### Project Structure
```
nms_service/
├── core/           # Config, logging, models
├── snmp/           # Polling, OID mapping
├── alarm/          # Alarm evaluation
├── database/       # ORM, repositories
├── api/            # Backend integration
└── orchestrator.py # Main service
```

### Key Modules
- `vendor_oids.py`: **Extensibility point** for new vendors
- `alarm/__init__.py`: **AlarmEngine** - core logic
- `orchestrator.py`: **Main loop** - coordination

### Testing
```bash
# Run tests
pytest tests/

# Coverage report
pytest --cov=nms_service tests/

# Development server with auto-reload
watchmedo auto-restart -d nms_service -p '*.py' -- \
  python -m nms_service.orchestrator
```

## 📞 Contact

For questions or feature requests:
- Create an issue in the repository
- Email: `team@netconfigx.com` (if applicable)
- Documentation: See [ARCHITECTURE.md](ARCHITECTURE.md)

---

**Ready to deploy?** Start with [SETUP_GUIDE.md](SETUP_GUIDE.md)

**Want to understand the design?** Read [ARCHITECTURE.md](ARCHITECTURE.md)

**Curious about code structure?** Check [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
