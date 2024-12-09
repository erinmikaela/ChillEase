const express = require("express");
const router = express.Router();
const { db } = require("../models/database");
const TransactionModel = require("../models/transactionModel");

// ==========================
// Centralized Notification Function
// ==========================
function notifyUser(userId, queueNumber, message) {
    return new Promise((resolve, reject) => {
        console.log(`Attempting to notify user ID: ${userId} with message: "${message}" for queue #${queueNumber}`);

        const notificationQuery = `
            INSERT INTO notifications (user_id, message)
            VALUES (?, ?)
        `;
        db.run(notificationQuery, [userId, message], function (notifErr) {
            if (notifErr) {
                console.error("Failed to insert notification:", notifErr.message);
                return reject("Failed to notify user.");
            }

            const userEmailQuery = `SELECT email, first_name FROM users WHERE id = ?`;
            db.get(userEmailQuery, [userId], (userErr, user) => {
                if (userErr || !user) {
                    console.error("Failed to fetch user details:", userErr?.message || "User not found.");
                    return reject("Failed to fetch user details.");
                }

                console.log(`Fetched User - Email: ${user.email}, First Name: ${user.first_name}`);

                resolve({
                    email: user.email,
                    firstName: user.first_name,
                    dynamicMessage: message,
                });
            });
        });
    });
}

// ==========================
// Notification Routes
// ==========================

// Notify the next user manually
router.post("/queue/:queueNumber/notify-next", async (req, res) => {
    const { queueNumber } = req.params;
    console.log(`Notifying next user for queue #${queueNumber}`);

    const nextUserQuery = `
        SELECT queue_number, user_id
        FROM transactions
        WHERE status = 'waiting' AND queue_number > ?
        ORDER BY queue_number ASC
        LIMIT 1
    `;
    db.get(nextUserQuery, [queueNumber], async (err, nextTransaction) => {
        if (err) {
            console.error("Failed to fetch next user:", err.message);
            return res.status(500).json({ error: "Failed to fetch next user." });
        }

        if (nextTransaction) {
            const dynamicMessage = `You are next in line. Please be prepared.`;
            console.log(`Next user found: ${nextTransaction.user_id}. Sending message: "${dynamicMessage}"`);
            try {
                const emailData = await notifyUser(nextTransaction.user_id, queueNumber, dynamicMessage);
                res.status(200).json({ message: `Next user notified.`, notifications: [emailData] });
            } catch (notificationError) {
                res.status(500).json({ error: notificationError });
            }
        } else {
            console.log("No next user in queue.");
            res.status(404).json({ error: "No next user in queue." });
        }
    });
});

// Notify when a user joins the queue
router.post("/queue/:userId/join", async (req, res) => {
    const { userId } = req.params;
    const dynamicMessage = "You are now in the queue, please wait for your turn.";
    console.log(`User #${userId} is joining the queue. Sending message: "${dynamicMessage}"`);

    try {
        const emailData = await notifyUser(userId, null, dynamicMessage);
        res.status(200).json({
            message: `Join notification sent to user #${userId}.`,
            notifications: [emailData],
        });
    } catch (error) {
        res.status(500).json({ error });
    }
});

