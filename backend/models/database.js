const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Resolve absolute path to the database file
const dbPath = path.resolve(__dirname, '../database/queueease.db');

// Connect to the SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    console.log('Using database file at:', dbPath); // Debugging: Database path
  }
});

// Function to initialize the database structure
const initializeDB = () => {
  db.serialize(() => {
    // Users Table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT,
        last_name TEXT,
        address TEXT,
        zip_code TEXT,
        contact_number TEXT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user', -- Set default role as 'user'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Transactions Table
    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER, -- Foreign key to users
        service_id INTEGER, -- Foreign key to services
        queue_number INTEGER,
        status TEXT DEFAULT 'waiting',
        notified BOOLEAN DEFAULT 0, -- Track if the user has been notified
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    // Notifications Table
    db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
          notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          message TEXT,
          status TEXT DEFAULT 'unread', -- Add status field
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
  `);

    // Services Table
    db.run(`
      CREATE TABLE IF NOT EXISTS services (
        service_id INTEGER PRIMARY KEY, -- Match schema
        service_name VARCHAR(255),
        description TEXT
      )
    `);


    // Log all rows in the 'users' table for debugging
    db.all('SELECT * FROM users', [], (err, rows) => {
      if (err) {
        console.error('Error fetching users:', err.message);
      } else {
        console.log('Users Table:', rows); // Debugging: Log all users in the table
      }
    });
  });
};

module.exports = { db, initializeDB };
