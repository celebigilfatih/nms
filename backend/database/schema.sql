-- ============================================================================
-- NMS (Network Monitoring System) PostgreSQL Database Schema
-- ============================================================================

-- Create database (remove this line if database already exists)
-- CREATE DATABASE nms_db;

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'operator',
  permissions TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);

-- ============================================================================
-- DEVICES
-- ============================================================================

CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) UNIQUE NOT NULL,
  vendor VARCHAR(100),
  device_type VARCHAR(50),
  snmp_version VARCHAR(10) DEFAULT 'v2c',
  snmp_port INTEGER DEFAULT 161,
  snmp_community VARCHAR(255),
  snmp_username VARCHAR(255),
  snmp_auth_protocol VARCHAR(20),
  snmp_auth_password VARCHAR(255),
  snmp_priv_protocol VARCHAR(20),
  snmp_priv_password VARCHAR(255),
  polling_enabled BOOLEAN DEFAULT TRUE,
  polling_interval INTEGER DEFAULT 300,
  connection_status VARCHAR(50) DEFAULT 'offline',
  last_polled TIMESTAMP,
  last_online TIMESTAMP,
  location VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_devices_ip ON devices(ip_address);
CREATE INDEX idx_devices_vendor ON devices(vendor);
CREATE INDEX idx_devices_type ON devices(device_type);
CREATE INDEX idx_devices_status ON devices(connection_status);
CREATE INDEX idx_devices_polling ON devices(polling_enabled);

-- ============================================================================
-- DEVICE INTERFACES
-- ============================================================================

CREATE TABLE IF NOT EXISTS device_interfaces (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  interface_name VARCHAR(255) NOT NULL,
  interface_alias VARCHAR(255),
  mac_address VARCHAR(17),
  mtu INTEGER,
  speed BIGINT,
  duplex VARCHAR(50),
  status VARCHAR(50),
  admin_status VARCHAR(50),
  in_octets BIGINT DEFAULT 0,
  out_octets BIGINT DEFAULT 0,
  in_errors BIGINT DEFAULT 0,
  out_errors BIGINT DEFAULT 0,
  in_discards BIGINT DEFAULT 0,
  out_discards BIGINT DEFAULT 0,
  last_updated TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(device_id, interface_name)
);

CREATE INDEX idx_interfaces_device ON device_interfaces(device_id);
CREATE INDEX idx_interfaces_status ON device_interfaces(status);

-- ============================================================================
-- METRICS & PERFORMANCE DATA
-- ============================================================================

