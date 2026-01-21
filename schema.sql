CREATE DATABASE IF NOT EXISTS brauni_library_db;
USE brauni_library_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  matricula VARCHAR(50) NOT NULL UNIQUE,
  career VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  isbn VARCHAR(50) UNIQUE,
  category VARCHAR(50),
  status VARCHAR(20) DEFAULT 'Available',
  cover_color VARCHAR(20) DEFAULT '#3b82f6',
  cover_image VARCHAR(255), -- New column for image path
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  book_id INT,
  loan_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  return_date DATETIME,
  status VARCHAR(20) DEFAULT 'Active',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id)
);

-- Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_users_search ON users(name, matricula);
CREATE INDEX IF NOT EXISTS idx_books_search ON books(title, author);
