// js/scripts.js
// Initialize WebSocket connection
const socket = io();

// Handle Login Form Submission
document.getElementById('loginForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  try {
    const response = await fetch('/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (response.ok) {
      localStorage.setItem('id', result.user.id);
      localStorage.setItem('email', result.user.email);
      localStorage.setItem('first_name', result.user.first_name);
      localStorage.setItem('last_name', result.user.last_name);

      // Register user with WebSocket
      socket.emit('registerUser', result.user.id);

      alert(result.message);
      window.location.href = result.redirect;
    } else {
      alert(result.message || 'Login failed.');
    }
  } catch (error) {
    console.error('Error during login:', error);
    alert('An error occurred. Please try again later.');
  }
});

// Logout Function
function logout() {
  localStorage.clear();
  window.location.href = 'index.html';
}

// WebSocket event handlers
socket.on('userQueueUpdated', (data) => displayNotification(data.message));
socket.on('nextQueueNotification', (data) => displayNotification(data.message));
socket.on('transactionStatusUpdate', (data) => displayNotification(data.message));
socket.on('queueUpdated', refreshQueueDisplay);
socket.on('transactionCompleted', (data) => displayNotification(`Transaction #${data.transactionNumber} has been completed.`));
socket.on('transactionInProgress', (data) => displayNotification(`Your transaction #${data.transactionNumber} is now in progress.`));
socket.on('nextInLineNotification', (data) => displayNotification(`You are next in line. Please be ready.`));
socket.on('secondInLineNotification', (data) => displayNotification(`You are second in line. Please prepare.`));

/**
 * Display a notification in the UI
 * @param {String} message - The notification message
 */
function displayNotification(message) {
  const notificationsContainer = document.getElementById('notificationsContainer');
  if (notificationsContainer) {
    const notificationCard = `
      <div class="notification-card">
          <p>${message}</p>
          <span>${new Date().toLocaleString()}</span>
      </div>
    `;
    notificationsContainer.innerHTML = notificationCard + notificationsContainer.innerHTML;
  } else {
    console.error('Notifications container not found.');
  }
}

/**
 * Fetch and dynamically update the queue display
 */
async function refreshQueueDisplay() {
  try {
    const response = await fetch('/api/users/queue');
    if (!response.ok) throw new Error('Failed to fetch queue.');

    const queueData = await response.json();
    const queueContainer = document.getElementById('queueContainer');

    if (queueContainer) {
      queueContainer.innerHTML = ''; // Clear existing content
      queueData.forEach((queueItem) => {
        const queueElement = document.createElement('div');
        queueElement.id = `queueItem-${queueItem.queue_number}`;
        queueElement.classList.add('queue-item');
        queueElement.textContent = `Queue #${queueItem.queue_number} - ${queueItem.first_name} ${queueItem.last_name} (${queueItem.status})`;
        queueContainer.appendChild(queueElement);
      });
    }
  } catch (error) {
    console.error('Error refreshing queue display:', error);
    alert('Failed to refresh the queue. Please try again later.');
  }
}

/**
 * Fetch and display user notifications
 * @param {Number} limit - Number of notifications to fetch
 */
async function loadNotifications(limit = 5) {
  try {
    const userId = localStorage.getItem('id');
    if (!userId) throw new Error('User not logged in.');

    const response = await fetch(`/api/users/notifications/${userId}?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch notifications.');

    const notifications = await response.json();
    const notificationsContainer = document.getElementById('notificationsContainer');

    if (notificationsContainer) {
      if (notifications.length > 0) {
        notificationsContainer.innerHTML = notifications
          .map(
            (notification) => `
          <div class="notification-card">
            <p>${notification.message}</p>
            <span>${new Date(notification.created_at).toLocaleString()}</span>
          </div>
        `
          )
          .join('');
      } else {
        notificationsContainer.innerHTML = '<p>No notifications found.</p>';
      }
    }
  } catch (error) {
    console.error('Error loading notifications:', error);
    const notificationsContainer = document.getElementById('notificationsContainer');
    if (notificationsContainer) {
      notificationsContainer.innerHTML = '<p>Error loading notifications. Please try again later.</p>';
    }
  }
}

/**
 * Load all notifications on user request
 */
async function loadAllNotifications() {
  await loadNotifications(1000);
}

// Automatically fetch notifications on page load
document.addEventListener('DOMContentLoaded', () => {
  const notificationsContainer = document.getElementById('notificationsContainer');
  if (notificationsContainer) {
    loadNotifications();

    const userId = localStorage.getItem('id');
    if (userId) {
      socket.emit('registerUser', userId);
    }

    const loadAllBtn = document.getElementById('loadAllNotifications');
    if (loadAllBtn) {
      loadAllBtn.addEventListener('click', loadAllNotifications);
    }
  }
});
