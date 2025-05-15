const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./queueease.db');

// Create the 'reports' table
db.serialize(() => {
  db.run(`
   CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    screenshot TEXT,
    occurred_at TEXT,
    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    acknowledged INTEGER DEFAULT 0,  -- ✅ Add this line
    FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error("Error creating table:", err.message);
    else console.log("✅ Table 'reports' created.");
  });
});

db.close();
