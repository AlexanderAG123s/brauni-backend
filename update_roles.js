const pool = require('./db');

async function updateRoles() {
  try {
    console.log('Actualizando roles en la base de datos...');
    
    // Cambiar 'admin' a 'Admin'
    await pool.query("UPDATE staff SET role = 'Admin' WHERE role IN ('admin', 'super_admin')");
    
    // Cambiar 'librarian' a 'Bibliotecario'
    await pool.query("UPDATE staff SET role = 'Bibliotecario' WHERE role = 'librarian'");
    
    // Verificar cambios
    const result = await pool.query('SELECT id, name, email, role FROM staff ORDER BY id');
    
    console.log('✅ Roles actualizados:');
    result.rows.forEach(user => {
      console.log(`  ${user.name} (${user.email}): ${user.role}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
}

updateRoles();
