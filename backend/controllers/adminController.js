const { db } = require('../models/database');

// User Management
exports.getAllUsers = (req, res) => {
  db.all('SELECT * FROM users ORDER BY id ASC', (err, rows) => {
    if (err) {
      console.error('Error fetching users:', err.message);
      return res.status(500).json({ message: 'Internal server error.' });
    }
    res.json(rows);
  });
};

// Queue Management
exports.getQueue = (req, res) => {
  db.all(
    `SELECT transactions.*, 
            users.first_name, 
            users.last_name, 
            services.service_name 
     FROM transactions
     LEFT JOIN users ON transactions.user_id = users.id
     LEFT JOIN services ON transactions.service_id = services.service_id
     WHERE status NOT IN ("completed", "canceled")
     ORDER BY queue_number ASC`,
    (err, rows) => {
      if (err) {
        console.error('Error fetching queue:', err.message);
        return res.status(500).json({ message: 'Failed to fetch queue.' });
      }
      res.json(rows);
    }
  );
};

exports.getCurrentServingQueue = (req, res) => {
  db.get(
    `SELECT queue_number 
     FROM transactions 
     WHERE status = "in-progress" 
     ORDER BY queue_number ASC 
     LIMIT 1`,
    (err, row) => {
      if (err) {
        console.error('Error fetching current serving queue:', err.message);
        return res.status(500).json({ message: 'Failed to fetch current queue.' });
      }
      res.json(row || { queue_number: 'None' });
    }
  );
};

exports.updateQueueStatus = (req, res) => {
  const { queueNumber, action } = req.params;
  let status;

  // Determine the new status based on the action
  switch (action) {
    case 'prioritize':
      status = 'in-progress';
      break;
    case 'complete':
      status = 'completed';
      break;
    case 'cancel':
      status = 'canceled';
      break;
    default:
      return res.status(400).json({ message: 'Invalid action.' });
  }

  // Update the status of the current transaction
  const updateQuery = `
    UPDATE transactions
    SET status = ?
    WHERE queue_number = ?
  `;

  db.run(updateQuery, [status, queueNumber], function (err) {
    if (err) {
      console.error('Failed to update transaction status:', err.message);
      return res.status(500).json({ message: 'Failed to update queue status.' });
    }

    // Fetch transaction details to notify the user
    const fetchTransactionQuery = `
      SELECT user_id 
      FROM transactions 
      WHERE queue_number = ?
    `;
    db.get(fetchTransactionQuery, [queueNumber], (err, transaction) => {
      if (err || !transaction) {
        console.error('Failed to fetch transaction details:', err?.message);
        return res.status(500).json({ message: 'Failed to fetch transaction details.' });
      }

      // Send notification to the current user
      let message;
      if (status === 'in-progress') {
        message = `Your transaction #${queueNumber} is now in progress.`;
      } else if (status === 'completed') {
        message = `Transaction #${queueNumber} has been completed.`;
      } else if (status === 'canceled') {
        message = `Transaction #${queueNumber} has been canceled.`;
      }

      const notificationQuery = `
        INSERT INTO notifications (user_id, message)
        VALUES (?, ?)
      `;
      db.run(notificationQuery, [transaction.user_id, message], (notifErr) => {
        if (notifErr) {
          console.error('Failed to send notification:', notifErr.message);
        }

        // Notify the next user if the action is 'in-progress'
        if (status === 'in-progress') {
          const nextUserQuery = `
            SELECT queue_number, user_id 
            FROM transactions 
            WHERE status IN ('waiting') 
            AND queue_number > ? 
            ORDER BY queue_number ASC 
            LIMIT 1
          `;

          db.get(nextUserQuery, [queueNumber], (nextErr, nextTransaction) => {
            if (nextErr) {
              console.error('Failed to fetch the next user:', nextErr.message);
              return;
            }

            if (nextTransaction) {
              const nextNotificationQuery = `
                INSERT INTO notifications (user_id, message)
                VALUES (?, ?)
              `;
              const nextMessage = `You are next in line. Please be prepared.`;

              db.run(nextNotificationQuery, [nextTransaction.user_id, nextMessage], (nextNotifErr) => {
                if (nextNotifErr) {
                  console.error('Failed to notify the next user:', nextNotifErr.message);
                } else {
                  console.log(`Notification sent to user #${nextTransaction.user_id} (queue #${nextTransaction.queue_number}).`);
                }
              });
            } else {
              console.log('No next user in the queue.');
            }
          });
        }
      });
    });

    // Respond to the request
    res.status(200).json({ message: `Queue #${queueNumber} updated to ${status}.` });
  });
};



exports.notifyNextUser = (req, res) => {
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
      console.error('Failed to fetch next user:', err.message);
      return res.status(500).json({ message: 'Failed to fetch next user.' });
    }

    if (nextTransaction) {
      const notificationQuery = `
        INSERT INTO notifications (user_id, message)
        VALUES (?, 'You are next in line. Please be prepared.')
      `;
      db.run(notificationQuery, [nextTransaction.user_id], (notifErr) => {
        if (notifErr) {
          console.error('Failed to notify next user:', notifErr.message);
          return res.status(500).json({ message: 'Failed to notify next user.' });
        }

        res.status(200).json({ message: `Notified user #${nextTransaction.user_id} as next in line.` });
      });
    } else {
      res.status(404).json({ message: 'No next user in queue.' });
    }
  });
};





