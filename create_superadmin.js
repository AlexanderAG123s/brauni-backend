const bcrypt = require('bcryptjs');
const pool = require('./db');

async function createSuperAdmin() {
  const name = 'Super Administrador';
  const email = 'superadmin@brauni.edu';
  const password = 'superadmin123456'; // Cambiar a algo más seguro
  const role = 'Admin';

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into staff table
    const result = await pool.query(
      'INSERT INTO staff (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, hashedPassword, role]
    );

    console.log('✅ Super Admin creado exitosamente:');
    console.log('   Email:', result.rows[0].email);
    console.log('   Rol:', result.rows[0].role);
    console.log('   ID:', result.rows[0].id);
    console.log('\n📝 Credenciales:');
    console.log('   Email:', email);
    console.log('   Password:', password);
  } catch (error) {
    if (error.code === '23505') {
      console.log('⚠️ El email ya existe en la base de datos. Eliminando y recreando...');
      // Delete the existing user and try again
      try {
        await pool.query('DELETE FROM staff WHERE email = $1', [email]);
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
          'INSERT INTO staff (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
          [name, email, hashedPassword, role]
        );
        console.log('✅ Super Admin recreado exitosamente:');
        console.log('   Email:', result.rows[0].email);
        console.log('   Rol:', result.rows[0].role);
        console.log('\n📝 Credenciales:');
        console.log('   Email:', email);
        console.log('   Password:', password);
      } catch (deleteError) {
        console.error('❌ Error al recrear:', deleteError.message);
      }
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    pool.end();
  }
}

createSuperAdmin();
