/**
 * Device Backup Service
 * Handles SSH connection to devices and configuration backup
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const logger = require('../logger');

const execPromise = promisify(exec);

class DeviceBackupService {
  /**
   * Get the appropriate command for retrieving configuration based on device vendor
   */
  static getConfigCommand(vendor = 'hp') {
    const commands = {
      hp: 'show run',
      cisco: 'show running-config',
      arista: 'show running-config',
      juniper: 'show configuration',
      dell: 'show running-config',
      fortinet: 'get system config',
      palo_alto: 'show running config',
      ubiquiti: 'show running',
      netgear: 'show running-config',
      tp_link: 'display current-configuration',
      default: 'show run'
    };
    return commands[vendor] || commands.default;
  }

  /**
   * Connect to device via SSH and retrieve running configuration
   */
  static async getDeviceConfiguration(deviceInfo) {
    try {
      const { ip_address, vendor = 'hp', ssh_user = 'buski', ssh_password = 'bbs*2018' } = deviceInfo;
      
      if (!ip_address) {
        throw new Error('Device IP address is required');
      }

      logger.info('Connecting to device for configuration backup', { 
        ip: ip_address, 
        user: ssh_user, 
        vendor: vendor 
      });

      // Get vendor-specific configuration command
      const configCommand = this.getConfigCommand(vendor);
      logger.debug('Using configuration command', { vendor, command: configCommand });
      
      // Use expect script for interactive SSH session
      // This handles HP switch behavior which requires interactive terminal
      // Pass command-line arguments properly quoted
      const command = `/app/get_device_config.sh ${ip_address} ${ssh_user} '${ssh_password}' '${configCommand}'`;
      
      logger.debug('Executing SSH command', { 
        ip: ip_address,
        command: `[SSH to ${ip_address} with user ${ssh_user}]`,
        timeout: '45000ms'
      });
      
      console.log(`[BACKUP DEBUG] Executing command for ${ip_address}`);
      console.log(`[BACKUP DEBUG] Command: ${command}`);
      console.log(`[BACKUP DEBUG] SSH_PASSWORD env set: ${!!ssh_password}`);
            
      let stdout = '';
      let stderr = '';
      try {
        const result = await execPromise(command, { 
          timeout: 45000, 
          maxBuffer: 10 * 1024 * 1024,
          shell: '/bin/sh'  // Alpine Linux uses sh, not bash
        });
        stdout = result.stdout || '';
        stderr = result.stderr || '';
      } catch (execError) {
        // Even if the process exits with an error code, the output might be valid
        // Capture any stdout/stderr that was returned
        stdout = execError.stdout || '';
        stderr = execError.stderr || '';
        console.log(`[BACKUP DEBUG] Command had exit code, but may have data. stdout: ${stdout.length} bytes`);
        // Don't throw - we'll validate the output below
      }
      
      console.log(`[BACKUP DEBUG] Command executed. stdout length: ${stdout?.length}, stderr: ${stderr?.length}`);
      let cleanedOutput = stdout || '';
      
      // Remove ANSI escape sequences (terminal control characters)
      cleanedOutput = cleanedOutput.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
      cleanedOutput = cleanedOutput.replace(/\[\d+;\d+[a-z]/g, '');
      cleanedOutput = cleanedOutput.replace(/\[\?[0-9]*[a-z]/g, '');
      cleanedOutput = cleanedOutput.replace(/\[[0-9]+[A-Za-z]/g, '');
      
      // Remove "-- MORE --" paging prompts
      cleanedOutput = cleanedOutput.replace(/-- MORE --.*/g, '');
      
      // Remove redundant triple newlines
      cleanedOutput = cleanedOutput.split('\n\n\n').join('\n\n');
      
      // Keep only lines after "Running configuration" to remove banner
      const configIndex = cleanedOutput.toLowerCase().indexOf('running configuration');
      if (configIndex !== -1) {
        cleanedOutput = cleanedOutput.substring(configIndex);
      }

      // Enhanced logging
      logger.debug('SSH command executed', { 
        ip: ip_address,
        stdoutLength: cleanedOutput ? cleanedOutput.length : 0,
        stderrLength: stderr ? stderr.length : 0,
        hasHostname: cleanedOutput ? cleanedOutput.toLowerCase().includes('hostname') : false,
        hasInterface: cleanedOutput ? cleanedOutput.toLowerCase().includes('interface') : false
      });

      // Check if we got actual configuration output
      if (cleanedOutput && cleanedOutput.trim().length > 100) {
        // Check for key indicators of real config
        const hasConfigIndicators = cleanedOutput.toLowerCase().includes('hostname') || 
                                    cleanedOutput.toLowerCase().includes('interface') || 
                                    cleanedOutput.toLowerCase().includes('router') ||
                                    cleanedOutput.toLowerCase().includes('address');
        
        if (hasConfigIndicators) {
          logger.info('✅ Full configuration retrieved successfully via SSH', { 
            ip: ip_address, 
            size: cleanedOutput.length,
            vendor: vendor
          });
          return {
            success: true,
            configuration: cleanedOutput,
            size: cleanedOutput.length,
            timestamp: new Date().toISOString()
          };
        } else {
          // Got output but missing expected config indicators
          logger.warn('⚠️  Partial/unexpected configuration from SSH', { 
            ip: ip_address, 
            size: cleanedOutput.length,
            firstChars: cleanedOutput.substring(0, 100)
          });
          return {
            success: true,
            configuration: cleanedOutput,
            size: cleanedOutput.length,
            timestamp: new Date().toISOString()
          };
        }
      } else {
        // No meaningful output
        const errorMsg = stderr ? stderr.substring(0, 200) : 'No output received';
        logger.error('❌ SSH returned no configuration', { 
          ip: ip_address,
          stdout: stdout ? stdout.substring(0, 100) : 'empty',
          stderr: errorMsg
        });
        throw new Error(`No configuration returned from device. Error: ${errorMsg}`);
      }
    } catch (error) {
      logger.warn('❌ Failed to retrieve device configuration via SSH', { 
        error: error.message,
        stdout: error.stdout || 'none',
        stderr: error.stderr || 'none',
        code: error.code,
        ip: deviceInfo.ip_address,
        vendor: deviceInfo.vendor
      });

      // Return fallback configuration if SSH fails
      return {
        success: false,
        error: error.message,
        configuration: this.generateFallbackConfiguration(deviceInfo),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate fallback configuration when SSH is unavailable
   */
  static generateFallbackConfiguration(deviceInfo) {
    const { name, ip_address, vendor, device_type, snmp_community } = deviceInfo;
    
    return `; Device Configuration Backup
; Device: ${name}
; IP Address: ${ip_address}
; Vendor: ${vendor}
; Device Type: ${device_type}
; Backup Date: ${new Date().toISOString()}

hostname "${name}"
ip address ${ip_address} 255.255.255.0
ip default-gateway 10.5.0.1
snmp-server community "${snmp_community}" unrestricted
no dhcp config-file-update
password manager

; Note: This is a fallback configuration generated because SSH connection failed.
; Please manually retrieve the actual configuration using SSH and the 'show run' command.
; SSH Connection Details:
; - Address: ${ip_address}
; - Port: 22
; - Username: buski
; - Command: show run
`;
  }

  /**
   * Format configuration for storage
   */
  static formatBackupContent(deviceInfo, configContent, isRealConfig = false) {
    const header = `################################################################################
# NMS DEVICE CONFIGURATION BACKUP
################################################################################
# Created: ${new Date().toISOString()}
# Device: ${deviceInfo.name}
# IP Address: ${deviceInfo.ip_address}
# Vendor: ${deviceInfo.vendor}
# Device Type: ${deviceInfo.device_type}
# Configuration Type: ${isRealConfig ? 'ACTUAL (via SSH)' : 'FALLBACK (Simulated)'}
# Configuration Size: ${configContent.length} bytes
################################################################################

${configContent}

################################################################################
# END OF CONFIGURATION
################################################################################
`;
    return header;
  }
}

module.exports = DeviceBackupService;
