const db = require('../models/database').db; // Ensure correct database reference
const NotificationModel = require('../models/notificationModel'); // Import notification model
const { io } = require('../socket'); // Import WebSocket instance

// Login User
exports.loginUser = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    console.error('Missing email or password');
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();

  db.get(
    `SELECT * FROM users WHERE email = ? AND password = ?`,
    [trimmedEmail, trimmedPassword],
    (err, user) => {
      if (err) {
        console.error('Error querying database:', err.message);
        return res.status(500).json({ message: 'Failed to log in.' });
      }

      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      req.session.user_id = user.id; // Store user ID in session

      const redirectUrl = user.role === 'admin' ? 'admin-dashboard.html' : 'user-queue.html';
      return res.status(200).json({
        message: `Welcome, ${user.role === 'admin' ? 'Admin' : 'User'}!`,
        redirect: redirectUrl,
        user: { id: user.id, email: user.email, role: user.role },
      });
    }
  );
};

// Get User's Queue Number
exports.getUserQueueNumber = (req, res) => {
  const { userId } = req.params;

  db.get(
    `SELECT queue_number FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
    [userId],
    (err, row) => {
      if (err) {
        console.error('Error fetching queue number:', err.message);
        return res.status(500).json({ message: 'Failed to fetch queue number.' });
      }
      res.status(200).json(row || { queue_number: 'None' });
    }
  );
};

// Add Transaction for User
exports.addUserTransaction = (req, res) => {
  const { user_id, service_id } = req.body;

  if (req.session.user_id !== user_id) {
    return res.status(403).json({ message: 'Unauthorized action.' });
  }

  const checkTransactionQuery = `
    SELECT * FROM transactions 
    WHERE user_id = ? AND status IN ('waiting', 'in-progress') 
    LIMIT 1
  `;
  db.get(checkTransactionQuery, [user_id], (err, activeTransaction) => {
    if (err) {
      console.error('Error checking active transactions:', err.message);
      return res.status(500).json({ message: 'Failed to check for active transactions.' });
    }

    if (activeTransaction) {
      return res.status(400).json({ message: 'You already have an ongoing transaction.' });
    }

    const insertQuery = `
      INSERT INTO transactions (user_id, service_id, status) 
      VALUES (?, ?, 'waiting')
    `;
    db.run(insertQuery, [user_id, service_id], function (err) {
      if (err) {
        console.error('Error adding transaction:', err.message);
        return res.status(500).json({ message: 'Failed to add transaction.' });
      }

      reorderQueue((reorderErr) => {
        if (reorderErr) {
          console.error('Error reordering queue:', reorderErr.message);
          return res.status(500).json({ message: 'Failed to reorder the queue.' });
        }

        res.status(201).json({
          transaction_id: this.lastID,
          message: 'Transaction added successfully.',
        });
      });
    });
  });
};

// Fetch All Queue Transactions
exports.getAllQueueTransactions = (req, res) => {
  db.all(
    `SELECT * FROM transactions WHERE status IN ('waiting', 'in-progress') ORDER BY queue_number ASC`,
    (err, rows) => {
      if (err) {
        console.error('Error fetching transactions:', err.message);
        return res.status(500).json({ message: 'Failed to fetch transactions.' });
      }
      res.status(200).json(rows);
    }
  );
};

// Get User Notifications
exports.getUserNotifications = (req, res) => {
  const { userId } = req.params;

  db.all(
    `SELECT * FROM notifications WHERE user_id = ? AND status = 'unread' ORDER BY created_at DESC`,
    [userId],
    (err, rows) => {
      if (err) {
        console.error('Error fetching notifications:', err.message);
        return res.status(500).json({ message: 'Failed to fetch notifications.' });
      }
      res.status(200).json(rows);
    }
  );
};

// Update Transaction Status with Notifications
exports.updateTransactionStatus = (req, res) => {
  const { transaction_id, status } = req.body;

  db.run(
    `UPDATE transactions SET status = ? WHERE transaction_id = ?`,
    [status, transaction_id],
    function (err) {
      if (err) {
        console.error('Error updating transaction status:', err.message);
        return res.status(500).json({ message: 'Failed to update transaction status.' });
      }

      db.get(
        `SELECT * FROM transactions WHERE transaction_id = ?`,
        [transaction_id],
        (err, transaction) => {
          if (err || !transaction) {
            console.error('Error fetching transaction:', err.message || 'Transaction not found.');
            return res.status(500).json({ message: 'Failed to fetch transaction.' });
          }

          const message =
            status === 'in-progress'
              ? 'Your transaction is now in progress.'
              : status === 'completed'
              ? 'Your transaction has been completed.'
              : 'Your transaction has been canceled.';

          // Emit notification via WebSocket
          io.to(transaction.user_id.toString()).emit('transactionUpdated', { message });

          res.status(200).json({ message: 'Transaction status updated successfully.' });
        }
      );
    }
  );
};

// Helper Function to Send Notifications and Emit WebSocket Events
function sendNotificationAndEmit(userId, message) {
  NotificationModel.createNotification({ user_id: userId, message }, (err) => {
    if (err) {
      console.error('Error creating notification:', err.message);
    }
  });
  io.to(userId.toString()).emit('queueUpdate', { message });
}
