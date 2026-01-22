const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log('Testing /api/loans query...');
    const result = await pool.query(`
        SELECT l.id, l.loan_date, l.return_date, l.status, u.name as user_name, b.title as book_title, b.cover_color
        FROM loans l
        JOIN users u ON l.user_id = u.id
        JOIN books b ON l.book_id = b.id
        ORDER BY l.loan_date DESC
        LIMIT 20
    `);
    console.log('✅ Query successful. Found', result.rows.length, 'records');
    console.log('Sample:', result.rows[0] || 'No data');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
})();
