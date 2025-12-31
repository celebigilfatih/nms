# NMS Quick Reference Guide

## 🚀 Get Running in 5 Minutes

```bash
# 1. Clone and prepare
cd netconfigx
cp .env.example .env

# 2. Edit .env with your values
nano .env
# Change: DB_PASSWORD, BACKEND_API_URL

# 3. Start services
docker-compose up -d

# 4. Add devices
psql -h localhost -U nms_user -d nms_db << EOF
INSERT INTO devices (name, ip_address, vendor, community_string, enabled)
VALUES ('Router-01', '192.168.1.1', 'cisco', 'public', true);
EOF

# 5. Verify (wait 30-60 seconds)
docker-compose logs nms_service | grep "Registered"
```

## 📊 Common Commands

### View Alarms
```bash
psql -U nms_user -d nms_db -c "SELECT type, severity, message FROM alarms WHERE resolved=false LIMIT 10;"
```

### List Devices
```bash
psql -U nms_user -d nms_db -c "SELECT id, name, ip_address, vendor FROM devices WHERE enabled=true;"
```

### Add Device
```bash
psql -U nms_user -d nms_db << EOF
INSERT INTO devices (name, ip_address, vendor, community_string, snmp_version, snmp_port, enabled)
VALUES ('Device-Name', '192.168.x.x', 'cisco', 'public', '2c', 161, true);
EOF
```

### Check Service Health
```bash
# View logs
docker-compose logs -f nms_service

# Check process
docker-compose ps

# Test database
psql -h localhost -U nms_user -d nms_db -c "SELECT 1"
```

### Restart Service
```bash
docker-compose restart nms_service
```

### Stop All Services
```bash
docker-compose down
```

## 🔧 Configuration Quick Map

| Setting | File | Default | Purpose |
|---------|------|---------|---------|
| Database Host | `.env` | localhost | PostgreSQL server |
| DB Password | `.env` | (required) | PostgreSQL auth |
| Log Level | `.env` | INFO | Logging verbosity |
| Poll Interval | `.env` | 30s | How often to check devices |
| CPU Threshold | `.env` | 80% | Alarm trigger level |
| Memory Threshold | `.env` | 80% | Alarm trigger level |
| Temp Threshold | `.env` | 80°C | Alarm trigger level |
| Backend API URL | `.env` | http://localhost:3000 | Where to send alarms |

## 📝 Adding New Vendor

**Example: Add Juniper support**

1. Edit `nms_service/snmp/vendor_oids.py`:
```python
JUNIPER_OIDS = {
    "1.3.6.1.4.1.2636.3.1.13.1.5": OIDMapping(
        oid="1.3.6.1.4.1.2636.3.1.13.1.5",
        name="jnxOperatingCPU",
        description="Juniper CPU usage",
        metric_type="gauge",
        unit="%",
        vendor="juniper"
    ),
    # ... more OIDs
}
```

2. Update `__init__`:
```python
def __init__(self):
    # ... existing code
    self._register_oids(self.JUNIPER_OIDS)
```

3. Export JSON:
```bash
python3 << 'EOF'
from nms_service.snmp.vendor_oids import oid_manager
oid_manager.to_json("nms_service/snmp/vendor_oids.json")
EOF
```

4. Test:
```python
from nms_service.snmp.vendor_oids import oid_manager
mapping = oid_manager.get_mapping_by_name("jnxOperatingCPU")
print(f"Found: {mapping}")
```

**That's it! No other code changes needed.**

## 🆘 Troubleshooting Quick Fix

### Service Not Starting?
```bash
# Check logs
docker-compose logs nms_service

# Check database connection
python3 -c "from nms_service.core.config import config; print(config.database.connection_string)"

# Start PostgreSQL separately
docker-compose up postgres
```

### No Alarms Generated?
```bash
# Check device reachability
snmpget -v 2c -c public 192.168.1.1 1.3.6.1.2.1.1.1.0

# Check if device is enabled
psql -U nms_user -d nms_db -c "SELECT * FROM devices;"

# Check logs for errors
docker-compose logs nms_service | grep ERROR
```

### Database Full?
```bash
# Archive old alarms (keep 30 days)
psql -U nms_user -d nms_db << EOF
DELETE FROM alarms WHERE created_at < CURRENT_DATE - INTERVAL '30 days';
DELETE FROM interface_metrics WHERE collected_at < CURRENT_DATE - INTERVAL '90 days';
EOF

# Vacuum database
psql -U nms_user -d nms_db -c "VACUUM ANALYZE;"
```

