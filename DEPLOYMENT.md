# NMS (Network Monitoring System) - Production Deployment Guide

## Overview

This is a complete Network Monitoring System built with:
- **Frontend**: HTML5, Tailwind CSS, JavaScript (15 pages, 3400+ lines)
- **Backend**: Node.js/Express, PostgreSQL, SNMP polling
- **Real-time**: WebSocket for live updates
- **Docker**: Containerized for easy deployment

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Port 3000)                      │
│  15 HTML Pages + 11 JS Modules (Dashboard, Devices, Alarms)  │
│  • Responsive Dark UI with Glassmorphism                     │
│  • Real-time WebSocket updates                              │
│  • Full CRUD operations                                     │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/WebSocket
┌────────────────────┴────────────────────────────────────────┐
│              Backend API (Port 3001)                         │
│  20+ RESTful Endpoints                                      │
│  • Device Management                                        │
│  • Alarm Generation & Processing                           │
│  • Metrics Collection                                      │
│  • Settings Management                                     │
│  • Authentication                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
     ┌───────────────┼───────────────┐
     │               │               │
┌────▼─────┐  ┌──────▼──────┐  ┌───▼──────┐
│PostgreSQL │  │SNMP Polling │  │WebSocket │
│  (5432)   │  │  Service    │  │  Server  │
└───────────┘  └─────────────┘  └──────────┘
```

---

## Prerequisites

- **Docker** 20.10+
- **Docker Compose** 2.0+
- **PostgreSQL** 12+ (if running without Docker)
- **Node.js** 16+ (if running without Docker)

---

## Quick Start (Docker)

### 1. Clone and Setup

```bash
cd netconfigx
```

### 2. Configure Environment

Create `.env` file (optional, defaults are provided):

```env
# Database
DB_USER=nms_user
DB_PASSWORD=nms_password
DB_HOST=postgres
DB_PORT=5432
DB_NAME=nms_db

# API Server
API_PORT=3001
API_HOST=0.0.0.0
NODE_ENV=production

# Frontend
FRONTEND_PORT=3000

# SNMP
SNMP_TIMEOUT=5000
SNMP_RETRIES=3
POLLING_INTERVAL=300000
```

### 3. Start Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 4. Access Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001/api
- **WebSocket**: ws://localhost:3000/ws

---

## Default Credentials

```
Email: admin@nms.local
Password: admin123
Role: Administrator
```

---

## Testing Checklist

### Frontend Testing

- [ ] **Login Page**
  - [ ] Login with valid credentials
  - [ ] Error message on invalid credentials
  - [ ] Redirect to dashboard on success
  - [ ] Session persistence on page reload

- [ ] **Dashboard**
  - [ ] Display device list
  - [ ] Show system metrics
  - [ ] Update in real-time (WebSocket)
  - [ ] Display recent alarms

- [ ] **Devices Page**
  - [ ] List all devices
  - [ ] Search by name/IP
  - [ ] Filter by vendor/status
  - [ ] Sort by columns
  - [ ] Export to CSV

- [ ] **Add Device**
  - [ ] Form validation
  - [ ] SNMP connection test
  - [ ] Error messages
  - [ ] Success notification

- [ ] **Device Details**
  - [ ] Load device information
  - [ ] Display metrics
  - [ ] Show interfaces
  - [ ] Historical data

- [ ] **Alarms**
  - [ ] List active alarms
  - [ ] Search and filter
  - [ ] Acknowledge alarm
  - [ ] Resolve alarm
  - [ ] Export CSV

- [ ] **Reports**
  - [ ] Generate performance reports
  - [ ] Display charts (Chart.js)
  - [ ] Filter by date range
  - [ ] Export PDF

- [ ] **Settings**
  - [ ] Update general settings
  - [ ] Configure SNMP
  - [ ] Setup notifications
  - [ ] Save to backend

### Backend Testing

- [ ] **API Endpoints**
  ```bash
  # Test device endpoints
  curl http://localhost:3001/api/devices
  curl http://localhost:3001/api/devices/1
  
  # Test authentication
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@nms.local","password":"admin123"}'
  
  # Test health
  curl http://localhost:3001/api/health
  ```

- [ ] **Database**
  ```bash
  # Connect to PostgreSQL
  docker-compose exec postgres psql -U nms_user -d nms_db
  
  # Check tables
  \dt
  
  # Sample queries
  SELECT * FROM users;
  SELECT * FROM devices;
  SELECT * FROM alarms;
  ```

- [ ] **WebSocket**
  - [ ] Connect to ws://localhost:3000/ws
  - [ ] Subscribe to channels
  - [ ] Receive real-time updates

### Performance Testing

- [ ] **Load Testing**
  - [ ] 10+ concurrent device polls
  - [ ] 100+ alarm entries
  - [ ] 1000+ metrics records

- [ ] **Response Times**
  - [ ] API response < 200ms
  - [ ] Page load < 2 seconds
  - [ ] WebSocket update < 500ms

---

## API Endpoints Summary

### Devices
```
GET    /api/devices              - List devices
POST   /api/devices              - Create device
GET    /api/devices/:id          - Get device
PUT    /api/devices/:id          - Update device
DELETE /api/devices/:id          - Delete device
POST   /api/devices/test-connection - Test SNMP
```

### Alarms
```
GET    /api/alarms               - List alarms
PUT    /api/alarms/:id/acknowledge - Acknowledge
PUT    /api/alarms/:id/resolve   - Resolve alarm
```

### Metrics
```
GET    /api/metrics/device/:id   - Device metrics
GET    /api/metrics/system       - System metrics
GET    /api/reports/performance  - Reports
```

### Authentication
```
POST   /api/auth/login           - Login
POST   /api/auth/logout          - Logout
POST   /api/auth/verify          - Verify token
```

### Settings
```
GET    /api/settings             - Get settings
PUT    /api/settings             - Update settings
```

---

## Database Schema

### Main Tables

- **users** - User accounts and roles
- **devices** - Monitored network devices
- **device_interfaces** - Network interfaces
- **device_metrics** - Performance metrics
- **alarms** - System alarms and alerts
- **events** - Event log
- **settings** - Configuration
- **polling_history** - Polling records
- **audit_logs** - User activity log

### Views

- **v_active_devices** - Active devices with counts
- **v_recent_alarms** - Recent alarm summary
- **v_device_uptime** - Uptime statistics

---

## Monitoring & Logs

### View Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs frontend
docker-compose logs backend

# Follow logs
docker-compose logs -f
```

