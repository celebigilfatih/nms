/**
 * NMS Backend Server
 * Main entry point for the Node.js backend API
 */

const express = require('express');
const cors = require('cors');
const database = require('./src/database');
const logger = require('./src/logger');
const apiRoutes = require('./src/routes/api');
const reportsRoutes = require('./src/routes/reports');
const SNMPPollingService = require('./src/services/polling');
const deviceRepository = require('./src/services/deviceRepository');

const app = express();
const PORT = process.env.PORT || process.env.API_PORT || 3001;
const HOST = process.env.HOST || process.env.API_HOST || '0.0.0.0';

// ============= MIDDLEWARE =============

// JSON parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging middleware
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`, { 
    query: req.query,
    ip: req.ip 
  });
  next();
});

// ============= ROUTES =============

// API routes
app.use('/api', apiRoutes);
app.use('/api/reports', reportsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'NMS Backend API',
    version: '1.0.0',
    endpoints: {
      devices: '/api/devices',
      alarms: '/api/alarms',
      metrics: '/api/metrics',
      health: '/api/health'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { 
    error: err.message,
    path: req.path,
    stack: err.stack 
  });
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// ============= STARTUP =============

/**
 * Start the server
 */
async function start() {
  try {
    // Initialize database
    logger.info('Initializing database connection...');
    await database.init();
    
    // Initialize and start polling service (DISABLED - Using nms_service Python poller)
    let pollingService = null;
    /*
    try {
      const activeDevices = await deviceRepository.getActive();
      pollingService = new SNMPPollingService({
        pollingInterval: 60000, // 1 minute for testing
        deviceRepository: deviceRepository
      });
      await pollingService.start(activeDevices);
    } catch (error) {
      logger.warn('Failed to start polling service', { error: error.message });
      // Don't fail startup if polling fails
    }
    */
    
    // Start Express server
    const server = app.listen(PORT, HOST, () => {
      logger.info(`NMS Backend API started successfully`, {
        host: HOST,
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        database: process.env.DB_NAME,
        pollingServiceRunning: pollingService?.isRunning || false
      });
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down NMS Backend API...');
      if (pollingService) {
        pollingService.stop();
      }
      server.close(async () => {
        try {
          await database.close();
          logger.info('NMS Backend API shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error: error.message });
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start NMS Backend API', { error: error.message });
    process.exit(1);
  }
}

// Start the server if this is the main module
if (require.main === module) {
  start();
}

module.exports = app;
