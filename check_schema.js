const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log('Checking if tables exist...');
    const result = await pool.query("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'staff')");
    if (result.rows[0].exists) {
      console.log('✅ Tables already exist');
    } else {
      console.log('❌ Tables do not exist - need to create schema');
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
