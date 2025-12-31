# Backend & NMS Service Integration Guide

This guide explains how to set up and run the complete NMS system with backend and nms_service integrated.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js - Port 3000)            │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP/WebSocket
┌──────────────────▼──────────────────────────────────────────┐
│              Backend API (Node.js - Port 3001)              │
│  ├─ Device Management                                       │
│  ├─ Alarm Processing                                        │
│  ├─ Metrics Storage                                         │
│  └─ Settings Management                                     │
└──────────────────┬──────────────────────────────────────────┘
                   │ SQL
┌──────────────────▼──────────────────────────────────────────┐
│           PostgreSQL Database (Port 5432)                   │
│  ├─ devices table                                           │
│  ├─ alarms table                                            │
│  ├─ device_metrics table                                    │
│  └─ users table                                             │
└──────────────────▲──────────────────────────────────────────┘
                   │ SQL
┌──────────────────┴──────────────────────────────────────────┐
│         NMS Service (Python - Polling)                      │
│  ├─ SNMP Poller                                             │
│  ├─ Alarm Engine                                            │
│  ├─ OID Manager                                             │
│  └─ API Client → Sends to Backend                           │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start with Docker Compose

### Prerequisites
- Docker & Docker Compose installed
- Port 3000, 3001, 5432 available

### Step 1: Prepare Environment

```bash
cd d:\Dev\nms-nextjs

# Review .env file (already configured)
cat .env
```

### Step 2: Start All Services

```bash
# Start all services in background
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Watch specific service
docker-compose logs -f backend
docker-compose logs -f nms_service
docker-compose logs -f postgres
```

### Step 3: Verify Services

```bash
# Check backend health
curl http://localhost:3001/api/health

# Check frontend
curl http://localhost:3000

# Connect to database
psql -h localhost -U nms_user -d nms_db
```

### Step 4: Stop Services

```bash
docker-compose down

# Full cleanup (remove volumes)
docker-compose down -v
```

## Manual Setup (without Docker)

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- pip

### Step 1: Database Setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE nms_db;"
psql -U postgres -c "CREATE USER nms_user WITH PASSWORD 'nms_secure_password_2024';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE nms_db TO nms_user;"

# Initialize schema
psql -U nms_user -d nms_db -f backend/database/schema.sql
```

### Step 2: Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Run backend
npm start
# or for development
npm run dev
```

Backend runs on `http://localhost:3001`

### Step 3: NMS Service Setup

```bash
# From project root
cd .

# Install Python dependencies
pip install -r requirements.txt

# Run NMS service
python -m nms_service.orchestrator
```

### Step 4: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Build (production)
npm run build

# Run frontend
npm start
# or for development
npm run dev
```

Frontend runs on `http://localhost:3000`

## Configuration

### Environment Variables (.env)

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=nms_user
DB_PASSWORD=nms_secure_password_2024
DB_NAME=nms_db

# Backend API
API_PORT=3001
API_HOST=0.0.0.0
BACKEND_API_URL=http://localhost:3001

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# NMS Service
SNMP_TIMEOUT=5
SNMP_RETRIES=3
INTERFACE_POLL_INTERVAL=30
CPU_MEMORY_POLL_INTERVAL=300
```

## Testing the Connection

### 1. Add a Device

```bash
curl -X POST http://localhost:3001/api/devices \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test-Router",
    "ip_address": "10.0.0.1",
    "vendor": "Cisco",
    "device_type": "Router",
    "snmp_version": "v2c",
    "snmp_port": 161,
    "snmp_community": "public"
  }'
```

### 2. Get All Devices

```bash
curl http://localhost:3001/api/devices
```

### 3. Check Backend Health

```bash
curl http://localhost:3001/api/health
```

### 4. Get Active Alarms

```bash
curl http://localhost:3001/api/alarms?status=active
```

### 5. View Metrics

```bash
curl http://localhost:3001/api/metrics/system
```

## Data Flow

### Device Polling Cycle

1. **NMS Service** (Python) - Starts polling cycle
2. **SNMP Poller** - Collects metrics from network devices
3. **Alarm Engine** - Evaluates metrics against thresholds
4. **API Client** - Sends alarms and metrics to Backend
5. **Backend API** - Stores in PostgreSQL database
6. **Frontend** - Displays real-time updates via WebSocket

### Alarm Creation Flow

```
Network Device (SNMP) 
  ↓
NMS Service (Polling)
  ↓
Alarm Engine (Evaluation)
  ↓
Backend API (POST /api/alarms)
  ↓
PostgreSQL (alarms table)
  ↓
Frontend (Real-time display)
```

## API Endpoints

### Devices
- `GET /api/devices` - List all devices
- `POST /api/devices` - Create device
- `GET /api/devices/:id` - Get device
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Delete device

### Alarms
- `GET /api/alarms` - List alarms with filters
- `POST /api/alarms` - Create alarm (from NMS service)
- `GET /api/alarms/:id` - Get alarm
- `PUT /api/alarms/:id/acknowledge` - Acknowledge alarm
- `PUT /api/alarms/:id/resolve` - Resolve alarm

### Metrics
- `POST /api/metrics` - Create metrics (from NMS service)
- `GET /api/metrics/device/:id` - Get device metrics
- `GET /api/metrics/system` - Get system metrics

### Health
- `GET /api/health` - Backend health check
- `GET /api/status` - System status

## Troubleshooting

### Backend won't connect to database

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql -h localhost -U nms_user -d nms_db

# Check .env variables
cat .env | grep DB_
```

### NMS Service can't reach Backend

```bash
# Verify backend is running
curl http://localhost:3001/api/health

# Check BACKEND_API_URL in .env
grep BACKEND_API_URL .env

# Check logs
docker-compose logs nms_service
```

### Frontend not loading

```bash
# Check frontend is running
curl http://localhost:3000

# Verify API URL configuration
grep NEXT_PUBLIC_API_URL .env

# Check browser console for errors
```

### Port conflicts

```bash
# Find processes using ports
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :5432  # Database

# Kill if needed (Windows PowerShell)
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -Force
```

## Production Deployment

See `DEPLOYMENT.md` for production deployment instructions.

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f [service_name]`
2. Review ARCHITECTURE.md for design details
3. Check DATABASE schema in backend/database/schema.sql

