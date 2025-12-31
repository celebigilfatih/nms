-- PostgreSQL schema initialization for NMS
-- Create database if not exists
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45) NOT NULL,
    vendor VARCHAR(50) NOT NULL,
    community_string VARCHAR(255),
    snmp_version VARCHAR(10) DEFAULT '2c',
    snmp_port INTEGER DEFAULT 161,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_device_ip ON devices(ip_address);
CREATE INDEX idx_device_enabled ON devices(enabled);

-- Alarms table
CREATE TABLE IF NOT EXISTS alarms (
    id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    device_name VARCHAR(255),
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP,
    acknowledged_by VARCHAR(255),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alarm_device ON alarms(device_id);
CREATE INDEX idx_alarm_severity ON alarms(severity);
CREATE INDEX idx_alarm_created ON alarms(created_at);
CREATE INDEX idx_alarm_resolved ON alarms(resolved);

-- Interface metrics time series
CREATE TABLE IF NOT EXISTS interface_metrics (
    id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    interface_index INTEGER NOT NULL,
    interface_name VARCHAR(100),
    description VARCHAR(255),
    admin_status VARCHAR(10),
    oper_status VARCHAR(10),
    speed INTEGER,
    in_octets BIGINT,
    out_octets BIGINT,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interface_device_idx ON interface_metrics(device_id, interface_index);
CREATE INDEX idx_interface_collected ON interface_metrics(collected_at);

-- Device health metrics time series
CREATE TABLE IF NOT EXISTS device_health_metrics (
    id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    device_name VARCHAR(255),
    uptime_seconds INTEGER,
    cpu_usage FLOAT,
    memory_usage FLOAT,
    temperature FLOAT,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_health_device ON device_health_metrics(device_id);
CREATE INDEX idx_health_collected ON device_health_metrics(collected_at);

-- Device inventory
CREATE TABLE IF NOT EXISTS device_inventory (
    id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL UNIQUE REFERENCES devices(id) ON DELETE CASCADE,
    sys_descr TEXT,
    serial_number VARCHAR(255),
    firmware_version VARCHAR(255),
    vendor_model VARCHAR(255),
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_device ON device_inventory(device_id);

-- Sample data (optional)
INSERT INTO devices (name, ip_address, vendor, community_string, enabled)
VALUES 
    ('Router-Core-01', '192.168.1.1', 'cisco', 'public', TRUE),
    ('Switch-Access-02', '192.168.1.2', 'cisco', 'public', TRUE),
    ('Firewall-FG01', '192.168.1.3', 'fortinet', 'public', TRUE)
ON CONFLICT (name) DO NOTHING;
