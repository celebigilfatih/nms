/**
 * NMS Database Initialization
 * Sets up PostgreSQL connection and creates tables
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'nms_user',
  password: process.env.DB_PASSWORD || 'nms_password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'postgres' // Connect to default postgres DB first
});

/**
 * Initialize database and schema
 */
async function initializeDatabase() {
  let client;
  try {
    console.log('🔧 Starting Database Initialization...');
    
    client = await pool.connect();

    // Create database if it doesn't exist
    console.log('📊 Creating database...');
    await client.query(`
      SELECT 'CREATE DATABASE nms_db'
      WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'nms_db')\gexec
    `).catch(err => {
      // Ignore if database already exists
      if (!err.message.includes('already exists')) {
        console.warn('⚠️  Database creation note:', err.message);
      }
    });

    client.release();

    // Connect to the NMS database
    const nmsPool = new Pool({
      user: process.env.DB_USER || 'nms_user',
      password: process.env.DB_PASSWORD || 'nms_password',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: 'nms_db'
    });

    const nmsClient = await nmsPool.connect();

    // Read and execute schema
    console.log('📝 Executing schema...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    let schema;

    try {
      schema = fs.readFileSync(schemaPath, 'utf8');
    } catch (err) {
      console.log('ℹ️  Schema file not found, creating tables manually...');
      schema = getDefaultSchema();
    }

    // Split and execute statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));

    for (const statement of statements) {
      try {
        await nmsClient.query(statement);
      } catch (err) {
        // Log but continue on errors (tables might already exist)
        if (!err.message.includes('already exists')) {
          console.warn(`⚠️  Statement error: ${err.message.substring(0, 100)}`);
        }
      }
    }

    console.log('✅ Database initialization complete!');

    // Test connection
    const result = await nmsClient.query('SELECT COUNT(*) FROM users');
    console.log(`📈 Users table: ${result.rows[0].count} records`);

    nmsClient.release();
    await nmsPool.end();

    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

/**
 * Get default schema if file is not found
 */
function getDefaultSchema() {
  return `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'operator',
      permissions TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Devices table
    CREATE TABLE IF NOT EXISTS devices (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      ip_address VARCHAR(45) UNIQUE NOT NULL,
      vendor VARCHAR(100),
      device_type VARCHAR(50),
      snmp_version VARCHAR(10) DEFAULT 'v2c',
      snmp_port INTEGER DEFAULT 161,
      snmp_community VARCHAR(255),
      polling_enabled BOOLEAN DEFAULT TRUE,
      polling_interval INTEGER DEFAULT 300,
      connection_status VARCHAR(50) DEFAULT 'offline',
      last_polled TIMESTAMP,
      last_online TIMESTAMP,
      location VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER REFERENCES users(id)
    );

    -- Alarms table
    CREATE TABLE IF NOT EXISTS alarms (
      id SERIAL PRIMARY KEY,
      device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
      message TEXT NOT NULL,
      severity VARCHAR(50) DEFAULT 'info',
      status VARCHAR(50) DEFAULT 'active',
      acknowledged_by INTEGER REFERENCES users(id),
      acknowledged_at TIMESTAMP,
      resolved_by INTEGER REFERENCES users(id),
      resolved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Metrics table
    CREATE TABLE IF NOT EXISTS device_metrics (
      id SERIAL PRIMARY KEY,
      device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      metric_type VARCHAR(50) NOT NULL,
      metric_name VARCHAR(255),
      metric_value DECIMAL(10, 2),
      metric_unit VARCHAR(50),
      status VARCHAR(50),
      collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Settings table
    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      setting_key VARCHAR(255) UNIQUE NOT NULL,
      setting_value TEXT,
      setting_type VARCHAR(50),
      description TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Insert default admin
    INSERT INTO users (email, password_hash, name, role, permissions, is_active)
    VALUES ('admin@nms.local', 'admin123', 'Administrator', 'admin', '["read","write","delete","admin"]', TRUE)
    ON CONFLICT (email) DO NOTHING;
  `;
}

/**
 * Create database connection pool
 */
function getPool() {
  return new Pool({
    user: process.env.DB_USER || 'nms_user',
    password: process.env.DB_PASSWORD || 'nms_password',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'nms_db',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

// Run initialization if this is the main module
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 Database ready for use!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('🔴 Initialization failed:', error);
      process.exit(1);
    });
}

module.exports = {
  initializeDatabase,
  getPool
};
