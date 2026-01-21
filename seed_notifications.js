const pool = require('./db');
require('dotenv').config();

async function seedOverdue() {
    console.log('--- Seeding Overdue Loan ---');
    try {
        // Ensure Users and Books exist
        // Create user
        const [u] = await pool.query("INSERT INTO users (name, matricula, email, career) VALUES ('Test User', 'OVERDUE01', 'test@test.com', 'Test') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)");
        const userId = u.insertId;

        // Create Book
        const [b] = await pool.query("INSERT INTO books (title, author, isbn) VALUES ('Libro Vencido', 'Autor X', 'ISBN-VENCIDO') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)");
        const bookId = b.insertId;

        // Create Overdue Loan (Date - 10 days, Due - 3 days)
        const loanDate = new Date(); loanDate.setDate(loanDate.getDate() - 10);
        const dueDate = new Date(); dueDate.setDate(dueDate.getDate() - 3);

        await pool.query("INSERT INTO loans (user_id, book_id, loan_date, due_date, status) VALUES (?, ?, ?, ?, 'Active')", 
            [userId, bookId, loanDate, dueDate]
        );

        console.log('✅ Overdue loan created for "Libro Vencido".');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

seedOverdue();
