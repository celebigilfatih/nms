/**
 * NMS SNMP Polling Service
 * Continuously polls devices for metrics and status
 */

const EventEmitter = require('events');

class SNMPPollingService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      pollingInterval: config.pollingInterval || 300000, // 5 minutes
      concurrentPolls: config.concurrentPolls || 5,
      timeout: config.timeout || 5000,
      retries: config.retries || 3,
      ...config
    };

    this.isRunning = false;
    this.pollingSchedules = new Map();
    this.activePolls = new Set();
    this.deviceRepository = config.deviceRepository || null;
    this.pollStats = {
      totalPolls: 0,
      successfulPolls: 0,
      failedPolls: 0,
      avgResponseTime: 0
    };
  }

  /**
   * Start polling service
   */
  async start(deviceList = []) {
    if (this.isRunning) {
      console.warn('⚠️  Polling service already running');
      return;
    }

    console.log('🚀 Starting SNMP Polling Service...');
    this.isRunning = true;

    // Schedule polling for each device
    for (const device of deviceList) {
      this.scheduleDevicePolling(device);
    }

    // Start statistics reporting
    this.statsInterval = setInterval(() => {
      this.reportStatistics();
    }, 60000); // Report every minute

    this.emit('started', {
      timestamp: new Date(),
      devicesScheduled: deviceList.length
    });

    console.log(`✅ Polling service started for ${deviceList.length} devices`);
  }

  /**
   * Stop polling service
   */
  stop() {
    if (!this.isRunning) {
      console.warn('⚠️  Polling service not running');
      return;
    }

    console.log('🛑 Stopping SNMP Polling Service...');
    this.isRunning = false;

    // Cancel all scheduled polls
    for (const [deviceId, timeout] of this.pollingSchedules) {
      clearTimeout(timeout);
    }
    this.pollingSchedules.clear();

    // Clear statistics interval
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    this.emit('stopped', { timestamp: new Date() });
    console.log('✅ Polling service stopped');
  }

  /**
   * Schedule polling for a device
   */
  scheduleDevicePolling(device) {
    if (!device || !device.id) {
      console.error('❌ Invalid device for scheduling');
      return;
    }

    const interval = device.polling_interval || this.config.pollingInterval;

    // Poll immediately
    this.pollDevice(device);

    // Schedule future polls
    const timeout = setInterval(async () => {
      if (this.isRunning && device.polling_enabled) {
        this.pollDevice(device);
      }
    }, interval);

    this.pollingSchedules.set(device.id, timeout);
    console.log(`📅 Scheduled polling for device ${device.name} (interval: ${interval}ms)`);
  }

  /**
   * Poll a single device
   */
  async pollDevice(device) {
    // Don't queue if already polling this device
    if (this.activePolls.has(device.id)) {
      console.warn(`⏳ Device ${device.name} poll already in progress, skipping`);
      return;
    }

    // Wait if too many concurrent polls
    if (this.activePolls.size >= this.config.concurrentPolls) {
      console.log(`⏳ Concurrent poll limit reached, waiting...`);
      return;
    }

    this.activePolls.add(device.id);

    try {
      const startTime = Date.now();

      // Simulate SNMP polling
      const metrics = await this.fetchDeviceMetrics(device);

      const responseTime = Date.now() - startTime;

      // Process collected metrics
      await this.processMetrics(device, metrics, responseTime);

      // Update statistics
      this.pollStats.totalPolls++;
      this.pollStats.successfulPolls++;
      this.pollStats.avgResponseTime = 
        (this.pollStats.avgResponseTime + responseTime) / 2;

      this.emit('pollSuccess', {
        deviceId: device.id,
        deviceName: device.name,
        metrics,
        responseTime,
        timestamp: new Date()
      });

      console.log(`✅ Polled ${device.name} (${responseTime}ms)`);
    } catch (error) {
      console.error(`❌ Poll failed for ${device.name}:`, error.message);

      this.pollStats.totalPolls++;
      this.pollStats.failedPolls++;

      this.emit('pollFailed', {
        deviceId: device.id,
        deviceName: device.name,
        error: error.message,
        timestamp: new Date()
      });

      // Generate alarm for unreachable device
      await this.generateUnreachableAlarm(device, error);
    } finally {
      this.activePolls.delete(device.id);
    }
  }

  /**
   * Fetch device metrics via SNMP
   */
  async fetchDeviceMetrics(device) {
    // Simulate SNMP fetch with random metrics
    return new Promise((resolve, reject) => {
      // Simulate network delay
      setTimeout(() => {
        // Random failure for demo
        if (Math.random() > 0.9) {
          reject(new Error('SNMP timeout'));
        } else {
          resolve({
            cpuUsage: Math.floor(Math.random() * 100),
            memoryUsage: Math.floor(Math.random() * 100),
            temperature: Math.floor(Math.random() * 80) + 20,
            uptime: Math.floor(Math.random() * 1000000000),
            interfaces: [
              {
                name: 'eth0',
                status: 'up',
                speed: 1000000000,
                inOctets: Math.floor(Math.random() * 1000000000),
                outOctets: Math.floor(Math.random() * 1000000000),
                inErrors: Math.floor(Math.random() * 100),
                outErrors: Math.floor(Math.random() * 100)
              }
            ]
          });
        }
      }, Math.random() * 1000 + 100);
    });
  }

  /**
   * Process collected metrics
   */
  async processMetrics(device, metrics, responseTime) {
    try {
      // Check thresholds
      const alerts = this.checkThresholds(device, metrics);

      // Store metrics (would go to database)
      const storedMetrics = {
        deviceId: device.id,
        metrics,
        timestamp: new Date(),
        responseTime,
        alerts
      };

      // Generate alarms if thresholds exceeded
      for (const alert of alerts) {
        await this.generateMetricAlarm(device, alert);
      }

      // Update device status in memory and database
      device.connection_status = 'online';
      device.last_polled = new Date();
      device.last_online = new Date();

      // Persist to database if deviceRepository is available
      if (this.deviceRepository) {
        await this.deviceRepository.updateStatus(device.id, 'online');
      }

      return storedMetrics;
    } catch (error) {
      console.error('Error processing metrics:', error);
      throw error;
    }
  }

  /**
   * Check metric thresholds
   */
  checkThresholds(device, metrics) {
    const alerts = [];
    const thresholds = device.thresholds || {};

    const cpuThreshold = thresholds.cpu || 80;
    const memThreshold = thresholds.memory || 80;
    const tempThreshold = thresholds.temperature || 80;

    if (metrics.cpuUsage > cpuThreshold) {
      alerts.push({
        type: 'cpu',
        severity: metrics.cpuUsage > 95 ? 'critical' : 'warning',
        value: metrics.cpuUsage,
        threshold: cpuThreshold
      });
    }

    if (metrics.memoryUsage > memThreshold) {
      alerts.push({
        type: 'memory',
        severity: metrics.memoryUsage > 95 ? 'critical' : 'warning',
        value: metrics.memoryUsage,
        threshold: memThreshold
      });
    }

    if (metrics.temperature > tempThreshold) {
      alerts.push({
        type: 'temperature',
        severity: metrics.temperature > 95 ? 'critical' : 'warning',
        value: metrics.temperature,
        threshold: tempThreshold
      });
    }

    return alerts;
  }

  /**
   * Generate metric-based alarm
   */
  async generateMetricAlarm(device, alert) {
    const severityMap = {
      cpu: 'CPU Usage Critical',
      memory: 'Memory Usage Critical',
      temperature: 'High Temperature'
    };

    const alarm = {
      device_id: device.id,
      device_name: device.name,
      message: `${severityMap[alert.type]}: ${alert.value}% (threshold: ${alert.threshold}%)`,
      severity: alert.severity,
      status: 'active',
      type: 'metric',
      timestamp: new Date()
    };

    this.emit('alarmGenerated', alarm);
    console.log(`🚨 Alarm generated: ${alarm.message}`);
  }

  /**
   * Generate unreachable device alarm
   */
  async generateUnreachableAlarm(device, error) {
    const alarm = {
      device_id: device.id,
      device_name: device.name,
      message: `Device is unreachable: ${error.message}`,
      severity: 'critical',
      status: 'active',
      type: 'connectivity',
      timestamp: new Date()
    };

    device.connection_status = 'offline';

    // Persist to database if deviceRepository is available
    if (this.deviceRepository) {
      await this.deviceRepository.updateStatus(device.id, 'offline');
    }

    this.emit('alarmGenerated', alarm);
    console.log(`🚨 Device offline: ${device.name}`);
  }

  /**
   * Report statistics
   */
  reportStatistics() {
    console.log('\n📊 Polling Statistics:');
    console.log(`   Total Polls: ${this.pollStats.totalPolls}`);
    console.log(`   Successful: ${this.pollStats.successfulPolls}`);
    console.log(`   Failed: ${this.pollStats.failedPolls}`);
    console.log(`   Avg Response: ${this.pollStats.avgResponseTime.toFixed(0)}ms`);
    console.log(`   Active Polls: ${this.activePolls.size}`);
    console.log(`   Success Rate: ${((this.pollStats.successfulPolls / (this.pollStats.totalPolls || 1)) * 100).toFixed(1)}%\n`);
  }

  /**
   * Add device to polling
   */
  addDevice(device) {
    if (this.isRunning) {
      this.scheduleDevicePolling(device);
    }
  }

  /**
   * Remove device from polling
   */
  removeDevice(deviceId) {
    const timeout = this.pollingSchedules.get(deviceId);
    if (timeout) {
      clearTimeout(timeout);
      this.pollingSchedules.delete(deviceId);
      console.log(`🗑️  Removed device ${deviceId} from polling`);
    }
  }

  /**
   * Get polling status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      devicesScheduled: this.pollingSchedules.size,
      activePolls: this.activePolls.size,
      statistics: this.pollStats,
      config: this.config
    };
  }

  /**
   * Poll device immediately
   */
  async pollNow(device) {
    console.log(`⚡ Immediate poll triggered for ${device.name}`);
    return this.pollDevice(device);
  }
}

module.exports = SNMPPollingService;