// Service Management
exports.getAllServices = (req, res) => {
  db.all('SELECT * FROM services ORDER BY service_id ASC', (err, rows) => {
    if (err) {
      console.error('Error fetching services:', err.message);
      return res.status(500).json({ message: 'Failed to fetch services.' });
    }
    res.json(rows);
  });
};

exports.addService = (req, res) => {
  const { service_name, description } = req.body;
  db.run(
    `INSERT INTO services (service_name, description) VALUES (?, ?)`,
    [service_name, description],
    function (err) {
      if (err) {
        console.error('Error adding service:', err.message);
        return res.status(500).json({ message: 'Failed to add service.' });
      }
      res.status(201).json({ service_id: this.lastID, message: 'Service added successfully.' });
    }
  );
};

exports.updateService = (req, res) => {
  const { serviceId } = req.params;
  const { service_name, description } = req.body;
  db.run(
    `UPDATE services SET service_name = ?, description = ? WHERE service_id = ?`,
    [service_name, description, serviceId],
    function (err) {
      if (err) {
        console.error('Error updating service:', err.message);
        return res.status(500).json({ message: 'Failed to update service.' });
      }
      res.status(200).json({ message: 'Service updated successfully.' });
    }
  );
};

exports.deleteService = (req, res) => {
  const { serviceId } = req.params;
  db.run('DELETE FROM services WHERE service_id = ?', [serviceId], function (err) {
    if (err) {
      console.error('Error deleting service:', err.message);
      return res.status(500).json({ message: 'Failed to delete service.' });
    }
    res.status(200).json({ message: 'Service deleted successfully.' });
  });
};

// Transactions Management
exports.addTransaction = (req, res) => {
  const { user_id, service_id } = req.body;

  if (!user_id || !service_id) {
    return res.status(400).json({ error: 'User ID and Service ID are required.' });
  }

  const checkTransactionQuery = `
    SELECT * FROM transactions 
    WHERE user_id = ? AND status IN ('waiting', 'in-progress')
    LIMIT 1
  `;
  db.get(checkTransactionQuery, [user_id], (err, activeTransaction) => {
    if (err) {
      console.error('Error checking active transactions:', err.message);
      return res.status(500).json({ error: 'Database error while checking active transactions.' });
    }

    if (activeTransaction) {
      return res.status(400).json({
        error: 'You already have an ongoing transaction. Please complete it before starting a new one.',
      });
    }

    const insertTransactionQuery = `
      INSERT INTO transactions (user_id, service_id, queue_number, status)
      VALUES (?, ?, (SELECT IFNULL(MAX(queue_number), 0) + 1 FROM transactions), 'waiting')
    `;
    db.run(insertTransactionQuery, [user_id, service_id], function (err) {
      if (err) {
        console.error('Error creating transaction:', err.message);
        return res.status(500).json({ error: 'Failed to create transaction.' });
      }

      const getQueueNumberQuery = `
        SELECT queue_number, 
               (SELECT service_name FROM services WHERE service_id = ?) AS transaction_type 
        FROM transactions 
        WHERE transaction_id = ?
      `;
      db.get(getQueueNumberQuery, [service_id, this.lastID], (err, transaction) => {
        if (err) {
          console.error('Error fetching transaction details:', err.message);
          return res.status(500).json({ error: 'Failed to fetch transaction details.' });
        }

        res.status(201).json({
          message: 'Transaction created successfully!',
          queue_number: transaction.queue_number,
          transaction_type: transaction.transaction_type,
        });
      });
    });
  });
};

// Notifications Management
exports.sendNotification = (req, res) => {
  const { user_id, message } = req.body;
  db.run(
    `INSERT INTO notifications (user_id, message) VALUES (?, ?)`,
    [user_id, message],
    (err) => {
      if (err) {
        console.error('Error sending notification:', err.message);
        return res.status(500).json({ message: 'Failed to send notification.' });
      }
      res.json({ message: 'Notification sent successfully.' });
    }
  );
};

// Fetch live queue data
exports.getLiveQueue = (req, res) => {
  const query = `
    SELECT transactions.queue_number, transactions.user_id, services.service_name AS transaction_type, transactions.status
    FROM transactions
    LEFT JOIN services ON transactions.service_id = services.service_id
    WHERE transactions.status IN ('waiting', 'in-progress')
    ORDER BY transactions.queue_number ASC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching live queue:', err.message);
      return res.status(500).json({ error: 'Failed to fetch live queue.' });
    }
    res.status(200).json(rows);
  });
};

// Fetch completed transactions
exports.getCompletedTransactions = (req, res) => {
  const query = `
    SELECT transactions.queue_number, transactions.user_id, services.service_name AS transaction_type, transactions.status
    FROM transactions
    LEFT JOIN services ON transactions.service_id = services.service_id
    WHERE transactions.status = 'completed'
    ORDER BY transactions.updated_at DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching completed transactions:', err.message);
      return res.status(500).json({ error: 'Failed to fetch completed transactions.' });
    }
    res.status(200).json(rows);
  });
};