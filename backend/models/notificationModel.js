const { db } = require('./database');

const NotificationModel = {
  // Create a new notification for a specific user
  createNotification: (notification, callback) => {
    const query = `
      INSERT INTO notifications (user_id, message)
      VALUES (?, ?)
    `;
    db.run(query, [notification.user_id, notification.message], callback);
  },

  // Fetch recent notifications (latest 5) for a specific user
  getRecentNotifications: (user_id, callback) => {
    const query = `
      SELECT * 
      FROM notifications 
      WHERE user_id = ? OR user_id IS NULL 
      ORDER BY created_at DESC
      LIMIT 5
    `;
    db.all(query, [user_id], callback);
  },

  // Fetch all notifications for a specific user
  getAllNotifications: (user_id, callback) => {
    const query = `
      SELECT * 
      FROM notifications 
      WHERE user_id = ? OR user_id IS NULL 
      ORDER BY created_at DESC
    `;
    db.all(query, [user_id], callback);
  },

  // Update notification status (e.g., mark as read/unread)
  updateNotificationStatus: (notification_id, status, callback) => {
    const query = `
      UPDATE notifications 
      SET status = ? 
      WHERE notification_id = ?
    `;
    db.run(query, [status, notification_id], callback);
  },

  // Delete a specific notification by ID
  deleteNotification: (notification_id, callback) => {
    const query = `
      DELETE FROM notifications 
      WHERE notification_id = ?
    `;
    db.run(query, [notification_id], callback);
  },

  // Delete all notifications for a specific user
  deleteNotificationsByUserId: (user_id, callback) => {
    const query = `
      DELETE FROM notifications 
      WHERE user_id = ?
    `;
    db.run(query, [user_id], callback);
  },

  // Notify a user about a specific queue update
  notifyUserQueueUpdate: (user_id, message, callback) => {
    const query = `
      INSERT INTO notifications (user_id, message)
      VALUES (?, ?)
    `;
    db.run(query, [user_id, message], callback);
  },

  // Notify all users about a system-wide update
  notifySystemWideUpdate: (message, callback) => {
    const query = `
      INSERT INTO notifications (user_id, message)
      VALUES (NULL, ?)
    `;
    db.run(query, [message], callback);
  },

  // Notify a user when their transaction is completed
  notifyTransactionCompleted: (user_id, callback) => {
    const message = 'Your transaction has been successfully completed.';
    const query = `
      INSERT INTO notifications (user_id, message)
      VALUES (?, ?)
    `;
    db.run(query, [user_id, message], callback);
  },

  // Notify the next user in the queue
  notifyNextUser: (user_id, callback) => {
    const message = 'Your transaction is now in progress.';
    const query = `
      INSERT INTO notifications (user_id, message)
      VALUES (?, ?)
    `;
    db.run(query, [user_id, message], callback);
  },

  // Notify the upcoming user in the queue
  notifyUpcomingUser: (user_id, callback) => {
    const message = 'You are next in line. Please be prepared.';
    const query = `
      INSERT INTO notifications (user_id, message)
      VALUES (?, ?)
    `;
    db.run(query, [user_id, message], callback);
  },

  // Notify when a transaction is marked as completed
  notifyCompletedTransaction: (user_id, queue_number, callback) => {
    const message = `Transaction #${queue_number} has been completed.`;
    const query = `
      INSERT INTO notifications (user_id, message)
      VALUES (?, ?)
    `;
    db.run(query, [user_id, message], callback);
  },

  // Notify when a transaction is marked as in-progress
  notifyTransactionInProgress: (user_id, queue_number, callback) => {
    const message = `Your transaction #${queue_number} is now in progress.`;
    const query = `
      INSERT INTO notifications (user_id, message)
      VALUES (?, ?)
    `;
    db.run(query, [user_id, message], callback);
  },
};

module.exports = NotificationModel;
