// backend/app.js

const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');
const session = require('express-session'); // Session support
const path = require('path');
const { db, initializeDB } = require('./models/database');
const { loginUser, registerUser } = require('./controllers/authController');
const {
  initSocket,
  notifyQueueUpdate,
  notifyUserQueueUpdate,
  notifyNextUser,
} = require('./socket'); // Import socket functions

// Import the reports router
const reportRoutes = require('./reports/generateReport');

dotenv.config();

const app = express();
const http = require('http').createServer(app); // Required for WebSocket server

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: 'queueease_secret', // Replace with a secure random string
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set `secure: true` for HTTPS
  })
);

// Mount support center routes before static files
app.use('/reports', reportRoutes);
app.use('/api/support', require('./routes/supportCenterRoutes'));
app.use('/api/admin/support', require('./routes/supportCenterRoutes'));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Import other routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Login route for handling login logic
app.post('/user/login', loginUser);

// Add manual notification for the next user in the queue
app.post('/api/admin/queue/:queueNumber/notify-next', (req, res) => {
  const { queueNumber } = req.params;

  const nextUserQuery = `
    SELECT queue_number, user_id
    FROM transactions
    WHERE status = 'waiting' AND queue_number > ?
    ORDER BY queue_number ASC
    LIMIT 1
  `;

  db.get(nextUserQuery, [queueNumber], (err, nextTransaction) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to fetch next user.' });
    }

    if (nextTransaction) {
      const notificationQuery = `
        INSERT INTO notifications (user_id, message)
        VALUES (?, 'You are next in line. Please be prepared.')
      `;
      db.run(notificationQuery, [nextTransaction.user_id], (notifErr) => {
        if (notifErr) {
          return res.status(500).json({ message: 'Failed to notify next user.' });
        }

        notifyUserQueueUpdate(nextTransaction.user_id, 'You are next in line.');
        res.status(200).json({ message: `Notified user #${nextTransaction.user_id} as next in line.` });
      });
    } else {
      res.status(404).json({ message: 'No next user in queue.' });
    }
  });
});

// Update transaction status with notifications
app.post('/api/transactions/update', (req, res) => {
  const { transaction_id, status } = req.body;

  db.run(
    `UPDATE transactions SET status = ? WHERE transaction_id = ?`,
    [status, transaction_id],
    function (err) {
      if (err) {
        console.error('Error updating transaction:', err.message);
        return res.status(500).json({ message: 'Failed to update transaction.' });
      }

      db.get(
        `SELECT * FROM transactions WHERE transaction_id = ?`,
        [transaction_id],
        (err, transaction) => {
          if (err || !transaction) {
            console.error('Error fetching transaction:', err?.message || 'Transaction not found.');
            return res.status(500).json({ message: 'Failed to fetch transaction.' });
          }

          switch (status) {
            case 'in-progress':
              notifyUserQueueUpdate(
                transaction.user_id,
                `Your transaction #${transaction.queue_number} is now in progress.`
              );

              const nextUserQuery = `
                SELECT user_id, transaction_id, queue_number
                FROM transactions
                WHERE status = 'waiting' AND queue_number > ?
                ORDER BY queue_number ASC
                LIMIT 1
              `;

              db.get(nextUserQuery, [transaction.queue_number], (nextErr, nextTransaction) => {
                if (nextErr) {
                  console.error('Error fetching next user:', nextErr.message);
                  return;
                }

                if (nextTransaction) {
                  notifyNextUser(
                    nextTransaction.user_id,
                    `You are next in line. Please prepare for your transaction.`
                  );
                }
              });
              break;

            case 'completed':
              notifyUserQueueUpdate(
                transaction.user_id,
                `Transaction #${transaction.queue_number} has been completed.`
              );
              break;

            case 'canceled':
              notifyUserQueueUpdate(
                transaction.user_id,
                `Transaction #${transaction.queue_number} has been canceled.`
              );
              break;

            default:
              console.log(`No specific notification for status: ${status}`);
          }

          res.status(200).json({ message: 'Transaction updated successfully.' });
        }
      );
    }
  );
});

// Service management
app.get('/api/services', (req, res) => {
  const query = `SELECT * FROM services`;
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Registration
app.post('/api/register', registerUser);

// User management routes for admins
app.get('/api/admin/users', (req, res) => {
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) {
      console.error('Error fetching users:', err.message);
      return res.status(500).json({ message: 'Failed to fetch users.' });
    }
    res.status(200).json(rows);
  });
});

app.post('/api/admin/users', (req, res) => {
  const { first_name, last_name, email, password, role } = req.body;

  db.run(
    `INSERT INTO users (first_name, last_name, email, password, role)
     VALUES (?, ?, ?, ?, ?)`,
    [first_name, last_name, email, password, role || 'user'],
    function (err) {
      if (err) {
        console.error('Error adding user:', err.message);
        return res.status(500).json({ message: 'Failed to add user.' });
      }
      res.status(201).json({ id: this.lastID, message: 'User added successfully.' });
    }
  );
});

app.put('/api/admin/users/:id', (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, email, password, role } = req.body;

  db.run(
    `UPDATE users SET first_name = ?, last_name = ?, email = ?, password = ?, role = ?
     WHERE id = ?`,
    [first_name, last_name, email, password, role, id],
    function (err) {
      if (err) {
        console.error('Error updating user:', err.message);
        return res.status(500).json({ message: 'Failed to update user.' });
      } else if (this.changes === 0) {
        return res.status(404).json({ message: 'User not found.' });
      }
      res.status(200).json({ message: 'User updated successfully.' });
    }
  );
});

app.delete('/api/admin/users/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Error deleting user:', err.message);
      return res.status(500).json({ message: 'Failed to delete user.' });
    } else if (this.changes === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json({ message: 'User deleted successfully.' });
  });
});

// Initialize WebSocket server
initSocket(http);

// Initialize database
initializeDB();

// Start the server
const PORT = process.env.PORT || 5000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