// Notify when a transaction is in progress
router.post("/queue/:queueNumber/in-progress", async (req, res) => {
    const { queueNumber } = req.params;
    console.log(`Notifying user for queue #${queueNumber} in-progress.`);

    const fetchTransactionQuery = `SELECT user_id FROM transactions WHERE queue_number = ?`;
    db.get(fetchTransactionQuery, [queueNumber], async (err, transaction) => {
        if (err || !transaction) {
            console.error("Failed to fetch transaction:", err?.message || "Transaction not found.");
            return res.status(500).json({ error: "Failed to fetch transaction." });
        }

        const dynamicMessage = `Your transaction #${queueNumber} is now in progress.`;
        console.log(`Sending in-progress message to user #${transaction.user_id}: "${dynamicMessage}"`);

        try {
            // Notify current user
            const currentUserEmail = await notifyUser(transaction.user_id, queueNumber, dynamicMessage);

            // Notify next user
            const nextUserQuery = `
                SELECT queue_number, user_id
                FROM transactions
                WHERE status = 'waiting' AND queue_number > ?
                ORDER BY queue_number ASC
                LIMIT 1
            `;
            db.get(nextUserQuery, [queueNumber], async (err, nextTransaction) => {
                if (err) {
                    console.error("Failed to fetch next user:", err.message);
                    return res.status(500).json({ error: "Failed to fetch next user." });
                }

                if (nextTransaction) {
                    const nextMessage = `You are next in line. Please be prepared.`;
                    console.log(`Next user found: ${nextTransaction.user_id}. Sending message: "${nextMessage}"`);
                    try {
                        const nextUserEmail = await notifyUser(nextTransaction.user_id, queueNumber, nextMessage);
                        res.status(200).json({
                            message: `In-progress notification sent to current user and next user.`,
                            notifications: [currentUserEmail, nextUserEmail],
                        });
                    } catch (nextNotificationError) {
                        res.status(500).json({ error: nextNotificationError });
                    }
                } else {
                    // No next user
                    res.status(200).json({
                        message: `In-progress notification sent to current user. No next user in queue.`,
                        notifications: [currentUserEmail],
                    });
                }
            });
        } catch (notificationError) {
            res.status(500).json({ error: notificationError });
        }
    });
});

// Notify when a transaction is completed
router.post("/queue/:queueNumber/complete", async (req, res) => {
    const { queueNumber } = req.params;
    console.log(`Notifying user for queue #${queueNumber} completion.`);

    const fetchTransactionQuery = `SELECT user_id FROM transactions WHERE queue_number = ?`;
    db.get(fetchTransactionQuery, [queueNumber], async (err, transaction) => {
        if (err || !transaction) {
            console.error("Failed to fetch transaction:", err?.message || "Transaction not found.");
            return res.status(500).json({ error: "Failed to fetch transaction." });
        }

        const dynamicMessage = `Transaction #${queueNumber} has been completed.`;
        console.log(`Sending completion message to user #${transaction.user_id}: "${dynamicMessage}"`);

        try {
            const emailData = await notifyUser(transaction.user_id, queueNumber, dynamicMessage);
            res.status(200).json({
                message: `Completion notification sent to user #${transaction.user_id}.`,
                notifications: [emailData],
            });
        } catch (error) {
            res.status(500).json({ error });
        }
    });
});

// Notify when a transaction is canceled
router.post("/queue/:queueNumber/cancel", async (req, res) => {
    const { queueNumber } = req.params;
    console.log(`Notifying user for queue #${queueNumber} cancellation.`);

    const fetchTransactionQuery = `SELECT user_id FROM transactions WHERE queue_number = ?`;
    db.get(fetchTransactionQuery, [queueNumber], async (err, transaction) => {
        if (err || !transaction) {
            console.error("Failed to fetch transaction:", err?.message || "Transaction not found.");
            return res.status(500).json({ error: "Failed to fetch transaction." });
        }

        const dynamicMessage = `Transaction #${queueNumber} has been canceled.`;
        console.log(`Sending cancellation message to user #${transaction.user_id}: "${dynamicMessage}"`);

        try {
            const emailData = await notifyUser(transaction.user_id, queueNumber, dynamicMessage);
            res.status(200).json({
                message: `Cancellation notification sent to user #${transaction.user_id}.`,
                notifications: [emailData],
            });
        } catch (error) {
            res.status(500).json({ error });
        }
    });
});

// ==========================
// User Management Routes
// ==========================

