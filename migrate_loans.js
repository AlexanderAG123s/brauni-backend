const pool = require('./db');

async function fixLoansTable() {
  console.log('--- Loans Table Migration ---');
  try {
    const [rows] = await pool.query("SHOW COLUMNS FROM loans LIKE 'due_date'");
    
    if (rows.length === 0) {
       console.log('Adding due_date column...');
       await pool.query("ALTER TABLE loans ADD COLUMN due_date DATETIME AFTER loan_date");
       console.log('✅ Success: due_date added.');
    } else {
       console.log('ℹ️ Column due_date already exists.');
    }

  } catch (err) {
    console.error('❌ Error updating database:', err.message);
  } finally {
    process.exit();
  }
}

fixLoansTable();
