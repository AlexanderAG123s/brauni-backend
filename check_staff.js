const pool = require('./db');

async function checkStaff() {
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM staff');
    
    console.log('📋 Usuarios en tabla STAFF:');
    console.log('================================');
    
    if (result.rows.length === 0) {
      console.log('❌ No hay usuarios en la tabla staff');
    } else {
      result.rows.forEach(user => {
        console.log(`
ID: ${user.id}
Nombre: ${user.name}
Email: ${user.email}
Rol: ${user.role}
Creado: ${user.created_at}
---`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
}

checkStaff();
