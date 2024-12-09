const { db } = require('./database');

const TransactionModel = {
  // Create a new transaction and notify the user
  createTransaction: (transaction, callback) => {
    const insertQuery = `
      INSERT INTO transactions (user_id, service_id, status, notified)
      VALUES (?, ?, 'waiting', 0)
    `;
    db.run(insertQuery, [transaction.user_id, transaction.service_id], function (err) {
      if (err) return callback(err);

      // Notify the user they have joined the queue
      notifyUser(transaction.user_id, 'You have joined the queue. Please wait for your turn.');

      callback(null, { transaction_id: this.lastID });
    });
  },

  // Reorder the queue numbers for active transactions
  reorderQueue: (callback) => {
    const fetchQuery = `
      SELECT transaction_id 
      FROM transactions 
      WHERE status IN ('waiting', 'in-progress')
      ORDER BY created_at ASC
    `;
    db.all(fetchQuery, [], (err, rows) => {
      if (err) return callback(err);

      const updatePromises = rows.map((row, index) => {
        return new Promise((resolve, reject) => {
          const updateQuery = `
            UPDATE transactions 
            SET queue_number = ? 
            WHERE transaction_id = ?
          `;
          db.run(updateQuery, [index + 1, row.transaction_id], (updateErr) => {
            if (updateErr) return reject(updateErr);
            resolve();
          });
        });
      });

      Promise.all(updatePromises)
        .then(() => callback(null))
        .catch(callback);
    });
  },

  // Update transaction status and handle notifications
  updateTransactionStatus: (transaction_id, status, callback) => {
    const updateQuery = `
      UPDATE transactions 
      SET status = ? 
      WHERE transaction_id = ?`;
  
    db.run(updateQuery, [status, transaction_id], function (err) {
      if (err) return callback(err);
  
      // Fetch the updated transaction
      db.get(
        `SELECT * FROM transactions WHERE transaction_id = ?`,
        [transaction_id],
        (err, transaction) => {
          if (err || !transaction)
            return callback(err || new Error('Transaction not found.'));
  
          // Notifications logic based on status
          let message;
          switch (status) {
            case 'in-progress':
              message = `Your transaction #${transaction.queue_number} is now in progress.`;
              notifyUser(transaction.user_id, message);
  
              // Notify the next user in line
              const nextUserQuery = `
                SELECT queue_number, user_id
                FROM transactions
                WHERE status = 'waiting' AND queue_number > ?
                ORDER BY queue_number ASC
                LIMIT 1
              `;
              db.get(nextUserQuery, [transaction.queue_number], (nextErr, nextTransaction) => {
                if (nextErr) {
                  console.error('Failed to fetch the next user:', nextErr.message);
                  return;
                }
  
                if (nextTransaction) {
                  notifyUser(nextTransaction.user_id, 'You are next in line. Please be prepared.');
                } else {
                  console.log('No next user to notify.');
                }
              });
              break;
  
            case 'completed':
              message = `Transaction #${transaction.queue_number} has been completed.`;
              notifyUser(transaction.user_id, message);
              break;
  
            case 'canceled':
              message = `Transaction #${transaction.queue_number} has been canceled.`;
              notifyUser(transaction.user_id, message);
              break;
  
            default:
              console.log('Invalid transaction status. No notification sent.');
          }
  
          callback(null, {
            message: `Transaction #${transaction.queue_number} updated to status: ${status}`,
          });
        }
      );
    });
  },
  
  

  // Get the current queue for all users
  getQueueForAllUsers: (callback) => {
    const query = `
      SELECT transactions.*, users.first_name, users.last_name
      FROM transactions
      LEFT JOIN users ON transactions.user_id = users.id
      WHERE transactions.status IN ('waiting', 'in-progress')
      ORDER BY queue_number ASC
    `;
    db.all(query, [], callback);
  },

  // Get active transaction by user ID
  getActiveTransactionByUserId: (user_id, callback) => {
    const query = `
      SELECT * FROM transactions
      WHERE user_id = ? AND status IN ('waiting', 'in-progress')
      LIMIT 1
    `;
    db.get(query, [user_id], callback);
  },
};

// Helper function to notify a user
function notifyUser(user_id, message) {
  db.run(
    `INSERT INTO notifications (user_id, message) VALUES (?, ?)`,
    [user_id, message],
    (err) => {
      if (err) console.error(`Failed to send notification: ${message}`, err.message);
    }
  );
}

// Helper function to fetch and notify the next user in the queue
function notifyNextUserInQueue(offset, message) {
  const query = `
    SELECT * FROM transactions 
    WHERE status = 'waiting' 
    ORDER BY queue_number ASC 
    LIMIT 1 OFFSET ?`;

  db.get(query, [offset], (err, nextUser) => {
    if (err) {
      console.error('Failed to fetch next user:', err.message);
    } else if (nextUser) {
      notifyUser(nextUser.user_id, message);
    }
  });
}


module.exports = TransactionModel;