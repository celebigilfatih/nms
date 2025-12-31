/**
 * Simple Logger Module
 * Provides structured logging for the backend
 */

const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'INFO'];
const LOG_DIR = path.join(__dirname, '../logs');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

class Logger {
  constructor() {
    this.logFile = path.join(LOG_DIR, 'backend.log');
  }

  /**
   * Format log message with timestamp and level
   */
  format(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const dataStr = Object.keys(data).length > 0 ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}`;
  }

  /**
   * Write to log file
   */
  write(formatted) {
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_FILE_LOGGING) {
      try {
        fs.appendFileSync(this.logFile, formatted + '\n');
      } catch (error) {
        console.error('Failed to write to log file:', error.message);
      }
    }
  }

  /**
   * Log error
   */
  error(message, data = {}) {
    if (LOG_LEVEL >= LOG_LEVELS.ERROR) {
      const formatted = this.format('ERROR', message, data);
      console.error(formatted);
      this.write(formatted);
    }
  }

  /**
   * Log warning
   */
  warn(message, data = {}) {
    if (LOG_LEVEL >= LOG_LEVELS.WARN) {
      const formatted = this.format('WARN', message, data);
      console.warn(formatted);
      this.write(formatted);
    }
  }

  /**
   * Log info
   */
  info(message, data = {}) {
    if (LOG_LEVEL >= LOG_LEVELS.INFO) {
      const formatted = this.format('INFO', message, data);
      console.log(formatted);
      this.write(formatted);
    }
  }

  /**
   * Log debug
   */
  debug(message, data = {}) {
    if (LOG_LEVEL >= LOG_LEVELS.DEBUG) {
      const formatted = this.format('DEBUG', message, data);
      console.log(formatted);
      this.write(formatted);
    }
  }
}

const logger = new Logger();

module.exports = logger;
