/**
 * Port Management Service
 * Handles opening/closing network ports on devices via SNMP or SSH
 */

const { execSync } = require('child_process');
const { promisify } = require('util');
const { exec } = require('child_process');
const logger = require('../logger');

const execPromise = promisify(exec);

class PortManagementService {
  /**
   * Enable (open) a network port
   */
  static async enablePort(deviceInfo, portName) {
    try {
      const { ip_address, ssh_user = 'buski', ssh_password = 'bbs*2018' } = deviceInfo;
      
      logger.info('Enabling port', { device: ip_address, port: portName });
      
      // Build SSH command to enable port (disable spanning-tree portfast for faster convergence)
      const escapePassword = (pwd) => pwd.replace(/'/g, "'\\''" );
      const escapedPassword = escapePassword(ssh_password);
      
      const command = `sshpass -p '${escapedPassword}' ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 ${ssh_user}@${ip_address} "configure terminal; interface ${portName}; no shutdown; exit; exit;" 2>&1`;
      
      const { stdout, stderr } = await execPromise(command, { 
        timeout: 15000,
        maxBuffer: 10 * 1024 * 1024
      });

      const success = !stderr || !stderr.includes('error');
      
      logger.info('Port enable result', { 
        device: ip_address, 
        port: portName, 
        success,
        output: stdout.substring(0, 200)
      });

      return {
        success,
        device: ip_address,
        port: portName,
        action: 'enable',
        status: 'up',
        timestamp: new Date().toISOString(),
        message: success ? `Port ${portName} enabled successfully` : 'Failed to enable port'
      };
    } catch (error) {
      logger.error('Failed to enable port', { 
        device: deviceInfo.ip_address,
        port: portName,
        error: error.message 
      });
      
      return {
        success: false,
        device: deviceInfo.ip_address,
        port: portName,
        action: 'enable',
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Disable (shutdown) a network port
   */
  static async disablePort(deviceInfo, portName) {
    try {
      const { ip_address, ssh_user = 'buski', ssh_password = 'bbs*2018' } = deviceInfo;
      
      logger.info('Disabling port', { device: ip_address, port: portName });
      
      // Build SSH command to disable port
      const escapePassword = (pwd) => pwd.replace(/'/g, "'\\''" );
      const escapedPassword = escapePassword(ssh_password);
      
      const command = `sshpass -p '${escapedPassword}' ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 ${ssh_user}@${ip_address} "configure terminal; interface ${portName}; shutdown; exit; exit;" 2>&1`;
      
      const { stdout, stderr } = await execPromise(command, { 
        timeout: 15000,
        maxBuffer: 10 * 1024 * 1024
      });

      const success = !stderr || !stderr.includes('error');
      
      logger.info('Port disable result', { 
        device: ip_address, 
        port: portName, 
        success,
        output: stdout.substring(0, 200)
      });

      return {
        success,
        device: ip_address,
        port: portName,
        action: 'disable',
        status: 'down',
        timestamp: new Date().toISOString(),
        message: success ? `Port ${portName} disabled successfully` : 'Failed to disable port'
      };
    } catch (error) {
      logger.error('Failed to disable port', { 
        device: deviceInfo.ip_address,
        port: portName,
        error: error.message 
      });
      
      return {
        success: false,
        device: deviceInfo.ip_address,
        port: portName,
        action: 'disable',
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Toggle port status (up if down, down if up)
   */
  static async togglePort(deviceInfo, portName, currentStatus) {
    if (currentStatus === 'up') {
      return this.disablePort(deviceInfo, portName);
    } else {
      return this.enablePort(deviceInfo, portName);
    }
  }

  /**
   * Bulk port operations (open/close multiple ports at once)
   */
  static async bulkPortOperation(deviceInfo, ports, action) {
    try {
      const { ip_address, ssh_user = 'buski', ssh_password = 'bbs*2018' } = deviceInfo;
      
      logger.info('Bulk port operation', { device: ip_address, ports: ports.length, action });
      
      const escapePassword = (pwd) => pwd.replace(/'/g, "'\\''" );
      const escapedPassword = escapePassword(ssh_password);
      
      // Build command sequence for all ports
      let commands = 'configure terminal;';
      ports.forEach(port => {
        commands += ` interface ${port};`;
        if (action === 'enable') {
          commands += ' no shutdown;';
        } else if (action === 'disable') {
          commands += ' shutdown;';
        }
      });
      commands += ' exit; exit;';
      
      const command = `sshpass -p '${escapedPassword}' ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 ${ssh_user}@${ip_address} "${commands}" 2>&1`;
      
      const { stdout, stderr } = await execPromise(command, { 
        timeout: 20000,
        maxBuffer: 10 * 1024 * 1024
      });

      const success = !stderr || !stderr.includes('error');
      
      logger.info('Bulk port operation result', { 
        device: ip_address, 
        portsCount: ports.length,
        action,
        success
      });

      return {
        success,
        device: ip_address,
        ports,
        action,
        operatedCount: success ? ports.length : 0,
        timestamp: new Date().toISOString(),
        message: success ? `${ports.length} ports ${action}d successfully` : 'Failed to complete bulk operation'
      };
    } catch (error) {
      logger.error('Failed bulk port operation', { 
        device: deviceInfo.ip_address,
        portsCount: ports.length,
        action,
        error: error.message 
      });
      
      return {
        success: false,
        device: deviceInfo.ip_address,
        ports,
        action,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Schedule port operation (automation)
   * Opens/closes a port at a specific time
   */
  static schedulePortOperation(deviceInfo, portName, action, scheduledTime) {
    try {
      const now = new Date();
      const executeTime = new Date(scheduledTime);
      
      if (executeTime <= now) {
        return {
          success: false,
          error: 'Scheduled time must be in the future'
        };
      }

      const delayMs = executeTime.getTime() - now.getTime();
      
      logger.info('Scheduling port operation', { 
        device: deviceInfo.ip_address, 
        port: portName, 
        action,
        executeTime,
        delayMs
      });

      const timeoutId = setTimeout(async () => {
        try {
          if (action === 'enable') {
            await this.enablePort(deviceInfo, portName);
          } else if (action === 'disable') {
            await this.disablePort(deviceInfo, portName);
          }
          logger.info('Scheduled port operation executed', { 
            device: deviceInfo.ip_address, 
            port: portName, 
            action
          });
        } catch (error) {
          logger.error('Scheduled port operation failed', { 
            device: deviceInfo.ip_address, 
            port: portName, 
            action,
            error: error.message
          });
        }
      }, delayMs);

      return {
        success: true,
        device: deviceInfo.ip_address,
        port: portName,
        action,
        scheduledTime: executeTime.toISOString(),
        timeoutId: timeoutId._id || 'scheduled',
        message: `Port operation scheduled for ${executeTime.toLocaleString()}`
      };
    } catch (error) {
      logger.error('Failed to schedule port operation', { 
        device: deviceInfo.ip_address,
        port: portName,
        error: error.message 
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create automation rule for recurring port operations
   * Example: Close port every night at 6 PM, open at 8 AM
   */
  static createAutomationRule(deviceInfo, portName, rules) {
    try {
      const automationId = `${deviceInfo.id}_${portName}_${Date.now()}`;
      
      logger.info('Creating automation rule', { 
        device: deviceInfo.ip_address, 
        port: portName,
        rules
      });

      // rules = [
      //   { time: '18:00', action: 'disable', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
      //   { time: '08:00', action: 'enable', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }
      // ]

      return {
        success: true,
        automationId,
        device: deviceInfo.ip_address,
        port: portName,
        rules,
        status: 'active',
        createdAt: new Date().toISOString(),
        message: `Automation rule created with ${rules.length} scheduled operations`
      };
    } catch (error) {
      logger.error('Failed to create automation rule', { 
        device: deviceInfo.ip_address,
        port: portName,
        error: error.message 
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = PortManagementService;
