const express = require('express');
const cors = require('cors');
const pool = require('./db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const { handleChat } = require('./chatService');

// --- CHAT ROUTE (DISABLED) ---
// app.post('/api/chat', async (req, res) => {
//     const { messages, user } = req.body;
//     const apiKey = process.env.GROQ_API_KEY; // Ensure this is set
//     
//     if (!apiKey) return res.status(500).json({ error: 'Groq API Key not configured' });
//
//     try {
//         const response = await handleChat(messages, apiKey, user);
//         res.json(response);
//     } catch (error) {
//         console.error('Chat Error:', error);
//         res.status(500).json({ error: error.message });
//     }
// });

// Configure Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = 'uploads';
      if (!fs.existsSync(uploadDir)){
          fs.mkdirSync(uploadDir);
      }
      cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'book-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Generic Upload Endpoint for Chat/Temporary files
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    // Return the full URL or relative path as preferred.
    // Using relative path for simplicity in formatting.
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// --- USER ROUTES ---

app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { name, matricula, career, email, phone } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO users (name, matricula, career, email, phone) VALUES (?, ?, ?, ?, ?)',
      [name, matricula, career, email, phone]
    );
    const [newUser] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    res.status(201).json(newUser[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Matricula already exists' });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:id/history', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT l.id, l.loan_date, l.return_date, l.status, b.title, b.author 
            FROM loans l 
            JOIN books b ON l.book_id = b.id 
            WHERE l.user_id = ? 
            ORDER BY l.loan_date DESC`, 
            [req.params.id]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { name, email, phone, status } = req.body;
    try {
        await pool.query('UPDATE users SET name = ?, email = ?, phone = ?, status = ? WHERE id = ?', [name, email, phone, status, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- LOAN ROUTES ---

app.post('/api/loans', async (req, res) => {
    const { user_id, book_id, days = 7 } = req.body; // Default 7 days
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Calculate due_date
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + parseInt(days));

        const [loanResult] = await connection.query(
            'INSERT INTO loans (user_id, book_id, due_date) VALUES (?, ?, ?)',
            [user_id, book_id, dueDate]
        );

        await connection.query(
            'UPDATE books SET status = ? WHERE id = ?',
            ['Loaned', book_id]
        );

        await connection.commit();
        res.status(201).json({ id: loanResult.insertId, message: 'Loan created' });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

app.get('/api/loans', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT l.id, l.loan_date, l.due_date, l.status, u.name as user_name, b.title as book_title, b.cover_color
            FROM loans l
            JOIN users u ON l.user_id = u.id
            JOIN books b ON l.book_id = b.id
            ORDER BY l.loan_date DESC
            LIMIT 20
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/notifications (Overdue Loans)
app.get('/api/notifications', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT l.id, l.due_date, u.name as user_name, b.title as book_title
            FROM loans l
            JOIN users u ON l.user_id = u.id
            JOIN books b ON l.book_id = b.id
            WHERE l.status = 'Active' AND l.due_date < NOW()
            ORDER BY l.due_date ASC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- BOOK ROUTES ---

app.get('/api/books', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM books ORDER BY created_at DESC');
        res.json(rows); 
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/books', upload.single('image'), async (req, res) => {
    const { title, author, isbn, category, cover_color } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    
    try {
        const [result] = await pool.query(
            'INSERT INTO books (title, author, isbn, category, cover_color, cover_image) VALUES (?, ?, ?, ?, ?, ?)',
            [title, author, isbn, category, cover_color || '#3b82f6', imagePath]
        );
        const [newBook] = await pool.query('SELECT * FROM books WHERE id = ?', [result.insertId]);
        res.status(201).json(newBook[0]);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'ISBN already exists' });
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/books/:id', async (req, res) => {
    const { status } = req.body;
    try {
         await pool.query('UPDATE books SET status = ? WHERE id = ?', [status, req.params.id]);
         res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/books/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM books WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Libro eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- STATS ROUTES ---

app.get('/api/stats', async (req, res) => {
    try {
        const [loansTotal] = await pool.query('SELECT COUNT(*) as count FROM loans');
        const [usersTotal] = await pool.query('SELECT COUNT(*) as count FROM users');
        const [booksTotal] = await pool.query('SELECT COUNT(*) as count FROM books');
        const [activeLoans] = await pool.query('SELECT COUNT(*) as count FROM books WHERE status = "Loaned"');
        const [lostBooks] = await pool.query('SELECT COUNT(*) as count FROM books WHERE status = "Lost"');

        // Simple monthly aggregation
        const [monthlyStats] = await pool.query(`
            SELECT DATE_FORMAT(loan_date, '%b') as month, COUNT(*) as count 
            FROM loans 
            WHERE loan_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY month 
            ORDER BY MIN(loan_date) ASC
        `);

        res.json({
            loans: loansTotal[0].count,
            users: usersTotal[0].count,
            books: booksTotal[0].count,
            active_loans: activeLoans[0].count,
            lost: lostBooks[0].count,
            chart: monthlyStats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- AUTH ROUTES ---

// POST /api/login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM staff WHERE email = ?', [email]);
        if (rows.length === 0) return res.status(401).json({ error: 'Credenciales inválidas' });
        
        const user = rows[0];
        const validPass = await bcrypt.compare(password, user.password); 
        if (!validPass) return res.status(401).json({ error: 'Credenciales inválidas' });

        // Generate Token (Simple for demo, no expiration or long one)
        // In real app use JWT. For this demo we just return user info to store in Client state
        // user.password = undefined;
        res.json({ 
            id: user.id, 
            name: user.name, 
            email: user.email, 
            role: user.role 
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- STAFF ROUTES (Admin Only Logic should be middleware but simplifying) ---

app.get('/api/staff', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, email, role, created_at FROM staff');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/staff', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        const hashedPassword = await require('bcryptjs').hash(password, 10);
        await pool.query('INSERT INTO staff (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hashedPassword, role]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/staff/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM staff WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
