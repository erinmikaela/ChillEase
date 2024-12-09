const { Server } = require('socket.io');

let io; // WebSocket server instance

/**
 * Initialize WebSocket server
 * @param {Object} server - The HTTP server instance
 */
function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*", // Allow all origins, or specify allowed origins for security
      methods: ["GET", "POST"],
    },
  });

  io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    // Register user to a specific room based on user ID
    socket.on('registerUser', (userId) => {
      socket.user_id = userId;
      socket.join(userId); // Add user to a room with their user ID
      console.log(`User registered with ID: ${userId} and added to room.`);
    });

    // Listen for queue-specific events (optional)
    socket.on('queueAction', (action) => {
      console.log(`Action received from ${socket.user_id}: ${action}`);
      // Perform server-side handling if needed
    });

    // Handle user disconnects
    socket.on('disconnect', () => {
      console.log(`A user disconnected: ${socket.id}`);
    });
  });
}

/**
 * Emit an event to a specific room (user-specific notification)
 * @param {String} room - The room (user ID) to emit the event to
 * @param {String} event - The event name
 * @param {Object} payload - The event payload
 */
function emitToRoom(room, event, payload) {
  if (io) {
    io.to(room.toString()).emit(event, payload);
    console.log(`Event "${event}" emitted to room: ${room}`);
  } else {
    console.error('WebSocket server not initialized.');
  }
}

/**
 * Emit a system-wide event (broadcast)
 * @param {String} event - The event name
 * @param {Object} payload - The event payload
 */
function emitToAll(event, payload) {
  if (io) {
    io.emit(event, payload);
    console.log(`System-wide event "${event}" broadcasted.`);
  } else {
    console.error('WebSocket server not initialized.');
  }
}

/**
 * Notify all clients about a queue update
 */
function notifyQueueUpdate() {
  emitToAll('queueUpdated', { message: 'The queue has been updated.' });
}

/**
 * Notify a specific user about their queue status update
 * @param {String} userId - The ID of the user to notify
 * @param {String} message - Notification message
 */
function notifyUserQueueUpdate(userId, message) {
  emitToRoom(userId, 'userQueueUpdated', { message });
}

/**
 * Notify the user whose transaction is now in-progress
 * @param {String} userId - The ID of the user
 * @param {String} transactionNumber - The transaction number
 */
function notifyInProgress(userId, transactionNumber) {
  const message = `Your transaction #${transactionNumber} is now in progress.`;
  notifyUserQueueUpdate(userId, message);
}

/**
 * Notify the user whose transaction has been completed
 * @param {String} userId - The ID of the user
 * @param {String} transactionNumber - The transaction number
 */
function notifyCompletion(userId, transactionNumber) {
  const message = `Transaction #${transactionNumber} has been completed.`;
  notifyUserQueueUpdate(userId, message);
}

/**
 * Notify the next user in line to prepare
 * @param {String} userId - The ID of the next user
 */
function notifyNextUser(userId) {
  const message = `You are next in line. Please be ready.`;
  notifyUserQueueUpdate(userId, message);
}

/**
 * Notify the next user that their transaction is in-progress
 * @param {String} userId - The ID of the user
 * @param {String} transactionNumber - The transaction number
 */
function notifyNextInProgress(userId, transactionNumber) {
  const message = `Your transaction #${transactionNumber} is now in progress. Please proceed.`;
  notifyUserQueueUpdate(userId, message);
}

/**
 * Notify the user who is 2nd in line to prepare
 * @param {String} userId - The ID of the user
 */
function notifySecondInLine(userId) {
  const message = `Prepare yourself, you are 2nd in line.`;
  notifyUserQueueUpdate(userId, message);
}

/**
 * Notify all users of a system-wide message or alert
 * @param {String} message - Notification message
 */
function notifySystemMessage(message) {
  emitToAll('systemNotification', { message });
}

/**
 * Notify all clients about completed transactions updates
 */
function notifyCompletedUpdate() {
  if (io) {
    io.emit('completedUpdated', { message: 'Completed transactions updated.' });
    console.log('Completed transactions update notification sent.');
  } else {
    console.error('WebSocket server not initialized.');
  }
}

module.exports = {
  initSocket,
  notifyQueueUpdate,
  notifyUserQueueUpdate,
  notifyInProgress, // Notify in-progress state
  notifyCompletion, // Notify completion state
  notifyNextUser, // Notify next user to prepare
  notifyNextInProgress, // Notify next user in progress
  notifySecondInLine, // Notify the user who is 2nd in line
  notifySystemMessage,
  notifyCompletedUpdate,
};
