const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:@localhost:5432/brauni_library_db',
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;