// Create a new user
router.post("/users", (req, res) => {
    const {
        first_name,
        last_name,
        address,
        zip_code,
        contact_number,
        email,
        password,
        role,
    } = req.body;
    const insertUserQuery = `
        INSERT INTO users (first_name, last_name, address, zip_code, contact_number, email, password, role)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(
        insertUserQuery,
        [
            first_name,
            last_name,
            address,
            zip_code,
            contact_number,
            email,
            password,
            role || "user",
        ],
        function (err) {
            if (err) {
                console.error("Error adding user:", err.message);
                return res.status(500).json({ message: "Failed to add user." });
            }
            console.log(`User added successfully: ID ${this.lastID}`);
            res.status(201).json({ id: this.lastID, message: "User added successfully." });
        }
    );
});

// Update an existing user
router.put("/users/:id", (req, res) => {
    const { id } = req.params;
    const {
        first_name,
        last_name,
        address,
        zip_code,
        contact_number,
        email,
        password,
        role,
    } = req.body;

    db.get("SELECT * FROM users WHERE id = ?", [id], (err, user) => {
        if (err)
            return res.status(500).json({ message: "Error retrieving user for update." });
        if (!user) return res.status(404).json({ message: "User not found." });

        const updatedPassword = password || user.password;
        const updateUserQuery = `
            UPDATE users 
            SET first_name = ?, last_name = ?, address = ?, zip_code = ?, contact_number = ?, email = ?, password = ?, role = ?
            WHERE id = ?
        `;
        db.run(
            updateUserQuery,
            [
                first_name || user.first_name,
                last_name || user.last_name,
                address || user.address,
                zip_code || user.zip_code,
                contact_number || user.contact_number,
                email || user.email,
                updatedPassword,
                role || user.role,
                id,
            ],
            function (err) {
                if (err)
                    return res.status(500).json({ message: "Error updating user." });
                console.log(`User #${id} updated successfully.`);
                res.status(200).json({ message: "User updated successfully." });
            }
        );
    });
});

// Delete a user
router.delete("/users/:id", (req, res) => {
    const { id } = req.params;

    db.run("DELETE FROM users WHERE id = ?", [id], function (err) {
        if (err) {
            console.error("Failed to delete user:", err.message);
            return res.status(500).json({ message: "Failed to delete user." });
        }
        console.log(`User #${id} deleted successfully.`);
        res.status(200).json({ message: "User deleted successfully." });
    });
});

// ==========================
// Transactions Management Routes
// ==========================

// Create a new transaction and notify the user
router.post("/transactions", (req, res) => {
    const { user_id, service_id } = req.body;

    if (!user_id || !service_id) {
        return res.status(400).json({ error: "User ID and Service ID are required." });
    }

    const checkTransactionQuery = `
        SELECT * FROM transactions 
        WHERE user_id = ? AND status IN ('waiting', 'in-progress')
    `;
    db.get(checkTransactionQuery, [user_id], async (err, activeTransaction) => {
        if (err) {
            console.error("Database error while checking active transactions:", err.message);
            return res.status(500).json({ error: "Database error while checking active transactions." });
        }

        if (activeTransaction) {
            console.log(`User #${user_id} already has an active transaction.`);
            return res.status(400).json({
                error:
                    "You already have an ongoing transaction. Please complete it before starting a new one.",
            });
        }

        const insertTransactionQuery = `
            INSERT INTO transactions (user_id, service_id, queue_number, status)
            VALUES (?, ?, (SELECT IFNULL(MAX(queue_number), 0) + 1 FROM transactions), 'waiting')
        `;
        db.run(insertTransactionQuery, [user_id, service_id], async function (err) {
            if (err) {
                console.error("Failed to create transaction:", err.message);
                return res.status(500).json({ error: "Failed to create transaction." });
            }

            const transactionId = this.lastID;

            // Fetch the actual queue_number for the inserted transaction
            const getQueueNumberQuery = `SELECT queue_number FROM transactions WHERE transaction_id = ?`;
            db.get(getQueueNumberQuery, [transactionId], async (err, transaction) => {
                if (err || !transaction) {
                    console.error("Failed to fetch transaction details:", err?.message || "Transaction not found.");
                    return res.status(500).json({ error: "Failed to fetch transaction details." });
                }

                const queueNumber = transaction.queue_number;
                const dynamicMessage = "You are now in the queue, please wait for your turn.";

                console.log(`Transaction #${queueNumber} created for user #${user_id}. Notifying user.`);

                try {
                    const emailData = await notifyUser(user_id, queueNumber, dynamicMessage);
                    res.status(200).json({
                        message: `Transaction created and join notification sent to user #${user_id}.`,
                        notifications: [emailData],
                    });
                } catch (notificationError) {
                    res.status(500).json({ error: notificationError });
                }
            });
        });
    });
});

