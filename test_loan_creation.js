const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log('Testing POST /api/loans logic...');
    
    // Simulate a loan creation with test data
    const user_id = 1;
    const book_id = 1;
    const days = 7;
    
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + parseInt(days));

    console.log('Attempting to insert loan:');
    console.log('  user_id:', user_id);
    console.log('  book_id:', book_id);
    console.log('  return_date:', returnDate);

    const result = await pool.query(
      'INSERT INTO loans (user_id, book_id, return_date) VALUES ($1, $2, $3) RETURNING id',
      [user_id, book_id, returnDate]
    );

    console.log('✅ Loan created successfully');
    console.log('Loan ID:', result.rows[0].id);
    
    // Clean up - delete the test loan
    await pool.query('DELETE FROM loans WHERE id = $1', [result.rows[0].id]);
    console.log('Test loan cleaned up');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === '23503') {
      console.error('FOREIGN KEY ERROR: User or Book does not exist');
    }
    console.error('Full error:', error);
    process.exit(1);
  }
})();
