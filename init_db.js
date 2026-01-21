const pool = require('./db');
const fs = require('fs');
const path = require('path');

async function initDB() {
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const statements = schemaSql.split(';').filter(stmt => stmt.trim());

    console.log('Running Schema...');
    for (let statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }
    
    console.log('Checking for seed data...');
    // Seed Books if empty
    const [books] = await pool.query('SELECT COUNT(*) as count FROM books');
    if (books[0].count === 0) {
        console.log('Seeding Books...');
        const dummyBooks = [
            ['Clean Code', 'Robert C. Martin', '9780132350884', 'Tecnología'],
            ['Dune', 'Frank Herbert', '9780441172719', 'Ficción'],
            ['Sapiens', 'Yuval Noah Harari', '9780062316097', 'Historia'],
            ['Refactoring', 'Martin Fowler', '9780201485677', 'Tecnología']
        ];
        for (let b of dummyBooks) {
            await pool.query('INSERT INTO books (title, author, isbn, category) VALUES (?, ?, ?, ?)', b);
        }
    }

    // Seed Loans for history demo (assuming users exist or not, safe skip if no users)
    const [users] = await pool.query('SELECT id FROM users LIMIT 1');
    if (users.length > 0) {
        const [loans] = await pool.query('SELECT COUNT(*) as count FROM loans');
        if (loans[0].count === 0) {
            console.log('Seeding History...');
            const userId = users[0].id; // Assign to first user
            await pool.query('INSERT INTO loans (user_id, book_id, loan_date, status) VALUES (?, 1, DATE_SUB(NOW(), INTERVAL 5 DAY), "Active")', [userId]);
            await pool.query('INSERT INTO loans (user_id, book_id, loan_date, return_date, status) VALUES (?, 2, DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), "Returned")', [userId]);
        }
    }

    console.log('Database Initialized Successfully!');
    process.exit(0);

  } catch (err) {
    console.error('Initialization Failed:', err);
    process.exit(1);
  }
}

initDB();
