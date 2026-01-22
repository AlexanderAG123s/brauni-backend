const bcrypt = require('bcryptjs');
const pool = require('./db');

async function createUser() {
  const email = 'test@example.com';  // Cambia esto
  const password = 'password123';     // Cambia esto
  const name = 'Test User';           // Cambia esto
  const role = 'admin';               // Cambias esto si quieres

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Hash generado:', hashedPassword);
    
    const result = await pool.query(
      'INSERT INTO staff (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, hashedPassword, role]
    );
    
    console.log('Usuario creado exitosamente:', result.rows[0]);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createUser();