### Check Health

```bash
# Backend health
curl http://localhost:3001/api/health

# Frontend health
curl http://localhost:3000/

# Database connection
docker-compose exec backend node -e "const db = require('./src/services/database'); db.query('SELECT 1');"
```

---

## Troubleshooting

### Port Already in Use

```bash
# Free ports
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:3001 | xargs kill -9  # Backend
lsof -ti:5432 | xargs kill -9  # Database
```

### Database Connection Issues

```bash
# Check PostgreSQL
docker-compose ps postgres

# Restart database
docker-compose restart postgres

# Reset database
docker-compose exec postgres psql -U nms_user -d nms_db -c "DROP DATABASE nms_db;"
docker-compose exec postgres createdb -U nms_user nms_db
```

### WebSocket Connection Fails

- Check browser console for errors
- Verify frontend is served over HTTP/HTTPS
- Check backend is running on correct port
- Verify firewall allows WebSocket connections

### High Memory Usage

```bash
# Check container stats
docker stats

# Clean up old containers
docker-compose down
docker system prune -a
```

---

## Production Deployment

### Security Checklist

- [ ] Change default credentials
- [ ] Enable HTTPS/TLS
- [ ] Configure firewall rules
- [ ] Setup rate limiting
- [ ] Enable CORS properly
- [ ] Implement JWT token rotation
- [ ] Setup database backups
- [ ] Enable audit logging
- [ ] Configure intrusion detection
- [ ] Regular security updates

### Performance Optimization

```bash
# Enable production mode
export NODE_ENV=production

# Use process manager
npm install -g pm2
pm2 start server.js --name nms-api

# Setup reverse proxy (Nginx)
# See nginx.conf for configuration
```

### Backup & Recovery

```bash
# Backup database
docker-compose exec postgres pg_dump -U nms_user nms_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U nms_user nms_db < backup.sql

# Backup application data
tar -czf nms-backup-$(date +%Y%m%d).tar.gz ./
```

---

## Scaling Considerations

1. **Horizontal Scaling**
   - Deploy multiple frontend instances behind load balancer
   - Use separate database server
   - Use Redis for session/cache

2. **Database Optimization**
   - Add database indexes (already included in schema)
   - Archive old metrics and alarms
   - Use connection pooling

3. **SNMP Polling Optimization**
   - Increase concurrency for faster polling
   - Use async/await pattern
   - Distribute polling across multiple workers

4. **WebSocket Scaling**
   - Use Redis pub/sub for multi-instance messaging
   - Implement connection load balancing
   - Monitor connection memory usage

---

## Support & Documentation

- **API Documentation**: See `/docs/API.md`
- **Architecture**: See `/docs/ARCHITECTURE.md`
- **Development**: See `/docs/DEVELOPMENT.md`
- **GitHub**: [Project Repository]
- **Issues**: Report issues on GitHub

---

## Version Information

- **Application Version**: 1.0.0
- **Last Updated**: 2025-12-26
- **Supported Databases**: PostgreSQL 12+
- **Supported Browsers**: Chrome 90+, Firefox 88+, Safari 14+

---

## License

© 2025 Network Monitoring System. All rights reserved.
