/**
 * NMS Backend API Routes
 * Main router for all API endpoints
 */

const express = require('express');
const router = express.Router();
const database = require('../database');
const logger = require('../logger');
const deviceRepository = require('../services/deviceRepository');
const alarmRepository = require('../services/alarmRepository');
const metricsRepository = require('../services/metricsRepository');
const DeviceBackupService = require('../services/deviceBackupService');
const DiffService = require('../services/diffService');
const PortManagementService = require('../services/portManagementService');

// ============= AUTH ENDPOINTS =============

/**
 * POST /api/auth/login
 * User login endpoint
 */
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Demo authentication - in production, validate against database
    if (email === 'admin@nms.local' && password === 'admin123') {
      const token = 'demo_token_' + Date.now();
      const user = {
        id: 1,
        email: 'admin@nms.local',
        name: 'Admin User',
        role: 'admin',
        permissions: ['view_devices', 'manage_devices', 'view_alarms', 'manage_alarms']
      };

      res.json({
        success: true,
        data: {
          token,
          user
        }
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
  } catch (error) {
    logger.error('Login failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * User logout endpoint
 */
router.post('/auth/logout', async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// ============= HEALTH CHECK =============

/**
 * GET /api/health
 * Check backend health status
 */
router.get('/health', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbHealth
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// ============= DEVICES ENDPOINTS =============

/**
 * GET /api/devices
 * Get all devices
 */
router.get('/devices', async (req, res) => {
  try {
    const devices = await deviceRepository.getAll();
    res.json({
      success: true,
      data: devices
    });
  } catch (error) {
    logger.error('Failed to fetch devices', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/devices/:id
 * Get a specific device by ID
 */
router.get('/devices/:id', async (req, res) => {
  try {
    const device = await deviceRepository.getById(req.params.id);
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    // Fetch additional metrics
    const metricsData = await metricsRepository.getByDevice(device.id);
    const metrics = Array.isArray(metricsData) ? metricsData : [];
    
    const interfacesResult = await database.query(
      `SELECT id, name, ip_address, status, in_octets, out_octets, in_errors, out_errors, 
              speed, mtu, type, last_updated
       FROM interfaces WHERE device_id = $1
       ORDER BY name`,
      [device.id]
    );
    let interfaces = Array.isArray(interfacesResult) ? interfacesResult : interfacesResult.rows || [];
    
    // Sort interfaces numerically (GigabitEthernet 1/1, 1/2, ..., 1/24)
    interfaces.sort((a, b) => {
      const regexA = /\d+\/(\d+)/.exec(a.name);
      const regexB = /\d+\/(\d+)/.exec(b.name);
      if (regexA && regexB) {
        return parseInt(regexA[1], 10) - parseInt(regexB[1], 10);
      }
      return a.name.localeCompare(b.name);
    });

    res.json({
      success: true,
      data: {
        ...device,
        metrics: metrics,
        interfaces: interfaces
      }
    });
  } catch (error) {
    logger.error('Failed to fetch device', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/devices
 * Create a new device
 */
router.post('/devices', async (req, res) => {
  try {
    const device = await deviceRepository.create(req.body);
    res.status(201).json({
      success: true,
      data: device
    });
  } catch (error) {
    logger.error('Failed to create device', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/devices/:id
 * Update a device
 */
router.put('/devices/:id', async (req, res) => {
  try {
    const device = await deviceRepository.update(req.params.id, req.body);
    res.json({
      success: true,
      data: device
    });
  } catch (error) {
    logger.error('Failed to update device', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/devices/:id
 * Delete a device
 */
router.delete('/devices/:id', async (req, res) => {
  try {
    await deviceRepository.delete(req.params.id);
    res.json({
      success: true,
      message: 'Device deleted'
    });
  } catch (error) {
    logger.error('Failed to delete device', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/devices/:id/test-connection
 * Test device connection
 */
router.post('/devices/:id/test-connection', async (req, res) => {
  try {
    const result = await deviceRepository.testConnection(req.params.id);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Device connection test failed', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= ALARMS ENDPOINTS =============

/**
 * GET /api/alarms
 * Get all alarms
 */
router.get('/alarms', async (req, res) => {
  try {
    const alarms = await alarmRepository.getAll();
    res.json({
      success: true,
      data: alarms
    });
  } catch (error) {
    logger.error('Failed to fetch alarms', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/alarms/:id
 * Get a specific alarm by ID
 */
router.get('/alarms/:id', async (req, res) => {
  try {
    const alarm = await alarmRepository.getById(req.params.id);
    if (!alarm) {
      return res.status(404).json({
        success: false,
        error: 'Alarm not found'
      });
    }
    res.json({
      success: true,
      data: alarm
    });
  } catch (error) {
    logger.error('Failed to fetch alarm', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/alarms
 * Create a new alarm
 */
router.post('/alarms', async (req, res) => {
  try {
    const alarm = await alarmRepository.create(req.body);
    res.status(201).json({
      success: true,
      data: alarm
    });
  } catch (error) {
    logger.error('Failed to create alarm', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/alarms/:id/acknowledge
 * Acknowledge an alarm
 */
router.put('/alarms/:id/acknowledge', async (req, res) => {
  try {
    const alarm = await alarmRepository.acknowledgeAlarm(req.params.id, req.body.acknowledgedBy);
    res.json({
      success: true,
      data: alarm
    });
  } catch (error) {
    logger.error('Failed to acknowledge alarm', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/alarms/:id/resolve
 * Resolve an alarm
 */
router.put('/alarms/:id/resolve', async (req, res) => {
  try {
    const alarm = await alarmRepository.resolveAlarm(req.params.id, req.body.resolvedBy);
    res.json({
      success: true,
      data: alarm
    });
  } catch (error) {
    logger.error('Failed to resolve alarm', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= METRICS ENDPOINTS =============

/**
 * GET /api/metrics/device/:deviceId
 * Get metrics for a specific device
 */
router.get('/metrics/device/:deviceId', async (req, res) => {
  try {
    const metrics = await metricsRepository.getDeviceMetrics(req.params.deviceId);
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Failed to fetch device metrics', { error: error.message, deviceId: req.params.deviceId });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/metrics/system
 * Get system-wide metrics
 */
router.get('/metrics/system', async (req, res) => {
  try {
    const metrics = await metricsRepository.getSystemMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Failed to fetch system metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/metrics
 * Record new metrics
 */
router.post('/metrics', async (req, res) => {
  try {
    const metric = await metricsRepository.createMetric(req.body);
    res.status(201).json({
      success: true,
      data: metric
    });
  } catch (error) {
    logger.error('Failed to create metric', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= VENDORS ENDPOINTS =============

/**
 * GET /api/vendors
 * Get all vendors
 */
router.get('/vendors', async (req, res) => {
  try {
    // Support 'all' parameter to fetch all vendors including inactive ones
    const includeInactive = req.query.all === 'true';
    const whereClause = includeInactive ? '' : 'WHERE active = TRUE';
    
    const result = await database.query(
      `SELECT id, name, display_name, category, description, active, created_at FROM vendors ${whereClause} ORDER BY display_name ASC`
    );
    res.json({
      success: true,
      data: result.rows || []
    });
  } catch (error) {
    logger.error('Failed to fetch vendors', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/vendors/:id
 * Get a specific vendor by ID
 */
router.get('/vendors/:id', async (req, res) => {
  try {
    const result = await database.query(
      'SELECT id, name, display_name, category, description, active, created_at FROM vendors WHERE id = $1',
      [req.params.id]
    );
    
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to fetch vendor', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/vendors
 * Create a new vendor
 */
router.post('/vendors', async (req, res) => {
  try {
    const { name, display_name, category, description, active } = req.body;
    
    if (!name || !display_name) {
      return res.status(400).json({
        success: false,
        error: 'Name and display_name are required'
      });
    }
    
    const result = await database.query(
      'INSERT INTO vendors (name, display_name, category, description, active) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, display_name, category, description, active, created_at',
      [name, display_name, category || 'Networking', description || null, active !== false]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to create vendor', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/vendors/:id
 * Update a vendor
 */
router.put('/vendors/:id', async (req, res) => {
  try {
    const { name, display_name, category, description, active } = req.body;
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    if (display_name !== undefined) {
      updates.push(`display_name = $${paramCount}`);
      values.push(display_name);
      paramCount++;
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount}`);
      values.push(category);
      paramCount++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }
    if (active !== undefined) {
      updates.push(`active = $${paramCount}`);
      values.push(active);
      paramCount++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    values.push(req.params.id);
    const query = `UPDATE vendors SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, name, display_name, category, description, active, created_at`;
    
    const result = await database.query(query, values);
    
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to update vendor', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/vendors/:id
 * Delete a vendor
 */
router.delete('/vendors/:id', async (req, res) => {
  try {
    const result = await database.query(
      'DELETE FROM vendors WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Vendor deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete vendor', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= USERS ENDPOINTS =============

/**
 * GET /api/users
 * Get all users
 */
router.get('/users', async (req, res) => {
  try {
    const result = await database.query(
      'SELECT id, email, name, role, is_active as status, created_at FROM users ORDER BY email ASC'
    );
    res.json({
      success: true,
      data: result.rows || []
    });
  } catch (error) {
    logger.error('Failed to fetch users', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/users
 * Create a new user
 */
router.post('/users', async (req, res) => {
  try {
    const { email, username, full_name, role } = req.body;
    
    if (!email || !username) {
      return res.status(400).json({
        success: false,
        error: 'Email and username are required'
      });
    }
    
    const result = await database.query(
      'INSERT INTO users (email, password_hash, name, role, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, is_active as status, created_at',
      [email, 'temp_password', full_name || username, role || 'viewer', true]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to create user', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/users/:id
 * Update a user
 */
router.put('/users/:id', async (req, res) => {
  try {
    const { status, role } = req.body;
    const is_active = status === 'active' || status === true;
    
    const result = await database.query(
      'UPDATE users SET is_active = $1, role = $2 WHERE id = $3 RETURNING id, email, name, role, is_active as status, created_at',
      [is_active, role || 'viewer', req.params.id]
    );
    
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to update user', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/users/:id
 * Delete a user
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const result = await database.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete user', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= SETTINGS ENDPOINTS =============

/**
 * GET /api/settings
 * Get all system settings
 */
router.get('/settings', async (req, res) => {
  try {
    const result = await database.query(
      'SELECT setting_key, setting_value, setting_type FROM settings WHERE is_system = false ORDER BY setting_key ASC'
    );
    
    // Convert to object format
    const settings = {};
    result.rows.forEach(row => {
      let value = row.setting_value;
      if (row.setting_type === 'integer') {
        value = parseInt(value, 10);
      }
      settings[row.setting_key] = value;
    });
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error('Failed to fetch settings', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/settings
 * Update system settings
 */
router.put('/settings', async (req, res) => {
  try {
    const settings = req.body;
    
    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      await database.query(
        'UPDATE settings SET setting_value = $1 WHERE setting_key = $2',
        [String(value), key]
      );
    }
    
    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update settings', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/auth/settings
 * Get authentication settings
 */
router.get('/auth/settings', async (req, res) => {
  try {
    // Return default auth settings
    const authSettings = {
      password_policy: {
        min_length: 8,
        expiry_days: 90,
        require_uppercase: true,
        require_numbers: true,
        require_special_chars: true
      },
      session_policy: {
        session_timeout_minutes: 30,
        max_sessions_per_user: 5
      },
      mfa_policy: {
        mfa_required_for_admin: false
      },
      login_policy: {
        max_failed_attempts: 5,
        lockout_duration_minutes: 15
      },
      audit_settings: {
        enable_audit_logging: true,
        log_successful_logins: false
      }
    };
    
    res.json({
      success: true,
      data: authSettings
    });
  } catch (error) {
    logger.error('Failed to fetch auth settings', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/auth/settings
 * Update authentication settings
 */
router.put('/auth/settings', async (req, res) => {
  try {
    // In a real application, these would be persisted to the database
    // For now, we just acknowledge the update
    res.json({
      success: true,
      message: 'Authentication settings updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update auth settings', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= BACKUP ENDPOINTS =============

/**
 * POST /api/backups
 * Create a new backup for a device
 * Request body:
 *   - device_id (number): Device ID
 *   - backup_type (string): Type of backup (running-config, startup-config, full-backup, system-logs)
 *   - backup_name (string): Name for this backup
 *   - description (string, optional): Description
 *   - schedule (string): Schedule type (once, daily, weekly, monthly)
 *   - schedule_time (string, optional): Time for scheduled backups
 */
router.post('/backups', async (req, res) => {
  logger.info('POST /backups called', { body: req.body });
  
  try {
    const { device_id, backup_type, backup_name, description, schedule, schedule_time } = req.body;

    // Validate required fields
    if (!device_id || !backup_type || !backup_name) {
      return res.status(400).json({
        success: false,
        error: 'device_id, backup_type, and backup_name are required'
      });
    }

    // Fetch device information from database
    logger.debug('Fetching device information', { device_id });
    const deviceResult = await database.queryOne(
      'SELECT id, name, ip_address, vendor, device_type, snmp_community FROM devices WHERE id = $1',
      [device_id]
    );

    if (!deviceResult) {
      return res.status(404).json({
        success: false,
        error: `Device with ID ${device_id} not found`
      });
    }

    // Get device configuration via SSH
    logger.info('Retrieving device configuration', { 
      device_id, 
      device_name: deviceResult.name,
      vendor: deviceResult.vendor,
      backup_type: backup_type
    });
    const backupResult = await DeviceBackupService.getDeviceConfiguration(deviceResult);

    // Log the result
    if (backupResult.success) {
      logger.info('✅ Device configuration retrieved successfully', {
        device_id,
        config_size: backupResult.configuration.length,
        vendor: deviceResult.vendor
      });
    } else {
      logger.warn('⚠️  Using fallback configuration due to SSH failure', {
        device_id,
        error: backupResult.error,
        fallback_size: backupResult.configuration.length
      });
    }

    if (!backupResult.configuration) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve device configuration'
      });
    }

    // Format the backup content
    const formattedContent = DeviceBackupService.formatBackupContent(
      deviceResult,
      backupResult.configuration,
      backupResult.success
    );

    // Calculate checksum for integrity verification
    const crypto = require('crypto');
    const checksum = crypto
      .createHash('sha256')
      .update(formattedContent)
      .digest('hex');

    // Create backup file name with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const backupFileName = `${deviceResult.name}_${backup_type}_${timestamp}.cfg`;

    // Insert backup record into database
    logger.debug('Inserting backup record', { device_id, backup_type, file_name: backupFileName });
    const insertResult = await database.query(
      `INSERT INTO backups 
       (device_id, backup_type, backup_file, description, size_bytes, checksum, configuration, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id, device_id, backup_type, backup_file, description, size_bytes, checksum, created_at`,
      [
        device_id,
        backup_type,
        backupFileName,
        description || null,
        formattedContent.length,
        checksum,
        formattedContent
      ]
    );

    const backupRecord = insertResult.rows[0];

    // Log the successful backup creation
    logger.info('Backup created successfully', {
      backup_id: backupRecord.id,
      device_id,
      device_name: deviceResult.name,
      backup_type,
      file_size: backupRecord.size_bytes,
      file_name: backupFileName
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Backup created successfully',
      data: {
        id: backupRecord.id,
        device_id: backupRecord.device_id,
        device_name: deviceResult.name,
        backup_type: backupRecord.backup_type,
        backup_name,
        backup_file: backupRecord.backup_file,
        description: backupRecord.description,
        size_bytes: backupRecord.size_bytes,
        checksum: backupRecord.checksum,
        created_at: backupRecord.created_at,
        is_real_config: backupResult.success
      }
    });

  } catch (error) {
    logger.error('Failed to create backup', { 
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create backup'
    });
  }
});

/**
 * POST /api/backups/:id/upload-config
 * Upload actual device configuration to replace fallback configuration
 * Request body:
 *   - configuration (string): Raw device configuration text
 *   - description (string, optional): Update backup description
 */
router.post('/backups/:id/upload-config', async (req, res) => {
  logger.info('POST /backups/:id/upload-config called', { backup_id: req.params.id });
  
  try {
    const { configuration, description } = req.body;

    // Validate required fields
    if (!configuration || typeof configuration !== 'string' || configuration.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Configuration text is required and must be a non-empty string'
      });
    }

    // Fetch existing backup
    const backupResult = await database.queryOne(
      'SELECT id, device_id FROM backups WHERE id = $1',
      [req.params.id]
    );

    if (!backupResult) {
      return res.status(404).json({
        success: false,
        error: `Backup with ID ${req.params.id} not found`
      });
    }

    // Fetch device info for metadata header
    const deviceResult = await database.queryOne(
      'SELECT id, name, ip_address, vendor, device_type FROM devices WHERE id = $1',
      [backupResult.device_id]
    );

    // Format the backup content with header
    const formattedContent = DeviceBackupService.formatBackupContent(
      deviceResult,
      configuration,
      true  // Mark as real configuration
    );

    // Calculate new checksum
    const crypto = require('crypto');
    const checksum = crypto
      .createHash('sha256')
      .update(formattedContent)
      .digest('hex');

    // Update backup record with actual configuration
    const updateQuery = `
      UPDATE backups 
      SET configuration = $1, 
          size_bytes = $2, 
          checksum = $3, 
          description = COALESCE($4, description),
          updated_at = NOW()
      WHERE id = $5
      RETURNING id, device_id, backup_type, backup_file, description, size_bytes, checksum, created_at, updated_at
    `;

    const updateResult = await database.query(
      updateQuery,
      [
        formattedContent,
        formattedContent.length,
        checksum,
        description || null,
        req.params.id
      ]
    );

    const updatedBackup = updateResult.rows[0];

    logger.info('Configuration uploaded successfully', {
      backup_id: req.params.id,
      device_id: backupResult.device_id,
      new_size: updatedBackup.size_bytes,
      new_checksum: checksum
    });

    res.json({
      success: true,
      message: 'Backup configuration updated successfully',
      data: {
        id: updatedBackup.id,
        device_id: updatedBackup.device_id,
        backup_type: updatedBackup.backup_type,
        backup_file: updatedBackup.backup_file,
        description: updatedBackup.description,
        size_bytes: updatedBackup.size_bytes,
        checksum: updatedBackup.checksum,
        updated_at: updatedBackup.updated_at,
        is_real_config: true
      }
    });

  } catch (error) {
    logger.error('Failed to upload backup configuration', { 
      backup_id: req.params.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload configuration'
    });
  }
});

/**
 * GET /api/backups/:id/config
 * Retrieve the stored configuration for a backup
 */
router.get('/backups/:id/config', async (req, res) => {
  logger.info('GET /backups/:id/config called', { backup_id: req.params.id });
  
  try {
    // Fetch backup with its configuration
    const backupResult = await database.queryOne(
      `SELECT b.id, b.device_id, d.name as device_name, b.backup_type, b.backup_file, 
              b.description, b.configuration, b.size_bytes, b.checksum, b.created_at, b.updated_at
       FROM backups b
       LEFT JOIN devices d ON b.device_id = d.id
       WHERE b.id = $1`,
      [req.params.id]
    );

    if (!backupResult) {
      return res.status(404).json({
        success: false,
        error: `Backup with ID ${req.params.id} not found`
      });
    }

    // Check if configuration is stored
    if (!backupResult.configuration) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found for this backup. The backup may only contain metadata.',
        data: {
          id: backupResult.id,
          device_id: backupResult.device_id,
          device_name: backupResult.device_name,
          backup_type: backupResult.backup_type,
          size_bytes: backupResult.size_bytes,
          checksum: backupResult.checksum,
          created_at: backupResult.created_at,
          note: 'No configuration stored. Use POST /api/backups/:id/upload-config to add configuration.'
        }
      });
    }

    logger.info('Configuration retrieved successfully', {
      backup_id: req.params.id,
      device_id: backupResult.device_id,
      config_size: backupResult.configuration.length
    });

    res.json({
      success: true,
      data: {
        id: backupResult.id,
        device_id: backupResult.device_id,
        device_name: backupResult.device_name,
        backup_type: backupResult.backup_type,
        backup_file: backupResult.backup_file,
        description: backupResult.description,
        configuration: backupResult.configuration,
        size_bytes: backupResult.size_bytes,
        checksum: backupResult.checksum,
        created_at: backupResult.created_at,
        updated_at: backupResult.updated_at
      }
    });

  } catch (error) {
    logger.error('Failed to retrieve backup configuration', { 
      backup_id: req.params.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve configuration'
    });
  }
});

/**
 * GET /api/backups
 * Get all backups
 */
router.get('/backups', async (req, res) => {
  try {
    logger.debug('Fetching all backups');
    const result = await database.query(
      `SELECT b.id, b.device_id, d.name as device_name, b.backup_type, b.backup_file as file_name, 
              b.description, b.size_bytes as file_size, b.created_at, 
              'success' as status, b.checksum 
       FROM backups b 
       LEFT JOIN devices d ON b.device_id = d.id 
       ORDER BY b.created_at DESC`
    );
    const backups = Array.isArray(result) ? result : (result.rows || []);
    logger.debug('Successfully fetched backups', { count: backups.length });
    res.json({
      success: true,
      data: backups
    });
  } catch (error) {
    logger.error('Failed to fetch backups', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/backups/device/:device_id
 * Get backups for a specific device
 */
router.get('/backups/device/:device_id', async (req, res) => {
  try {
    const result = await database.query(
      `SELECT b.id, b.device_id, d.name as device_name, b.backup_type, b.backup_file as file_name, 
              b.description, b.size_bytes as file_size, b.created_at, 
              'success' as status, b.checksum 
       FROM backups b 
       LEFT JOIN devices d ON b.device_id = d.id 
       WHERE b.device_id = $1 
       ORDER BY b.created_at DESC`,
      [req.params.device_id]
    );
    res.json({
      success: true,
      data: result.rows || []
    });
  } catch (error) {
    logger.error('Failed to fetch device backups', { error: error.message, device_id: req.params.device_id });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/backups/:id
 * Delete a backup
 */
router.delete('/backups/:id', async (req, res) => {
  try {
    const result = await database.queryOne(
      `DELETE FROM backups WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Backup not found'
      });
    }
    
    logger.info('Backup deleted', { backup_id: req.params.id });
    res.json({
      success: true,
      message: 'Backup deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete backup', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/backups/:id/restore
 * Restore a backup to the device
 */
router.post('/backups/:id/restore', async (req, res) => {
  try {
    // Get backup details
    const backup = await database.queryOne(
      `SELECT b.id, b.device_id, b.backup_file, d.name as device_name 
       FROM backups b 
       LEFT JOIN devices d ON b.device_id = d.id 
       WHERE b.id = $1`,
      [req.params.id]
    );
    
    if (!backup) {
      return res.status(404).json({
        success: false,
        error: 'Backup not found'
      });
    }
    
    // Simulate restore process
    // In production, this would:
    // 1. Connect to the device via SSH/SNMP
    // 2. Push the backup configuration to the device
    // 3. Verify the configuration was applied
    
    logger.info('Backup restore initiated', { 
      backup_id: req.params.id, 
      device_id: backup.device_id,
      device_name: backup.device_name,
      backup_file: backup.backup_file
    });
    
    res.json({
      success: true,
      message: `Backup restored to device ${backup.device_name}`,
      data: {
        backup_id: backup.id,
        device_id: backup.device_id,
        device_name: backup.device_name,
        backup_file: backup.backup_file,
        restored_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to restore backup', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/backups/:id/download
 * Download backup file
 */
router.get('/backups/:id/download', async (req, res) => {
  try {
    // Get backup details WITH stored configuration
    const backup = await database.queryOne(
      `SELECT b.id, b.device_id, b.backup_file, b.configuration,
              d.name as device_name
       FROM backups b 
       LEFT JOIN devices d ON b.device_id = d.id 
       WHERE b.id = $1`,
      [req.params.id]
    );
    
    if (!backup) {
      return res.status(404).json({
        success: false,
        error: 'Backup not found'
      });
    }
    
    // Use stored configuration or generate new one
    const backupContent = backup.configuration || 'Configuration not available';
    
    // Set headers for file download
    const filename = `${backup.backup_file}.txt`;
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', backupContent.length);
    
    logger.info('Backup downloaded', { backup_id: req.params.id, device_id: backup.device_id });
    
    // Send file content
    res.send(backupContent);
  } catch (error) {
    logger.error('Failed to download backup', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/backups/:id/upload-config
 * Upload actual device configuration (manual upload)
 */
router.post('/backups/:id/upload-config', async (req, res) => {
  try {
    const { configuration } = req.body;
    
    if (!configuration) {
      return res.status(400).json({
        success: false,
        error: 'Configuration content is required'
      });
    }

    // Get backup details
    const backup = await database.queryOne(
      `SELECT b.id, b.device_id, d.name as device_name 
       FROM backups b 
       LEFT JOIN devices d ON b.device_id = d.id 
       WHERE b.id = $1`,
      [req.params.id]
    );
    
    if (!backup) {
      return res.status(404).json({
        success: false,
        error: 'Backup not found'
      });
    }

    // Format the configuration with headers
    const formattedConfig = `################################################################################
# NMS DEVICE CONFIGURATION BACKUP
################################################################################
# Created: ${new Date().toISOString()}
# Device: ${backup.device_name}
# Configuration Type: ACTUAL (Manual Upload)
# Configuration Size: ${configuration.length} bytes
################################################################################

${configuration}

################################################################################
# END OF CONFIGURATION
################################################################################
`;

    // Update backup with actual configuration
    const result = await database.queryOne(
      `UPDATE backups 
       SET configuration = $1, size_bytes = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, device_id, backup_type as file_name, size_bytes as file_size, created_at`,
      [formattedConfig, formattedConfig.length, req.params.id]
    );

    logger.info('Backup configuration updated', { backup_id: req.params.id, size: formattedConfig.length });
    
    res.json({
      success: true,
      message: 'Configuration uploaded successfully',
      data: {
        backup_id: result.id,
        device_id: result.device_id,
        size_bytes: result.file_size,
        configuration_type: 'ACTUAL (Manual Upload)'
      }
    });
  } catch (error) {
    logger.error('Failed to upload configuration', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/backups/compare/:id1/:id2
 * Compare two backup configurations and show differences
 */
router.get('/backups/compare/:id1/:id2', async (req, res) => {
  try {
    const { id1, id2 } = req.params;

    // Fetch both backups
    const backup1 = await database.queryOne(
      `SELECT b.id, b.configuration, d.name as device_name, b.created_at 
       FROM backups b 
       LEFT JOIN devices d ON b.device_id = d.id 
       WHERE b.id = $1`,
      [id1]
    );

    const backup2 = await database.queryOne(
      `SELECT b.id, b.configuration, d.name as device_name, b.created_at 
       FROM backups b 
       LEFT JOIN devices d ON b.device_id = d.id 
       WHERE b.id = $1`,
      [id2]
    );

    if (!backup1 || !backup2) {
      return res.status(404).json({
        success: false,
        error: 'One or both backups not found'
      });
    }

    if (!backup1.configuration || !backup2.configuration) {
      return res.status(400).json({
        success: false,
        error: 'One or both backups have no configuration content'
      });
    }

    // Generate diff
    const diffResult = DiffService.compareConfigurations(
      backup1.configuration,
      backup2.configuration,
      `Backup #${id1} (${new Date(backup1.created_at).toLocaleString()})`,
      `Backup #${id2} (${new Date(backup2.created_at).toLocaleString()})`
    );

    const categorized = DiffService.categorizeChanges({
      added: diffResult.changes.added,
      removed: diffResult.changes.removed,
      modified: diffResult.changes.modified,
      unchanged: diffResult.changes.unchanged
    });

    logger.info('Backup comparison performed', { backup1_id: id1, backup2_id: id2 });

    res.json({
      success: true,
      data: {
        summary: diffResult.summary,
        categorized,
        diffReport: diffResult.diffReport
      }
    });
  } catch (error) {
    logger.error('Failed to compare backups', { error: error.message, id1: req.params.id1, id2: req.params.id2 });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============= PORT MANAGEMENT =============

/**
 * POST /api/devices/:id/ports/:portName/enable
 * Enable (open) a network port
 */
router.post('/devices/:id/ports/:portName/enable', async (req, res) => {
  try {
    const device = await deviceRepository.getById(req.params.id);
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    const result = await PortManagementService.enablePort(device, req.params.portName);
    
    res.json({
      success: result.success,
      data: result,
      message: result.message
    });
  } catch (error) {
    logger.error('Failed to enable port', { error: error.message, id: req.params.id, port: req.params.portName });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/devices/:id/ports/:portName/disable
 * Disable (shutdown) a network port
 */
router.post('/devices/:id/ports/:portName/disable', async (req, res) => {
  try {
    const device = await deviceRepository.getById(req.params.id);
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    const result = await PortManagementService.disablePort(device, req.params.portName);
    
    res.json({
      success: result.success,
      data: result,
      message: result.message
    });
  } catch (error) {
    logger.error('Failed to disable port', { error: error.message, id: req.params.id, port: req.params.portName });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/devices/:id/ports/:portName/toggle
 * Toggle port status
 */
router.post('/devices/:id/ports/:portName/toggle', async (req, res) => {
  try {
    const device = await deviceRepository.getById(req.params.id);
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    const { currentStatus } = req.body;
    const result = await PortManagementService.togglePort(device, req.params.portName, currentStatus);
    
    res.json({
      success: result.success,
      data: result,
      message: result.message
    });
  } catch (error) {
    logger.error('Failed to toggle port', { error: error.message, id: req.params.id, port: req.params.portName });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/devices/:id/ports/bulk-operation
 * Bulk enable/disable multiple ports
 */
router.post('/devices/:id/ports/bulk-operation', async (req, res) => {
  try {
    const device = await deviceRepository.getById(req.params.id);
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    const { ports, action } = req.body;
    if (!ports || !Array.isArray(ports) || ports.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Ports array is required'
      });
    }

    if (!action || !['enable', 'disable'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Action must be "enable" or "disable"'
      });
    }

    const result = await PortManagementService.bulkPortOperation(device, ports, action);
    
    res.json({
      success: result.success,
      data: result,
      message: result.message
    });
  } catch (error) {
    logger.error('Failed bulk port operation', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/devices/:id/ports/:portName/schedule
 * Schedule port operation for a specific time
 */
router.post('/devices/:id/ports/:portName/schedule', async (req, res) => {
  try {
    const device = await deviceRepository.getById(req.params.id);
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    const { action, scheduledTime } = req.body;
    if (!action || !scheduledTime) {
      return res.status(400).json({
        success: false,
        error: 'Action and scheduledTime are required'
      });
    }

    const result = PortManagementService.schedulePortOperation(device, req.params.portName, action, scheduledTime);
    
    res.json({
      success: result.success,
      data: result,
      message: result.message
    });
  } catch (error) {
    logger.error('Failed to schedule port operation', { error: error.message, id: req.params.id, port: req.params.portName });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/devices/:id/ports/:portName/automation
 * Create automation rule for recurring port operations
 */
router.post('/devices/:id/ports/:portName/automation', async (req, res) => {
  try {
    const device = await deviceRepository.getById(req.params.id);
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    const { rules } = req.body;
    if (!rules || !Array.isArray(rules) || rules.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Rules array is required'
      });
    }

    const result = PortManagementService.createAutomationRule(device, req.params.portName, rules);
    
    res.json({
      success: result.success,
      data: result,
      message: result.message
    });
  } catch (error) {
    logger.error('Failed to create automation rule', { error: error.message, id: req.params.id, port: req.params.portName });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
