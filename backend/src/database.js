/**
 * PostgreSQL Database Connection Module
 * Provides connection pooling and query execution
 */

const { Pool } = require('pg');
const logger = require('./logger');

class Database {
  constructor() {
    // Create connection pool from environment variables
    this.pool = new Pool({
      user: process.env.DB_USER || 'nms_user',
      password: process.env.DB_PASSWORD || 'nms_secure_password_2024',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'nms_db',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });

    this.initialized = false;
  }

  /**
   * Initialize database connection
   */
  async init() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      
      logger.info('Database connected successfully', {
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        timestamp: result.rows[0].now
      });
      
      this.initialized = true;
      return true;
    } catch (error) {
      logger.error('Failed to connect to database', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute a query
   */
  async query(text, params = []) {
    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      logger.error('Database query error', { 
        query: text, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get single row
   */
  async queryOne(text, params = []) {
    const result = await this.query(text, params);
    return result.rows[0] || null;
  }

  /**
   * Get multiple rows
   */
  async queryAll(text, params = []) {
    const result = await this.query(text, params);
    return result.rows;
  }

  /**
   * Close all connections
   */
  async close() {
    await this.pool.end();
    logger.info('Database connection pool closed');
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const result = await this.queryOne('SELECT 1 as alive');
      return result?.alive === 1;
    } catch (error) {
      return false;
    }
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;
