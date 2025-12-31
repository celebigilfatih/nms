/**
 * Device Repository
 * Handles all database operations for devices
 */

const database = require('../database');
const logger = require('../logger');

class DeviceRepository {
  /**
   * Get all devices
   */
  static async getAll() {
    try {
      const query = `
        SELECT 
          id, name, ip_address, vendor, device_type, snmp_version,
          snmp_port, connection_status, last_polled, last_online,
          polling_enabled, location, notes, created_at, updated_at
        FROM devices
        ORDER BY created_at DESC
      `;
      return await database.queryAll(query);
    } catch (error) {
      logger.error('Failed to fetch all devices', { error: error.message });
      throw error;
    }
  }

  /**
   * Get device by ID
   */
  static async getById(id) {
    try {
      const query = `
        SELECT 
          id, name, ip_address, vendor, device_type, snmp_version,
          snmp_port, snmp_community, connection_status, last_polled,
          last_online, polling_enabled, location, notes, created_at, updated_at
        FROM devices
        WHERE id = $1
      `;
      return await database.queryOne(query, [id]);
    } catch (error) {
      logger.error('Failed to fetch device by ID', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Get device by IP address
   */
  static async getByIp(ipAddress) {
    try {
      const query = `
        SELECT * FROM devices WHERE ip_address = $1
      `;
      return await database.queryOne(query, [ipAddress]);
    } catch (error) {
      logger.error('Failed to fetch device by IP', { ipAddress, error: error.message });
      throw error;
    }
  }

  /**
   * Create new device
   */
  static async create(deviceData) {
    try {
      const {
        name,
        ip_address,
        vendor,
        device_type,
        snmp_version = 'v2c',
        snmp_port = 161,
        snmp_community = 'public',
        polling_enabled = true,
        location = null,
        notes = null,
        created_by = null,
      } = deviceData;

      const query = `
        INSERT INTO devices 
        (name, ip_address, vendor, device_type, snmp_version, snmp_port,
         snmp_community, polling_enabled, location, notes, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const params = [
        name,
        ip_address,
        vendor,
        device_type,
        snmp_version,
        snmp_port,
        snmp_community,
        polling_enabled,
        location,
        notes,
        created_by,
      ];

      const result = await database.queryOne(query, params);
      logger.info('Device created', { device_id: result.id, ip: ip_address });
      return result;
    } catch (error) {
      logger.error('Failed to create device', { error: error.message });
      throw error;
    }
  }

  /**
   * Update device
   */
  static async update(id, updates) {
    try {
      const allowedFields = [
        'name',
        'vendor',
        'device_type',
        'snmp_version',
        'snmp_port',
        'snmp_community',
        'polling_enabled',
        'connection_status',
        'location',
        'notes',
        'ssh_username',
        'ssh_password',
      ];

      const fields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          fields.push(`${key} = $${paramIndex++}`);
          values.push(value);
        }
      }

      if (fields.length === 0) {
        return await this.getById(id);
      }

      values.push(id);
      const query = `
        UPDATE devices
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await database.queryOne(query, values);
      logger.info('Device updated', { device_id: id });
      return result;
    } catch (error) {
      logger.error('Failed to update device', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Delete device
   */
  static async delete(id) {
    try {
      const query = 'DELETE FROM devices WHERE id = $1 RETURNING id';
      const result = await database.queryOne(query, [id]);
      
      if (result) {
        logger.info('Device deleted', { device_id: id });
      }
      
      return result;
    } catch (error) {
      logger.error('Failed to delete device', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Get devices by vendor
   */
  static async getByVendor(vendor) {
    try {
      const query = `
        SELECT * FROM devices WHERE vendor = $1 ORDER BY name
      `;
      return await database.queryAll(query, [vendor]);
    } catch (error) {
      logger.error('Failed to fetch devices by vendor', { vendor, error: error.message });
      throw error;
    }
  }

  /**
   * Get active devices (polling enabled)
   */
  static async getActive() {
    try {
      const query = `
        SELECT * FROM devices 
        WHERE polling_enabled = TRUE
        ORDER BY name
      `;
      return await database.queryAll(query);
    } catch (error) {
      logger.error('Failed to fetch active devices', { error: error.message });
      throw error;
    }
  }

  /**
   * Update device status
   */
  static async updateStatus(id, status, lastPolled = true) {
    try {
      const query = `
        UPDATE devices
        SET connection_status = $1, last_polled = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, name, connection_status
      `;
      const result = await database.queryOne(query, [status, id]);
      logger.debug('Device status updated', { device_id: id, status });
      return result;
    } catch (error) {
      logger.error('Failed to update device status', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Test device connection
   * Simulates SNMP connection test
   */
  static async testConnection(id) {
    try {
      const device = await this.getById(id);
      if (!device) {
        throw new Error('Device not found');
      }

      // Simulate SNMP connection test
      // In a real implementation, this would use snmp library to test actual connection
      const isOnline = Math.random() > 0.3; // 70% success rate for demo
      
      const status = isOnline ? 'online' : 'offline';
      
      // Update device status based on test result
      await this.updateStatus(id, status);
      
      logger.info('Device connection test completed', { device_id: id, status });
      
      return {
        device_id: id,
        device_name: device.name,
        ip_address: device.ip_address,
        status,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Failed to test device connection', { id, error: error.message });
      throw error;
    }
  }
}

module.exports = DeviceRepository;