### High CPU Usage?
```bash
# Reduce concurrent polling
nano .env
# Change: MAX_CONCURRENT_POLLERS=10

# Increase polling intervals
# Change: INTERFACE_POLL_INTERVAL=60

# Restart
docker-compose restart nms_service
```

## 🎯 Key Concepts

### Alarm Types
- **port_down**: Interface should be up but is down
- **device_unreachable**: Device not responding
- **cpu_high**: CPU exceeds threshold
- **memory_high**: Memory exceeds threshold
- **temperature_high**: Temperature exceeds threshold

### Severity Levels
- **critical**: Requires immediate action
- **warning**: Monitor situation
- **info**: Informational (recovery events)

### Polling Intervals
- **Interface**: Every 30 seconds
- **Health**: Every 5 minutes
- **Inventory**: Every 1 hour

### Supported Vendors
- `generic` - Standard SNMP (RFC)
- `cisco` - Cisco IOS/IOS-XE
- `fortinet` - FortiGate firewalls
- `mikrotik` - MikroTik RouterOS

## 📈 Performance Notes

| Scale | Approach | Performance |
|-------|----------|-------------|
| < 50 | Single sync poller | ~2-3 sec/cycle ✅ |
| 50-200 | Async poller (phase 2) | ~5-10 sec/cycle |
| 200+ | Distributed (phase 3) | Linear scaling |

## 🔐 Security Checklist

- [ ] Change DB_PASSWORD in .env (production)
- [ ] Use HTTPS for API communication
- [ ] Restrict SNMP network access (firewall)
- [ ] Regular database backups
- [ ] Rotate SNMP community strings
- [ ] Don't commit .env to git

## 📚 Documentation Quick Links

| Document | For |
|----------|-----|
| README.md | Overview & features |
| ARCHITECTURE.md | Design & scaling |
| SETUP_GUIDE.md | Operations & troubleshooting |
| PROJECT_STRUCTURE.md | Code organization |
| DELIVERY_SUMMARY.md | What was built |
| This file | Quick reference |

## 💡 Pro Tips

### 1. Backup Before Upgrade
```bash
docker-compose exec postgres pg_dump -U nms_user nms_db > backup.sql
```

### 2. Monitor Service Health
```bash
# Watch logs in real-time
docker-compose logs -f nms_service

# Check metrics every 10 seconds
watch -n 10 'psql -U nms_user -d nms_db -c "SELECT COUNT(*) FROM alarms;"'
```

### 3. Export Alarms to CSV
```bash
psql -U nms_user -d nms_db -c "COPY (SELECT * FROM alarms) TO STDOUT WITH CSV HEADER" > alarms.csv
```

### 4. Test SNMP Without NMS
```bash
# Install snmp-tools
apt-get install snmp

# Test device
snmpget -v 2c -c public 192.168.1.1 1.3.6.1.2.1.1.1.0
```

### 5. Debug Polling
```bash
# Enable debug logging
nano .env
# Change: NMS_LOG_LEVEL=DEBUG

# Restart
docker-compose restart nms_service

# View detailed logs
docker-compose logs nms_service | grep "DEBUG"
```

## 🚨 Emergency Commands

### Kill Stuck Poller
```bash
docker-compose restart nms_service
```

### Reset Database
```bash
docker-compose down -v
docker-compose up -d postgres
# Wait for postgres to start
psql -h localhost -U nms_user -d nms_db -f nms_service/sql/init_schema.sql
docker-compose up -d nms_service
```

### View Real-time Alarms
```bash
# Watch for new alarms every 5 seconds
watch -n 5 'psql -U nms_user -d nms_db -c "SELECT COUNT(*) as unresolved FROM alarms WHERE resolved=false;"'
```

### Check Polling is Running
```bash
docker-compose logs nms_service | grep "Polling cycle" | tail -5
```

## 📞 When Things Go Wrong

1. **Check logs first**: `docker-compose logs nms_service`
2. **Test connectivity**: `snmpget -v 2c -c public <ip> 1.3.6.1.2.1.1.1.0`
3. **Verify database**: `psql -U nms_user -d nms_db -c "SELECT 1"`
4. **Review configuration**: `nano .env` and `.env.example`
5. **Consult SETUP_GUIDE.md** troubleshooting section

---

**Keep this nearby for quick reference!**
