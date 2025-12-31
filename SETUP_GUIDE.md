# NMS Service - Setup & Deployment Guide

## Quick Start (Docker Compose)

### Prerequisites
- Docker & Docker Compose 3.8+
- 2GB RAM minimum
- Network access to monitored devices (SNMP port 161 UDP)

### 1. Clone & Configure

```bash
# Create .env file with your settings
cp .env.example .env

# Edit with your values
nano .env  # or use your editor

# Key variables to set:
DB_PASSWORD=your_secure_password
BACKEND_API_URL=http://your-backend-api:3000
```

### 2. Initialize Database

```bash
# Start PostgreSQL first
docker-compose up -d postgres

# Wait for postgres to be ready (check logs)
docker-compose logs postgres

# The schema is auto-initialized from ./nms_service/sql/init_schema.sql
```

### 3. Start NMS Service

```bash
# Build and start
docker-compose up -d nms_service

# View logs
docker-compose logs -f nms_service

# Expected output:
# [2024-01-15 10:30:00] nms - INFO - NMS Orchestrator initialized
# [2024-01-15 10:30:00] nms - INFO - Registered 3 devices from database
# [2024-01-15 10:30:00] nms - INFO - Starting NMS service
```

### 4. Verify Operation

```bash
# Check service health
curl http://localhost:3000/api/health

# View collected alarms (via backend API)
curl http://localhost:3000/api/alarms

# Check logs
docker-compose logs nms_service

# Database queries
psql -h localhost -U nms_user -d nms_db

# Inside psql:
SELECT COUNT(*) FROM alarms;
SELECT COUNT(*) FROM interface_metrics;
```

## Local Development Setup

### Prerequisites
- Python 3.11+
- PostgreSQL 13+ (or Docker container)
- Virtual environment tool (venv, conda, etc.)

### 1. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
# Copy example config
cp .env.example .env

# Edit for development
cat > .env << EOF
NMS_ENV=development
NMS_LOG_LEVEL=DEBUG
NMS_DEBUG=true

DB_HOST=localhost
DB_PORT=5432
DB_USER=nms_user
DB_PASSWORD=dev_password
DB_NAME=nms_db

BACKEND_API_URL=http://localhost:3000
EOF
```

### 4. Start PostgreSQL (if not running)

```bash
# Option 1: Docker container
docker run -d \
  --name nms_postgres \
  -e POSTGRES_USER=nms_user \
  -e POSTGRES_PASSWORD=dev_password \
  -e POSTGRES_DB=nms_db \
  -p 5432:5432 \
  postgres:15-alpine

# Option 2: Local PostgreSQL
# Install via system package manager
# Create database: createdb -U postgres nms_db
```

### 5. Initialize Database Schema

```bash
psql -h localhost -U nms_user -d nms_db -f nms_service/sql/init_schema.sql
```

### 6. Run NMS Service

```bash
python -m nms_service.orchestrator
```

Or with auto-reload during development:

```bash
# Install watchdog
pip install watchdog

# Use watchmedo to auto-restart on file changes
watchmedo auto-restart -d nms_service -p '*.py' -- python -m nms_service.orchestrator
```

## Adding Devices to Monitor

### Via Database

```sql
-- Connect to database
psql -h localhost -U nms_user -d nms_db

-- Insert device
INSERT INTO devices (name, ip_address, vendor, community_string, snmp_version, snmp_port, enabled)
VALUES 
  ('Router-01', '192.168.1.1', 'cisco', 'public', '2c', 161, true),
  ('Firewall-01', '192.168.1.2', 'fortinet', 'public', '2c', 161, true),
  ('Switch-01', '192.168.1.3', 'generic', 'public', '2c', 161, true);

-- List devices
SELECT id, name, ip_address, vendor, enabled FROM devices;
```

### Via API (Future)

Once backend API is implemented:

```bash
POST http://backend:3000/api/devices
{
  "name": "Router-01",
  "ip_address": "192.168.1.1",
  "vendor": "cisco",
  "community_string": "public"
}
```

## Testing Alarm Generation

### Manual Test

```bash
# In Python:
python3 << 'EOF'
from nms_service.snmp.poller import SNMPPoller, DeviceConfig
from nms_service.alarm import AlarmEngine
from nms_service.core.models import InterfaceMetric

poller = SNMPPoller()
alarm_engine = AlarmEngine()

# Register a test device
config = DeviceConfig(
    device_id=1,
    device_name="Test-Router",
    ip_address="192.168.1.1",
    community_string="public",
    vendor="cisco"
)
poller.register_device(config)

# Poll interfaces
interfaces = poller.poll_interfaces(1)

# Evaluate for alarms
for iface in interfaces:
    alarms = alarm_engine.evaluate_interface_metric(iface)
    for alarm in alarms:
        print(f"Generated: {alarm}")

poller.close_all()
EOF
```

## Monitoring Health

### Service Health Checks

```bash
# Check process is running
ps aux | grep nms_service

# Check logs for errors
tail -f logs/nms.log | grep ERROR

# Monitor database size
psql -h localhost -U nms_user -d nms_db -c "
  SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

### Polling Metrics

