const pool = require('./db');
const bcrypt = require('bcryptjs');

async function setupAuth() {
  console.log('--- Auth & Staff Setup ---');
  try {
     // Create Staff Table
     await pool.query(`
        CREATE TABLE IF NOT EXISTS staff (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role ENUM('Admin', 'Librarian') DEFAULT 'Librarian',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
     `);
     console.log('✅ Table staff ready.');

     // Check if Admin exists
     const [rows] = await pool.query("SELECT * FROM staff WHERE email = 'admin@brauni.edu'");
     if (rows.length === 0) {
         const hashedPassword = await bcrypt.hash('admin123', 10);
         await pool.query(
             "INSERT INTO staff (name, email, password, role) VALUES (?, ?, ?, ?)",
             ['Super Admin', 'admin@brauni.edu', hashedPassword, 'Admin']
         );
         console.log('✅ Seeded Admin User: admin@brauni.edu / admin123');
     } else {
         console.log('ℹ️ Admin user already exists.');
     }

  } catch (err) {
    console.error('❌ Error setting up auth:', err.message);
  } finally {
    process.exit();
  }
}

setupAuth();
