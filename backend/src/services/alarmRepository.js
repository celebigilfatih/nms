/**
 * Alarm Repository
 * Handles all database operations for alarms
 */

const database = require('../database');
const logger = require('../logger');

class AlarmRepository {
  /**
   * Get all alarms with optional filters
   */
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT 
          a.id, a.device_id, d.name as device_name, a.alarm_code,
          a.message, a.severity, a.status, a.source,
          a.acknowledged_by, a.acknowledged_at,
          a.resolved_by, a.resolved_at,
          a.created_at, a.updated_at
        FROM alarms a
        LEFT JOIN devices d ON a.device_id = d.id
        WHERE 1=1
      `;

      const params = [];
      let paramIndex = 1;

      if (filters.severity) {
        query += ` AND a.severity = $${paramIndex++}`;
        params.push(filters.severity);
      }

      if (filters.status) {
        query += ` AND a.status = $${paramIndex++}`;
        params.push(filters.status);
      }

      if (filters.device_id) {
        query += ` AND a.device_id = $${paramIndex++}`;
        params.push(filters.device_id);
      }

      if (filters.days) {
        query += ` AND a.created_at > NOW() - INTERVAL '${filters.days} days'`;
      }

      query += ' ORDER BY a.created_at DESC LIMIT 1000';

      return await database.queryAll(query, params);
    } catch (error) {
      logger.error('Failed to fetch alarms', { filters, error: error.message });
      throw error;
    }
  }

  /**
   * Get alarm by ID
   */
  static async getById(id) {
    try {
      const query = `
        SELECT 
          a.id, a.device_id, d.name as device_name, a.alarm_code,
          a.message, a.severity, a.status, a.source,
          a.acknowledged_by, a.acknowledged_at,
          a.resolved_by, a.resolved_at,
          a.created_at, a.updated_at
        FROM alarms a
        LEFT JOIN devices d ON a.device_id = d.id
        WHERE a.id = $1
      `;
      return await database.queryOne(query, [id]);
    } catch (error) {
      logger.error('Failed to fetch alarm by ID', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Create new alarm
   */
  static async create(alarmData) {
    try {
      const {
        device_id,
        alarm_code,
        message,
        severity = 'info',
        status = 'active',
        source = 'nms_service',
      } = alarmData;

      const query = `
        INSERT INTO alarms 
        (device_id, alarm_code, message, severity, status, source)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const params = [
        device_id,
        alarm_code,
        message,
        severity,
        status,
        source,
      ];

      const result = await database.queryOne(query, params);
      logger.info('Alarm created', { alarm_id: result.id, device_id, severity });
      return result;
    } catch (error) {
      logger.error('Failed to create alarm', { error: error.message });
      throw error;
    }
  }

  /**
   * Acknowledge alarm
   */
  static async acknowledge(alarmId, userId = null) {
    try {
      const query = `
        UPDATE alarms
        SET status = 'acknowledged', acknowledged_at = CURRENT_TIMESTAMP,
            acknowledged_by = $2
        WHERE id = $1
        RETURNING *
      `;

      const result = await database.queryOne(query, [alarmId, userId]);
      logger.info('Alarm acknowledged', { alarm_id: alarmId });
      return result;
    } catch (error) {
      logger.error('Failed to acknowledge alarm', { alarmId, error: error.message });
      throw error;
    }
  }

  /**
   * Resolve alarm
   */
  static async resolve(alarmId, userId = null) {
    try {
      const query = `
        UPDATE alarms
        SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP,
            resolved_by = $2
        WHERE id = $1
        RETURNING *
      `;

      const result = await database.queryOne(query, [alarmId, userId]);
      logger.info('Alarm resolved', { alarm_id: alarmId });
      return result;
    } catch (error) {
      logger.error('Failed to resolve alarm', { alarmId, error: error.message });
      throw error;
    }
  }

  /**
   * Get active alarms
   */
  static async getActive() {
    try {
      const query = `
        SELECT 
          a.id, a.device_id, d.name as device_name, a.alarm_code,
          a.message, a.severity, a.status, a.created_at
        FROM alarms a
        LEFT JOIN devices d ON a.device_id = d.id
        WHERE a.status = 'active'
        ORDER BY 
          CASE a.severity
            WHEN 'critical' THEN 1
            WHEN 'warning' THEN 2
            ELSE 3
          END,
          a.created_at DESC
      `;
      return await database.queryAll(query);
    } catch (error) {
      logger.error('Failed to fetch active alarms', { error: error.message });
      throw error;
    }
  }

  /**
   * Get critical alarms
   */
  static async getCritical() {
    try {
      const query = `
        SELECT 
          a.id, a.device_id, d.name as device_name, a.alarm_code,
          a.message, a.severity, a.status, a.created_at
        FROM alarms a
        LEFT JOIN devices d ON a.device_id = d.id
        WHERE a.status = 'active' AND a.severity = 'critical'
        ORDER BY a.created_at DESC
      `;
      return await database.queryAll(query);
    } catch (error) {
      logger.error('Failed to fetch critical alarms', { error: error.message });
      throw error;
    }
  }

  /**
   * Get alarms by device
   */
  static async getByDevice(deviceId, limit = 50) {
    try {
      const query = `
        SELECT 
          id, device_id, alarm_code, message, severity, status,
          acknowledged_at, resolved_at, created_at
        FROM alarms
        WHERE device_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      return await database.queryAll(query, [deviceId, limit]);
    } catch (error) {
      logger.error('Failed to fetch alarms for device', { deviceId, error: error.message });
      throw error;
    }
  }

  /**
   * Get alarm statistics
   */
  static async getStatistics() {
    try {
      const query = `
        SELECT
          COUNT(*) FILTER (WHERE status = 'active') as active_count,
          COUNT(*) FILTER (WHERE severity = 'critical' AND status = 'active') as critical_count,
          COUNT(*) FILTER (WHERE severity = 'warning' AND status = 'active') as warning_count,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count
        FROM alarms
        WHERE created_at > NOW() - INTERVAL '7 days'
      `;
      const result = await database.queryOne(query);
      return {
        active: parseInt(result.active_count) || 0,
        critical: parseInt(result.critical_count) || 0,
        warning: parseInt(result.warning_count) || 0,
        resolved: parseInt(result.resolved_count) || 0,
      };
    } catch (error) {
      logger.error('Failed to fetch alarm statistics', { error: error.message });
      throw error;
    }
  }
}

module.exports = AlarmRepository;