// Update transaction status and notify the user
router.put("/queue/:queueNumber/:action", (req, res) => {
    const { queueNumber, action } = req.params;
    let status;

    switch (action) {
        case "prioritize":
            status = "in-progress";
            break;
        case "complete":
            status = "completed";
            break;
        case "cancel":
            status = "canceled";
            break;
        default:
            return res.status(400).json({ error: "Invalid action." });
    }

    const updateQueueQuery = `
        UPDATE transactions 
        SET status = ? 
        WHERE queue_number = ? AND status IN ('waiting', 'in-progress')
    `;
    db.run(updateQueueQuery, [status, queueNumber], async function (err) {
        if (err) {
            console.error("Error updating queue status:", err.message);
            return res.status(500).json({ error: "Failed to update queue status." });
        }

        const fetchTransactionQuery = `SELECT user_id FROM transactions WHERE queue_number = ?`;
        db.get(fetchTransactionQuery, [queueNumber], async (err, transaction) => {
            if (err || !transaction) {
                console.error("Error fetching transaction:", err.message);
                return res.status(500).json({ error: "Failed to fetch transaction for notification." });
            }

            // Dynamically generate the message based on the status
            const message =
                status === "in-progress"
                    ? `Your transaction #${queueNumber} is now in progress.`
                    : status === "completed"
                        ? `Transaction #${queueNumber} has been completed.`
                        : `Transaction #${queueNumber} has been canceled.`;

            console.log(`Updating queue #${queueNumber} to ${status}. Notifying user #${transaction.user_id} with message: "${message}"`);

            try {
                // Notify current user
                const currentUserEmail = await notifyUser(transaction.user_id, queueNumber, message);

                if (status === "in-progress") {
                    // Find and notify next user
                    const nextUserQuery = `
                        SELECT queue_number, user_id
                        FROM transactions
                        WHERE status = 'waiting' AND queue_number > ?
                        ORDER BY queue_number ASC
                        LIMIT 1
                    `;
                    db.get(nextUserQuery, [queueNumber], async (err, nextTransaction) => {
                        if (err) {
                            console.error("Failed to fetch next user:", err.message);
                            return res.status(500).json({ error: "Failed to fetch next user." });
                        }

                        if (nextTransaction) {
                            const nextMessage = `You are next in line. Please be prepared.`;
                            console.log(`Next user found: ${nextTransaction.user_id}. Sending message: "${nextMessage}"`);
                            try {
                                const nextUserEmail = await notifyUser(nextTransaction.user_id, queueNumber, nextMessage);
                                res.status(200).json({
                                    message: `In-progress notification sent to current user and next user.`,
                                    notifications: [currentUserEmail, nextUserEmail],
                                });
                            } catch (nextNotificationError) {
                                res.status(500).json({ error: nextNotificationError });
                            }
                        } else {
                            // No next user
                            res.status(200).json({
                                message: `In-progress notification sent to current user. No next user in queue.`,
                                notifications: [currentUserEmail],
                            });
                        }
                    });
                } else {
                    // For 'complete' and 'cancel' actions, only notify the current user
                    res.status(200).json({
                        message: `${status.charAt(0).toUpperCase() + status.slice(1)} notification sent to user #${transaction.user_id}.`,
                        notifications: [currentUserEmail],
                    });
                }
            } catch (notificationError) {
                res.status(500).json({ error: notificationError });
            }
        });
    });
});

