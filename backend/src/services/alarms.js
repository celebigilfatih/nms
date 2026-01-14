/**
 * NMS Alarm Service
 * Generates, manages, and processes alarms
 */

const EventEmitter = require('events');
const logger = require('../logger');

class AlarmService extends EventEmitter {
  constructor() {
    super();
    this.alarmCache = new Map();
    this.alarmHistory = [];
    this.maxHistorySize = 1000;
  }

  /**
   * Generate new alarm
   */
  async generateAlarm(alarmData) {
    try {
      const alarm = {
        id: this.generateAlarmId(),
        ...alarmData,
        created_at: new Date(),
        status: 'active'
      };

      // Check for duplicate recent alarms
      if (this.isDuplicateAlarm(alarm)) {
        console.log(`ℹ️  Duplicate alarm suppressed: ${alarm.message}`);
        return null;
      }

      // Store in cache
      this.alarmCache.set(alarm.id, alarm);

      // Add to history
      this.alarmHistory.push(alarm);
      if (this.alarmHistory.length > this.maxHistorySize) {
        this.alarmHistory.shift();
      }

      // Emit event for listeners
      this.emit('alarmCreated', alarm);

      // Trigger notifications based on severity
      this.handleAlarmNotification(alarm);

      console.log(`🚨 Alarm Generated [${alarm.severity.toUpperCase()}]: ${alarm.message}`);
      return alarm;
    } catch (error) {
      console.error('Error generating alarm:', error);
      throw error;
    }
  }

