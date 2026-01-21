const pool = require('./db');

async function testBooks() {
    try {
        console.log('Conectando a la base de datos...\n');
        
        // Test 1: Contar libros
        const [count] = await pool.query('SELECT COUNT(*) as total FROM books');
        console.log(`✅ Total de libros en BD: ${count[0].total}\n`);
        
        // Test 2: Listar todos los libros
        const [books] = await pool.query('SELECT id, title, author, isbn, category, status FROM books ORDER BY created_at DESC');
        
        if (books.length === 0) {
            console.log('⚠️ No hay libros en la base de datos. Por favor, agrega algunos primero.');
        } else {
            console.log('📚 LIBROS EN LA BASE DE DATOS:\n');
            books.forEach((book, index) => {
                console.log(`${index + 1}. "${book.title}"`);
                console.log(`   Autor: ${book.author || 'Desconocido'}`);
                console.log(`   ISBN: ${book.isbn || 'N/A'}`);
                console.log(`   Categoría: ${book.category || 'General'}`);
                console.log(`   Estado: ${book.status}\n`);
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testBooks();
