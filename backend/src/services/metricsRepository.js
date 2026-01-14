/**
 * Metrics Repository
 * Handles all database operations for device metrics
 */

const database = require('../database');
const logger = require('../logger');

class MetricsRepository {
  /**
   * Get metrics for device
   */
  /**
   * Get metrics for device (Alias for getByDevice)
   */
  static async getDeviceMetrics(deviceId, metricType = null, limit = 100) {
    return this.getByDevice(deviceId, metricType, limit);
  }

  static async getByDevice(deviceId, metricType = null, limit = 100) {
    try {
      let query = `
        SELECT DISTINCT ON (metric_name)
          id, device_id, metric_type, metric_name, metric_value,
          metric_unit, status, collected_at
        FROM device_metrics
        WHERE device_id = $1 
          AND metric_name IS NOT NULL 
          AND metric_name != ''
      `;

      const params = [deviceId];

      if (metricType) {
        query += ` AND metric_type = $2`;
        params.push(metricType);
      }

      query += ` ORDER BY metric_name, collected_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const metrics = await database.queryAll(query, params);
      
      // Re-sort by collected_at descending for the UI
      return metrics.sort((a, b) => new Date(b.collected_at) - new Date(a.collected_at));
    } catch (error) {
      logger.error('Failed to fetch metrics', { deviceId, error: error.message });
      throw error;
    }
  }

  /**
   * Get latest metric for device
   */
  static async getLatestMetric(deviceId, metricType) {
    try {
      const query = `
        SELECT 
          id, device_id, metric_type, metric_name, metric_value,
          metric_unit, status, collected_at
        FROM device_metrics
        WHERE device_id = $1 AND metric_type = $2
        ORDER BY collected_at DESC
        LIMIT 1
      `;
      return await database.queryOne(query, [deviceId, metricType]);
    } catch (error) {
      logger.error('Failed to fetch latest metric', { deviceId, metricType, error: error.message });
      throw error;
    }
  }

  /**
   * Create new metric
   */
  static async createMetric(metricData) {
    return this.create(metricData);
  }

  static async create(metricData) {
    try {
      const {
        device_id,
        metric_type,
        metric_name,
        metric_value,
        metric_unit = null,
        threshold_warning = null,
        threshold_critical = null,
        status = 'normal',
        data = null, // Support for nested data from nms_service
      } = metricData;

      // If nested data is provided, handle it as multiple metrics
      if (data && typeof data === 'object') {
        const results = [];
        for (const [key, value] of Object.entries(data)) {
          // Map internal keys to display names and types
          let name = key;
          let type = metric_type;
          let unit = '';

          if (key === 'cpu_usage') {
            name = 'CPU Load';
            type = 'cpu';
            unit = '%';
          } else if (key === 'memory_usage') {
            name = 'Memory Usage';
            type = 'memory';
            unit = '%';
          } else if (key === 'temperature') {
            name = 'Chassis Temp';
            type = 'temperature';
            unit = 'C';
          } else if (key === 'uptime_seconds') {
            name = 'System Uptime';
            type = 'uptime';
            unit = 's';
          } else if (key === 'disk_usage') {
            name = 'Disk Usage';
            type = 'disk';
            unit = '%';
          } else if (key === 'network_in') {
            name = 'Network In';
            type = 'network';
            unit = 'Mbps';
          } else if (key === 'network_out') {
            name = 'Network Out';
            type = 'network';
            unit = 'Mbps';
          } else if (key === 'interface_name' || key === 'interface_index' || key === 'admin_status' || key === 'oper_status' || key === 'speed') {
            continue; // Skip metadata and interface-specific metrics in this generic table
          }

          if (value !== null && value !== undefined) {
            results.push(await this.create({
              device_id,
              metric_type: type,
              metric_name: name,
              metric_value: value,
              metric_unit: unit,
              status
            }));
          }
        }
        return results.length > 0 ? results[0] : null;
      }

      // Basic validation for flat metrics
      if (!metric_name || metric_value === undefined || metric_value === null) {
        logger.warn('Skipping invalid metric', { device_id, metric_type, metric_name });
        return null;
      }

      const query = `
        INSERT INTO device_metrics 
        (device_id, metric_type, metric_name, metric_value, metric_unit,
         threshold_warning, threshold_critical, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const params = [
        device_id,
        metric_type,
        metric_name,
        metric_value,
        metric_unit,
        threshold_warning,
        threshold_critical,
        status,
      ];

      const result = await database.queryOne(query, params);
      logger.debug('Metric created', { 
        device_id,
        metric_type,
        metric_name,
        value: metric_value
      });
      return result;
    } catch (error) {
      logger.error('Failed to create metric', { error: error.message });
      throw error;
    }
  }

  /**
   * Create bulk metrics (more efficient)
   */
  static async createBulk(metricsData) {
    try {
      const query = `
        INSERT INTO device_metrics 
        (device_id, metric_type, metric_name, metric_value, metric_unit, status)
        VALUES
      `;

      const values = [];
      let paramIndex = 1;
      const valueStrings = [];

      metricsData.forEach((metric) => {
        valueStrings.push(
          `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
        );
        values.push(
          metric.device_id,
          metric.metric_type,
          metric.metric_name,
          metric.metric_value,
          metric.metric_unit || null,
          metric.status || 'normal'
        );
      });

      const fullQuery = query + valueStrings.join(',') + ' RETURNING id';
      const results = await database.queryAll(fullQuery, values);
      logger.debug('Bulk metrics created', { count: results.length });
      return results;
    } catch (error) {
      logger.error('Failed to create bulk metrics', { error: error.message });
      throw error;
    }
  }

  /**
   * Get metrics time series
   */
  static async getTimeSeries(deviceId, metricType, startTime, endTime) {
    try {
      const query = `
        SELECT 
          metric_name, metric_value, metric_unit, status, collected_at
        FROM device_metrics
        WHERE device_id = $1
          AND metric_type = $2
          AND collected_at BETWEEN $3 AND $4
        ORDER BY collected_at ASC
      `;
      return await database.queryAll(query, [
        deviceId,
        metricType,
        startTime,
        endTime,
      ]);
    } catch (error) {
      logger.error('Failed to fetch time series', { deviceId, metricType, error: error.message });
      throw error;
    }
  }

  /**
   * Get device health summary
   */
  static async getHealthSummary(deviceId) {
    try {
      const query = `
        SELECT
          metric_type,
          metric_name,
          metric_value,
          metric_unit,
          status,
          collected_at
        FROM device_metrics
        WHERE device_id = $1
          AND collected_at > NOW() - INTERVAL '1 hour'
        ORDER BY metric_type, collected_at DESC
      `;
      return await database.queryAll(query, [deviceId]);
    } catch (error) {
      logger.error('Failed to fetch health summary', { deviceId, error: error.message });
      throw error;
    }
  }

  /**
   * Get system metrics
   */
  static async getSystemMetrics() {
    try {
      const query = `
        SELECT
          d.id,
          d.name,
          COUNT(DISTINCT dm.id) as metric_count,
          MAX(dm.collected_at) as last_metric_time,
          COUNT(DISTINCT CASE WHEN dm.status = 'warning' THEN 1 END) as warning_count,
          COUNT(DISTINCT CASE WHEN dm.status = 'critical' THEN 1 END) as critical_count
        FROM devices d
        LEFT JOIN device_metrics dm ON d.id = dm.device_id
          AND dm.collected_at > NOW() - INTERVAL '1 day'
        GROUP BY d.id, d.name
        ORDER BY d.name
      `;
      return await database.queryAll(query);
    } catch (error) {
      logger.error('Failed to fetch system metrics', { error: error.message });
      throw error;
    }
  }

  /**
   * Cleanup old metrics (retention policy)
   */
  static async cleanupOldMetrics(retentionDays = 90) {
    try {
      const query = `
        DELETE FROM device_metrics
        WHERE collected_at < NOW() - INTERVAL '${retentionDays} days'
      `;
      const result = await database.query(query);
      logger.info('Metrics cleanup completed', { 
        rows_deleted: result.rowCount,
        retention_days: retentionDays 
      });
      return result.rowCount;
    } catch (error) {
      logger.error('Failed to cleanup old metrics', { error: error.message });
      throw error;
    }
  }
}

module.exports = MetricsRepository;