  /**
   * Check for duplicate alarms
   */
  isDuplicateAlarm(newAlarm) {
    const timeWindow = 60000; // 1 minute
    const now = Date.now();

    for (const [, alarm] of this.alarmCache) {
      if (
        alarm.device_id === newAlarm.device_id &&
        alarm.message === newAlarm.message &&
        alarm.severity === newAlarm.severity &&
        (now - new Date(alarm.created_at).getTime()) < timeWindow
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Acknowledge alarm
   */
  async acknowledgeAlarm(alarmId, userId) {
    try {
      const alarm = this.alarmCache.get(alarmId);
      if (!alarm) {
        throw new Error(`Alarm ${alarmId} not found`);
      }

      alarm.status = 'acknowledged';
      alarm.acknowledged_by = userId;
      alarm.acknowledged_at = new Date();

      this.emit('alarmAcknowledged', alarm);

      console.log(`✅ Alarm acknowledged: ${alarmId}`);
      return alarm;
    } catch (error) {
      console.error('Error acknowledging alarm:', error);
      throw error;
    }
  }

  /**
   * Resolve alarm
   */
  async resolveAlarm(alarmId, userId, resolution) {
    try {
      const alarm = this.alarmCache.get(alarmId);
      if (!alarm) {
        throw new Error(`Alarm ${alarmId} not found`);
      }

      alarm.status = 'resolved';
      alarm.resolved_by = userId;
      alarm.resolved_at = new Date();
      alarm.resolution = resolution;

      this.emit('alarmResolved', alarm);

      console.log(`🔧 Alarm resolved: ${alarmId}`);
      return alarm;
    } catch (error) {
      console.error('Error resolving alarm:', error);
      throw error;
    }
  }

  /**
   * Handle alarm notifications
   */
  async handleAlarmNotification(alarm) {
    const notificationConfig = {
      critical: { email: true, sms: true, webhook: true },
      high: { email: true, sms: false, webhook: true },
      medium: { email: true, sms: false, webhook: false },
      low: { email: false, sms: false, webhook: false }
    };

    const config = notificationConfig[alarm.severity] || {};

    if (config.email) {
      await this.sendEmailNotification(alarm);
    }

    if (config.sms) {
      await this.sendSMSNotification(alarm);
    }

    if (config.webhook) {
      await this.sendWebhookNotification(alarm);
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(alarm) {
    try {
      logger.info(`📧 Email notification queued for alarm: ${alarm.id}`, {
        to: 'admin@nms.local',
        subject: `[${alarm.severity.toUpperCase()}] ${alarm.message}`
      });
      // Mock implementation - in production use nodemailer
      this.emit('notificationSent', {
        alarmId: alarm.id,
        type: 'email',
        status: 'sent',
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error sending email notification:', error);
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMSNotification(alarm) {
    try {
      logger.info(`📱 SMS notification queued for alarm: ${alarm.id}`, {
        phone: '+905000000000',
        message: `NMS: ${alarm.severity.toUpperCase()} - ${alarm.message}`
      });
      // Mock implementation
      this.emit('notificationSent', {
        alarmId: alarm.id,
        type: 'sms',
        status: 'sent',
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error sending SMS notification:', error);
    }
  }

  /**
   * Send webhook notification
   */
  async sendWebhookNotification(alarm) {
    try {
      const webhookUrl = process.env.ALARM_WEBHOOK_URL;
      if (!webhookUrl) {
        logger.debug('No alarm webhook URL configured, skipping');
        return;
      }

      logger.info(`🔗 Sending webhook notification for alarm: ${alarm.id}`, { url: webhookUrl });
      
      // Real implementation example using fetch (Node 18+)
      /*
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-NMS-Alarm-Signature': 'optional-hmac-signature'
        },
        body: JSON.stringify({
          event: 'alarm_created',
          alarm: alarm,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status: ${response.status}`);
      }
      */

      this.emit('notificationSent', {
        alarmId: alarm.id,
        type: 'webhook',
        status: 'sent',
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error sending webhook notification:', error);
    }
  }

  /**
   * Get alarm by ID
   */
  getAlarm(alarmId) {
    return this.alarmCache.get(alarmId);
  }

  /**
   * Get all active alarms
   */
  getActiveAlarms() {
    const active = [];
    for (const [, alarm] of this.alarmCache) {
      if (alarm.status === 'active') {
        active.push(alarm);
      }
    }
    return active.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4);
    });
  }

  /**
   * Get alarms by severity
   */
  getAlarmsBySeverity(severity) {
    const alarms = [];
    for (const [, alarm] of this.alarmCache) {
      if (alarm.severity === severity) {
        alarms.push(alarm);
      }
    }
    return alarms;
  }

  /**
   * Get alarms for device
   */
  getDeviceAlarms(deviceId) {
    const alarms = [];
    for (const [, alarm] of this.alarmCache) {
      if (alarm.device_id === deviceId) {
        alarms.push(alarm);
      }
    }
    return alarms.sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
  }

  /**
   * Get alarm statistics
   */
  getStatistics() {
    const stats = {
      total: this.alarmCache.size,
      active: 0,
      acknowledged: 0,
      resolved: 0,
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };

    for (const [, alarm] of this.alarmCache) {
      if (alarm.status === 'active') stats.active++;
      if (alarm.status === 'acknowledged') stats.acknowledged++;
      if (alarm.status === 'resolved') stats.resolved++;
      
      const severity = alarm.severity || 'low';
      if (stats.bySeverity[severity] !== undefined) {
        stats.bySeverity[severity]++;
      }
    }

    return stats;
  }

  /**
   * Clear old alarms
   */
  clearOldAlarms(olderThanHours = 24) {
    const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000);
    let cleared = 0;

    for (const [alarmId, alarm] of this.alarmCache) {
      if (
        alarm.status === 'resolved' &&
        new Date(alarm.resolved_at).getTime() < cutoff
      ) {
        this.alarmCache.delete(alarmId);
        cleared++;
      }
    }

    console.log(`🧹 Cleared ${cleared} old alarms`);
    return cleared;
  }

  /**
   * Generate alarm ID
   */
  generateAlarmId() {
    return `ALARM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get alarm history
   */
  getHistory(limit = 100) {
    return this.alarmHistory.slice(-limit).reverse();
  }

  /**
   * Get alarm history for device
   */
  getDeviceHistory(deviceId, limit = 50) {
    return this.alarmHistory
      .filter(alarm => alarm.device_id === deviceId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Export alarms
   */
  exportAlarms(format = 'json') {
    const data = this.getActiveAlarms();

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Convert alarms to CSV
   */
  convertToCSV(alarms) {
    const headers = ['ID', 'Device', 'Message', 'Severity', 'Status', 'Created'];
    const rows = alarms.map(a => [
      a.id,
      a.device_name || 'Unknown',
      a.message,
      a.severity,
      a.status,
      new Date(a.created_at).toISOString()
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  }
}

module.exports = new AlarmService();
