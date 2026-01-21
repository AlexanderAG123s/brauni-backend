const pool = require('./db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testLogin() {
    console.log('--- Testing Login Logic ---');
    try {
        const email = 'admin@brauni.edu';
        const password = 'admin123';
        console.log(`Checking user: ${email}`);

        const [rows] = await pool.query('SELECT * FROM staff WHERE email = ?', [email]);
        console.log('Rows found:', rows.length);

        if (rows.length === 0) {
            console.log('User not found.');
            return;
        }

        const user = rows[0];
        console.log('User data:', { id: user.id, email: user.email, role: user.role, passHashLength: user.password.length });

        console.log('Verifying password...');
        const validPass = await bcrypt.compare(password, user.password);
        console.log('Password valid:', validPass);

        if (validPass) {
             console.log('Login SUCCESS!');
        } else {
             console.log('Login FAILED (Invalid Password)');
        }

    } catch (err) {
        console.error('❌ FATAL ERROR:', err);
    } finally {
        process.exit();
    }
}

testLogin();