// ==========================
// Fetch Queue Data Routes
// ==========================

// Fetch completed transactions
router.get("/queue/completed", (req, res) => {
    const fetchCompletedQuery = `
        SELECT 
            t.queue_number, 
            t.user_id, 
            COALESCE(s.service_name, 'Unknown Service') AS transaction_type, 
            t.status, 
            t.created_at
        FROM transactions t
        LEFT JOIN services s ON t.service_id = s.service_id
        WHERE t.status = 'completed'
        ORDER BY t.created_at DESC
    `;
    db.all(fetchCompletedQuery, [], (err, rows) => {
        if (err) {
            console.error("Error fetching completed transactions:", err.message);
            return res.status(500).json({ message: "Failed to fetch completed transactions." });
        }
        res.json(rows);
    });
});

// Fetch live queue
router.get("/queue/live", (req, res) => {
    const fetchQueueQuery = `
        SELECT 
            t.queue_number, 
            t.user_id, 
            COALESCE(s.service_name, 'Unknown Service') AS transaction_type, 
            t.status
        FROM transactions t
        LEFT JOIN services s ON t.service_id = s.service_id
        WHERE t.status IN ('waiting', 'in-progress')
        ORDER BY t.queue_number ASC
    `;
    db.all(fetchQueueQuery, [], (err, rows) => {
        if (err) {
            console.error("Error fetching live queue:", err.message);
            return res.status(500).json({ message: "Failed to fetch live queue." });
        }
        res.json(rows);
    });
});

// ==========================
// Services Management Routes
// ==========================

// Fetch all services
router.get("/services", (req, res) => {
    db.all("SELECT * FROM services", [], (err, rows) => {
        if (err) {
            console.error("Failed to fetch services:", err.message);
            return res.status(500).json({ error: "Failed to fetch services." });
        }
        res.json(rows);
    });
});

// Add a new service
router.post("/services", (req, res) => {
    const { service_name, description } = req.body;

    if (!service_name) {
        return res.status(400).json({ error: "Service name is required." });
    }

    const insertServiceQuery = `
        INSERT INTO services (service_name, description) 
        VALUES (?, ?)
    `;
    db.run(insertServiceQuery, [service_name, description], function (err) {
        if (err) {
            console.error("Failed to add service:", err.message);
            return res.status(500).json({ message: "Failed to add service." });
        }
        console.log(`Service added successfully: ID ${this.lastID}`);
        res.status(201).json({ message: "Service added successfully." });
    });
});

// Delete a service
router.delete("/services/:serviceId", (req, res) => {
    const { serviceId } = req.params;

    db.run("DELETE FROM services WHERE service_id = ?", [serviceId], function (err) {
        if (err) {
            console.error("Failed to delete service:", err.message);
            return res.status(500).json({ message: "Failed to delete service." });
        }
        console.log(`Service #${serviceId} deleted successfully.`);
        res.status(200).json({ message: "Service deleted successfully." });
    });
});

// ==========================
// General Notifications Routes
// ==========================

// Send a general notification (if needed)
router.post("/notification", async (req, res) => {
    const { userId, message } = req.body;

    if (!userId || !message) {
        return res.status(400).json({ error: "User ID and message are required." });
    }

    try {
        const emailData = await notifyUser(userId, null, message);
        res.status(200).json({
            message: `General notification sent to user #${userId}.`,
            notifications: [emailData],
        });
    } catch (error) {
        res.status(500).json({ error });
    }
});

// Fetch all notifications
router.get("/notifications", (req, res) => {
    const fetchNotificationsQuery = `
        SELECT * 
        FROM notifications 
        ORDER BY created_at DESC
    `;
    db.all(fetchNotificationsQuery, [], (err, rows) => {
        if (err) {
            console.error("Failed to fetch notifications:", err.message);
            return res.status(500).json({ message: "Failed to fetch notifications." });
        }
        res.json(rows);
    });
});

module.exports = router;
