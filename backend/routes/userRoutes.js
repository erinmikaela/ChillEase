// routes/userroutes.js
const express = require('express');
const { Database } = require('sqlite3').verbose();
const router = express.Router();

// Database connection
const db = new Database('./database/queueease.db');

// ==========================
// Login Route
// ==========================
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    const query = `SELECT * FROM users WHERE email = ? AND password = ?`;

    db.get(query, [email, password], (err, user) => {
        if (err) {
            console.error('Error during login:', err.message);
            return res.status(500).json({ error: 'Internal server error.' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // It's recommended to use sessions or JWTs for authentication in production
        res.status(200).json({
            message: 'Login successful.',
            user: {
                id: user.id,
                first_name: user.first_name,
                email: user.email,
                // Add other necessary fields
            },
        });
    });
});

// ==========================
// Fetch queue status for a specific user
// ==========================
router.get('/queue-status/:userId', (req, res) => {
    const userId = req.params.userId;

    const currentlyServingQuery = `
        SELECT t.queue_number, 
               s.service_name,
               u.first_name
        FROM transactions t
        JOIN services s ON t.service_id = s.service_id
        JOIN users u ON t.user_id = u.id
        WHERE t.status IN ('in-progress', 'waiting')
        ORDER BY t.queue_number ASC
        LIMIT 1
    `;

    const userQueueQuery = `
        SELECT t.queue_number, 
               s.service_name
        FROM transactions t
        JOIN services s ON t.service_id = s.service_id
        WHERE t.user_id = ? AND t.status IN ('waiting', 'in-progress')
        ORDER BY t.queue_number ASC
        LIMIT 1
    `;

    db.get(currentlyServingQuery, [], (err, currentlyServing) => {
        if (err) {
            console.error('Error fetching currently serving queue:', err.message);
            return res.status(500).json({ error: 'Failed to fetch currently serving queue.' });
        }

        console.log("Currently Serving Data:", currentlyServing);

        db.get(userQueueQuery, [userId], (err, userQueue) => {
            if (err) {
                console.error('Error fetching user queue:', err.message);
                return res.status(500).json({ error: 'Failed to fetch user queue.' });
            }

            // Determine if the user is in the queue
            const isUserInQueue = userQueue !== undefined;

            // Determine if someone is currently being served
            const isSomeoneServing = currentlyServing !== undefined;

            res.json({
                currently_serving: currentlyServing || null,
                user_queue: userQueue || null,
                isUserInQueue: isUserInQueue,
                isSomeoneServing: isSomeoneServing,
            });
        });
    });
});



// ==========================
// Fetch all services for dropdown
// ==========================
router.get('/services', (req, res) => {
    const query = `SELECT service_id, service_name FROM services`;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching services:', err.message);
            return res.status(500).json({ error: 'Failed to fetch services.' });
        }

        res.json(rows);
    });
});

// ==========================
// Add a transaction (join the queue) with Notification
// ==========================
router.post('/transactions', async (req, res) => {
    const { user_id, service_id } = req.body;

    if (!user_id || !service_id) {
        return res.status(400).json({ error: 'User ID and Service ID are required.' });
    }

    try {
        // Check if user already has an active transaction
        const checkActiveTransactionQuery = `
            SELECT * FROM transactions
            WHERE user_id = ? AND status IN ('waiting', 'in-progress')
            LIMIT 1
        `;

        const activeTransaction = await new Promise((resolve, reject) => {
            db.get(checkActiveTransactionQuery, [user_id], (err, row) => {
                if (err) {
                    console.error('Error checking active transactions:', err.message);
                    return reject('Failed to check active transactions.');
                }
                resolve(row);
            });
        });

        if (activeTransaction) {
            return res.status(400).json({ error: 'You already have an active transaction.' });
        }

        // Add new transaction if no active transaction exists
        const insertQuery = `
            INSERT INTO transactions (user_id, service_id, queue_number, status)
            VALUES (?, ?, (SELECT COALESCE(MAX(queue_number), 0) + 1 FROM transactions), 'waiting')
        `;

        await new Promise((resolve, reject) => {
            db.run(insertQuery, [user_id, service_id], function (err) {
                if (err) {
                    console.error('Error adding transaction:', err.message);
                    return reject('Failed to join the queue.');
                }
                resolve();
            });
        });

        // Fetch the actual queue_number for the inserted transaction
        const getQueueNumberQuery = `
            SELECT queue_number 
            FROM transactions 
            WHERE user_id = ? AND service_id = ? AND status = 'waiting'
            ORDER BY queue_number DESC
            LIMIT 1
        `;

        const transaction = await new Promise((resolve, reject) => {
            db.get(getQueueNumberQuery, [user_id, service_id], (err, row) => {
                if (err || !row) {
                    console.error('Error fetching transaction details:', err ? err.message : 'No transaction found.');
                    return reject('Failed to fetch transaction details.');
                }
                resolve(row);
            });
        });

        const queueNumber = transaction.queue_number;

        // Fetch user details to send in email
        const userDetailsQuery = `
            SELECT email, first_name FROM users WHERE id = ?
        `;

        const user = await new Promise((resolve, reject) => {
            db.get(userDetailsQuery, [user_id], (err, row) => {
                if (err || !row) {
                    console.error('Error fetching user details:', err ? err.message : 'User not found.');
                    return reject('Failed to fetch user details.');
                }
                resolve(row);
            });
        });

        const { email, first_name } = user;

        // Insert a notification into the notifications table
        const notificationMessage = "You are now in the queue, please wait for your turn.";
        const insertNotificationQuery = `
            INSERT INTO notifications (user_id, message)
            VALUES (?, ?)
        `;
        await new Promise((resolve, reject) => {
            db.run(insertNotificationQuery, [user_id, notificationMessage], function (err) {
                if (err) {
                    console.error('Failed to insert notification:', err.message);
                    return reject('Failed to insert notification.');
                }
                resolve();
            });
        });

        // Respond with necessary details for frontend to send email
        res.status(200).json({ 
            message: 'Successfully joined the queue.', 
            queue_number: queueNumber,
            email: email,
            first_name: first_name,
        });

        // Emit a socket event to update queues in real-time
        if (req.app && req.app.get('io')) {
            req.app.get('io').emit('queueUpdated');
        }
    } catch (error) {
        console.error('Error in /transactions route:', error);
        res.status(500).json({ error: typeof error === 'string' ? error : 'An unexpected error occurred.' });
    }
});

// ==========================
// Fetch notifications for a specific user
// ==========================
router.get('/notifications/:userId', (req, res) => {
    const userId = req.params.userId;
    const limit = req.query.limit ? parseInt(req.query.limit) : 0; // Default limit: 0 (no limit)
  
    const query = `
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      ${limit > 0 ? `LIMIT ?` : ''}
    `;
  
    db.all(query, limit > 0 ? [userId, limit] : [userId], (err, rows) => {
      if (err) {
        console.error('Error fetching notifications:', err.message);
        return res.status(500).json({ error: 'Failed to fetch notifications.' });
      }
  
      res.json(rows);
    });
});

module.exports = router;
