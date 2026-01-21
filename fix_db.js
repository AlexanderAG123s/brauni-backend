const pool = require('./db');

async function fixDatabase() {
  console.log('--- Database Fix Utility ---');
  try {
    // Check if column exists
    const [rows] = await pool.query("SHOW COLUMNS FROM books LIKE 'cover_image'");
    
    if (rows.length === 0) {
       console.log('Adding missing column: cover_image...');
       await pool.query("ALTER TABLE books ADD COLUMN cover_image VARCHAR(255)");
       console.log('✅ Success: Column added.');
    } else {
       console.log('ℹ️ Column cover_image already exists.');
    }

  } catch (err) {
    console.error('❌ Error updating database:', err.message);
  } finally {
    process.exit();
  }
}

fixDatabase();