```sql
-- Check latest metrics
SELECT device_id, COUNT(*) as metric_count, MAX(collected_at) as last_poll
FROM interface_metrics
GROUP BY device_id
ORDER BY last_poll DESC;

-- Active alarms count
SELECT severity, COUNT(*) as count
FROM alarms
WHERE resolved = false
GROUP BY severity;

-- Alarms per device
SELECT device_name, COUNT(*) as alarm_count
FROM alarms
WHERE resolved = false
GROUP BY device_name;
```

## Troubleshooting

### No Alarms Generated

```bash
# Check service logs
docker-compose logs nms_service

# Verify device reachability
snmpget -v 2c -c public 192.168.1.1 1.3.6.1.2.1.1.1.0

# Check database connectivity
python3 -c "from nms_service.database.models import db_manager; db_manager.init_db(); print('DB OK')"
```

### Device Unreachable

```bash
# Test SNMP connectivity
snmpget -v 2c -c public -t 5 192.168.1.1 1.3.6.1.2.1.1.3.0

# Check firewall rules
sudo iptables -L | grep 161

# Verify SNMP community string
# Check device configuration for correct community string
```

### Database Connection Errors

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Verify credentials
psql -h localhost -U nms_user -d nms_db -c "SELECT 1"

# Check connection string
python3 -c "from nms_service.core.config import config; print(config.database.connection_string)"
```

### High CPU Usage

```bash
# Check if polling is stuck
grep "Polling cycle" logs/nms.log | tail -5

# Reduce max concurrent pollers
# Edit .env: MAX_CONCURRENT_POLLERS=5

# Check for device timeouts
grep "timeout" logs/nms.log
```

## Performance Tuning

### Database Optimization

```sql
-- Analyze tables for query planner
ANALYZE;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Reindex if needed
REINDEX DATABASE nms_db;
```

### Polling Optimization

```bash
# Increase poll interval for health metrics
INTERFACE_POLL_INTERVAL=60      # Every 60 seconds
CPU_MEMORY_POLL_INTERVAL=600    # Every 10 minutes
INVENTORY_POLL_INTERVAL=7200    # Every 2 hours

# Reduce concurrent pollers if CPU is high
MAX_CONCURRENT_POLLERS=10
```

### Database Retention

```bash
# Delete alarms older than 30 days
DELETE FROM alarms WHERE created_at < CURRENT_DATE - INTERVAL '30 days';

# Archive old metrics
CREATE TABLE interface_metrics_archive AS
  SELECT * FROM interface_metrics 
  WHERE collected_at < CURRENT_DATE - INTERVAL '90 days';

DELETE FROM interface_metrics 
WHERE collected_at < CURRENT_DATE - INTERVAL '90 days';
```

## Backup & Recovery

### Database Backup

```bash
# Full database backup
docker-compose exec postgres pg_dump -U nms_user nms_db > backup.sql

# Or with compression
docker-compose exec postgres pg_dump -U nms_user nms_db | gzip > backup.sql.gz

# Restore from backup
gunzip < backup.sql.gz | psql -U nms_user -d nms_db
```

### Configuration Backup

```bash
# Backup environment variables
cp .env .env.backup

# Backup device list
psql -h localhost -U nms_user -d nms_db -c \
  "COPY devices TO STDOUT WITH CSV HEADER" > devices_backup.csv
```

## Upgrade Procedure

### Before Upgrade

```bash
# Backup database
docker-compose exec postgres pg_dump -U nms_user nms_db > backup_pre_upgrade.sql

# Backup configuration
cp .env .env.backup
```

### Perform Upgrade

```bash
# Stop service
docker-compose down

# Pull latest code
git pull origin main

# Rebuild image
docker-compose build --no-cache nms_service

# Start with new image
docker-compose up -d
```

### After Upgrade

```bash
# Check logs for errors
docker-compose logs -f nms_service

# Verify alarms are still generating
docker-compose exec postgres psql -U nms_user -d nms_db -c \
  "SELECT COUNT(*) FROM alarms WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '5 minutes';"
```

## Production Checklist

- [ ] Database password changed from default
- [ ] Backend API URL configured correctly
- [ ] SNMP credentials encrypted/stored securely
- [ ] Log rotation configured
- [ ] Database backups automated
- [ ] Monitoring alerts configured
- [ ] HTTPS enabled for API communication
- [ ] Network security groups configured
- [ ] Regular penetration testing planned
- [ ] Disaster recovery plan documented

## Support & Documentation

- Architecture: See [ARCHITECTURE.md](ARCHITECTURE.md)
- API Integration: See [docs/API_INTEGRATION.js](docs/API_INTEGRATION.js)
- UI Components: See [docs/UI_COMPONENTS.tsx](docs/UI_COMPONENTS.tsx)
- Vendor OID Reference: `nms_service/snmp/vendor_oids.json`

## Getting Help

```bash
# View service version
python3 -c "import nms_service; print(nms_service.__version__)"

# View configuration
python3 -c "from nms_service.core.config import config; print(config)"

# Test SNMP connectivity directly
python3 << 'EOF'
from nms_service.snmp.session import SNMPSession
session = SNMPSession(1, "test", "192.168.1.1", "public")
result = session.get("1.3.6.1.2.1.1.1.0")
print(f"System description: {result}")
EOF
```