CREATE TABLE IF NOT EXISTS device_metrics (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL,
  metric_name VARCHAR(255),
  metric_value DECIMAL(10, 2),
  metric_unit VARCHAR(50),
  threshold_warning DECIMAL(10, 2),
  threshold_critical DECIMAL(10, 2),
  status VARCHAR(50),
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_metrics_device ON device_metrics(device_id);
CREATE INDEX idx_metrics_type ON device_metrics(metric_type);
CREATE INDEX idx_metrics_collected ON device_metrics(collected_at);

-- ============================================================================
-- ALARMS & EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS alarms (
  id SERIAL PRIMARY KEY,
  device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
  alarm_code VARCHAR(50),
  message TEXT NOT NULL,
  severity VARCHAR(50) DEFAULT 'info',
  status VARCHAR(50) DEFAULT 'active',
  source VARCHAR(100),
  acknowledged_by INTEGER REFERENCES users(id),
  acknowledged_at TIMESTAMP,
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alarms_device ON alarms(device_id);
CREATE INDEX idx_alarms_severity ON alarms(severity);
CREATE INDEX idx_alarms_status ON alarms(status);
CREATE INDEX idx_alarms_created ON alarms(created_at);

-- ============================================================================
-- EVENTS LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  event_category VARCHAR(50),
  message TEXT,
  details JSONB,
  severity VARCHAR(50),
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_device ON events(device_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_created ON events(created_at);

-- ============================================================================
-- CONFIGURATION & SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50),
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_settings_key ON settings(setting_key);

-- ============================================================================
-- SNMP TRAP CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS snmp_traps (
  id SERIAL PRIMARY KEY,
  trap_name VARCHAR(255) NOT NULL,
  oid VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  severity VARCHAR(50),
  is_enabled BOOLEAN DEFAULT TRUE,
  response_action TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_traps_oid ON snmp_traps(oid);
CREATE INDEX idx_traps_enabled ON snmp_traps(is_enabled);

-- ============================================================================
-- POLLING HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS polling_history (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  poll_start TIMESTAMP,
  poll_end TIMESTAMP,
  status VARCHAR(50),
  metrics_collected INTEGER DEFAULT 0,
  errors_encountered BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_polling_device ON polling_history(device_id);
CREATE INDEX idx_polling_status ON polling_history(status);
CREATE INDEX idx_polling_created ON polling_history(created_at);

-- ============================================================================
-- REPORTS & ANALYTICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  report_name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50),
  created_by INTEGER REFERENCES users(id),
  start_date DATE,
  end_date DATE,
  report_data JSONB,
  is_saved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_reports_created ON reports(created_at);

-- ============================================================================
-- MAINTENANCE LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id SERIAL PRIMARY KEY,
  device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
  maintenance_type VARCHAR(100) NOT NULL,
  description TEXT,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  scheduled_by INTEGER REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_maintenance_device ON maintenance_logs(device_id);
CREATE INDEX idx_maintenance_status ON maintenance_logs(status);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id INTEGER,
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ============================================================================
-- VENDORS
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'Networking',
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendors_active ON vendors(active);
CREATE INDEX idx_vendors_category ON vendors(category);

-- ============================================================================
-- BACKUPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS backups (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  backup_type VARCHAR(50) DEFAULT 'config',
  backup_file VARCHAR(255),
  description TEXT,
  size_bytes BIGINT DEFAULT 0,
  checksum VARCHAR(64),
  configuration TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_backups_device ON backups(device_id);
CREATE INDEX idx_backups_type ON backups(backup_type);
CREATE INDEX idx_backups_created ON backups(created_at);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default admin user
INSERT INTO users (email, password_hash, name, role, permissions, is_active)
VALUES (
  'admin@nms.local',
  'admin123',
  'Administrator',
  'admin',
  '["read","write","delete","admin"]',
  TRUE
) ON CONFLICT (email) DO NOTHING;

-- Insert default settings
INSERT INTO settings (setting_key, setting_value, setting_type, description, is_system)
VALUES
  ('system_name', 'Network Monitoring System', 'string', 'System name', TRUE),
  ('environment', 'production', 'string', 'Environment type', TRUE),
  ('log_level', 'info', 'string', 'Log level', TRUE),
  ('cpu_threshold', '80', 'integer', 'CPU usage threshold %', FALSE),
  ('memory_threshold', '80', 'integer', 'Memory usage threshold %', FALSE),
  ('temp_threshold', '80', 'integer', 'Temperature threshold °C', FALSE),
  ('polling_interval', '300', 'integer', 'Default polling interval seconds', FALSE),
  ('snmp_timeout', '5', 'integer', 'SNMP timeout seconds', FALSE),
  ('snmp_retries', '3', 'integer', 'SNMP retries', FALSE),
  ('metrics_retention_days', '90', 'integer', 'Metrics retention in days', FALSE)
)ON CONFLICT (setting_key) DO NOTHING;

-- Insert known network device vendors
INSERT INTO vendors (name, display_name, category, description, active)
VALUES
  ('cisco', 'Cisco Systems', 'Networking', 'Leading networking and IT infrastructure company', TRUE),
  ('arista', 'Arista Networks', 'Networking', 'Cloud networking company specializing in data center switching', TRUE),
  ('juniper', 'Juniper Networks', 'Switching & Routing', 'Enterprise networking equipment manufacturer', TRUE),
  ('hp', 'HP Inc.', 'Servers & Infrastructure', 'Computing and infrastructure solutions', TRUE),
  ('dell', 'Dell Technologies', 'Storage & Computing', 'Comprehensive IT infrastructure solutions', TRUE),
  ('ruckus', 'Ruckus Networks', 'Wireless & WiFi', 'Enterprise wireless networking solutions', TRUE),
  ('fortinet', 'Fortinet', 'Security & Firewalls', 'Security appliances and threat management', TRUE),
  ('palo_alto', 'Palo Alto Networks', 'Security & Firewalls', 'Cloud-based cybersecurity platform', TRUE),
  ('vmware', 'VMware', 'Cloud & Virtualization', 'Virtualization and cloud computing software', TRUE),
  ('huawei', 'Huawei Technologies', 'Networking', 'Telecommunications and networking equipment', TRUE),
  ('zte', 'ZTE Corporation', 'Telecommunications', 'Telecommunications equipment manufacturer', TRUE),
  ('ruijie', 'Ruijie Networks', 'Networking', 'Enterprise network equipment provider', TRUE),
  ('ubiquiti', 'Ubiquiti Networks', 'Wireless & WiFi', 'Networking technology solutions', TRUE),
  ('netgear', 'NETGEAR', 'Networking', 'Networking hardware and software', TRUE),
  ('tp_link', 'TP-Link', 'Networking', 'Networking products manufacturer', TRUE),
  ('mellanox', 'NVIDIA Mellanox', 'Storage & Computing', 'High-performance computing and data center solutions', TRUE),
  ('intel', 'Intel Corporation', 'Servers & Infrastructure', 'Computing and processor manufacturer', TRUE),
  ('amd', 'AMD', 'Servers & Infrastructure', 'Computing and processor solutions', TRUE),
  ('qualcomm', 'Qualcomm', 'Telecommunications', 'Wireless technology and semiconductors', TRUE),
  ('broadcom', 'Broadcom', 'Networking', 'Infrastructure software solutions', TRUE)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Active devices with current status
CREATE OR REPLACE VIEW v_active_devices AS
SELECT
  d.id,
  d.name,
  d.ip_address,
  d.vendor,
  d.device_type,
  d.connection_status,
  d.last_polled,
  COUNT(DISTINCT i.id) as interface_count,
  COUNT(DISTINCT a.id) as active_alarm_count
FROM devices d
LEFT JOIN device_interfaces i ON d.id = i.device_id
LEFT JOIN alarms a ON d.id = a.device_id AND a.status = 'active'
WHERE d.polling_enabled = TRUE
GROUP BY d.id;

-- Recent alarms summary
CREATE OR REPLACE VIEW v_recent_alarms AS
SELECT
  a.id,
  a.device_id,
  d.name as device_name,
  a.alarm_code,
  a.message,
  a.severity,
  a.status,
  a.created_at,
  COUNT(*) OVER (PARTITION BY a.severity, a.status) as count
FROM alarms a
LEFT JOIN devices d ON a.device_id = d.id
ORDER BY a.created_at DESC
LIMIT 100;

-- Device uptime statistics
CREATE OR REPLACE VIEW v_device_uptime AS
SELECT
  d.id,
  d.name,
  ROUND(
    (COUNT(CASE WHEN ph.status = 'success' THEN 1 END) * 100.0 / 
    NULLIF(COUNT(*), 0))::numeric, 2
  ) as uptime_percentage,
  AVG(ph.response_time_ms) as avg_response_time_ms,
  MAX(d.last_polled) as last_polled
FROM devices d
LEFT JOIN polling_history ph ON d.id = ph.device_id 
  AND ph.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY d.id, d.name;

-- ============================================================================
-- CLEANUP POLICIES (Optional)
-- ============================================================================

-- Auto-delete old polling history (older than 90 days)
-- This can be set up as a cron job or scheduled task

-- Auto-delete resolved alarms older than 30 days
-- This can be set up as a cron job or scheduled task
