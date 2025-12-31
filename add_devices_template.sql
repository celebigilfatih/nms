-- ===============================================
-- Add Your Network Devices to Monitor
-- ===============================================
-- Instructions:
-- 1. Replace the IP addresses with your actual device IPs
-- 2. Update community strings if not "public"
-- 3. Verify vendor names: cisco, fortinet, mikrotik, or generic
-- 4. Run: docker exec nms_postgres psql -U nms_user -d nms_db -f /path/to/add_devices_template.sql

-- Example 1: Cisco Router
-- INSERT INTO devices (name, ip_address, vendor, community_string, snmp_version, snmp_port, enabled)
-- VALUES ('Core-Router-01', '10.0.0.1', 'cisco', 'public', '2c', 161, true);

-- Example 2: Cisco Switch
-- INSERT INTO devices (name, ip_address, vendor, community_string, snmp_version, snmp_port, enabled)
-- VALUES ('Access-Switch-01', '10.0.0.2', 'cisco', 'public', '2c', 161, true);

-- Example 3: Fortinet FortiGate Firewall
-- INSERT INTO devices (name, ip_address, vendor, community_string, snmp_version, snmp_port, enabled)
-- VALUES ('Firewall-FG1000D', '10.0.0.3', 'fortinet', 'public', '2c', 161, true);

-- Example 4: MikroTik Router
-- INSERT INTO devices (name, ip_address, vendor, community_string, snmp_version, snmp_port, enabled)
-- VALUES ('MikroTik-Core', '10.0.0.4', 'mikrotik', 'public', '2c', 161, true);

-- Example 5: Generic/Unknown Device
-- INSERT INTO devices (name, ip_address, vendor, community_string, snmp_version, snmp_port, enabled)
-- VALUES ('Unknown-Device-01', '10.0.0.5', 'generic', 'public', '2c', 161, true);

-- ===============================================
-- PASTE YOUR DEVICES BELOW (uncomment and modify)
-- ===============================================

-- INSERT INTO devices (name, ip_address, vendor, community_string, snmp_version, snmp_port, enabled)
-- VALUES ('Your-Device-Name', 'X.X.X.X', 'vendor', 'public', '2c', 161, true);
