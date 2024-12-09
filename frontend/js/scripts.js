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



document.addEventListener('DOMContentLoaded', function() {
  // Get the warning message and the login/register buttons
  const geoWarning = document.getElementById('geoWarning');
  const loginButton = document.getElementById('loginButton');
  const registerButton = document.getElementById('registerButton');

  // Initially hide the buttons
  loginButton.style.display = 'none';
  registerButton.style.display = 'none';

  // Initialize the Socket.IO connection
  const socket = io(); // Automatically connects to the server on the same domain

  socket.on('connect', () => {
    console.log('Connected to the server');
  });

  // Function to validate the location
  function validateLocation(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    console.log('User Location:', latitude, longitude); // Debugging: Check user location

    // Hardcode the allowed latitude and longitude as you provided:
    const ALLOWED_LATITUDE = 14.463976595354648;
    const ALLOWED_LONGITUDE = 121.02209109580798;
    const ALLOWED_RADIUS = 5000; // 1 km radius

    // Log the approved area coordinates
    console.log('Approved Area - Latitude:', ALLOWED_LATITUDE, 'Longitude:', ALLOWED_LONGITUDE);

    // Calculate the distance between the current location and the allowed location
    const distance = getDistance(latitude, longitude, ALLOWED_LATITUDE, ALLOWED_LONGITUDE);

    console.log('Calculated Distance:', distance); // Log the distance

    // Adjusting logic: Show warning and hide buttons if outside the range
    if (distance > ALLOWED_RADIUS) {
      console.log('Location is outside the allowed range.');
      geoWarning.style.display = 'block';  // Show the warning message
      loginButton.style.display = 'none';  // Hide login button
      registerButton.style.display = 'none';  // Hide register button
    } else {
      console.log('Location is within the allowed range.');
      geoWarning.style.display = 'none';  // Hide the warning if location is valid
      loginButton.style.display = 'inline-block';  // Show login button
      registerButton.style.display = 'inline-block';  // Show register button
    }
  }

  // Function to calculate the distance between two geographic coordinates (Haversine formula)
  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km

    return distance * 1000; // Convert distance to meters
  }

  // Check if geolocation is available and get the user's location
  if (navigator.geolocation) {
    console.log('Geolocation is available.'); // Debugging
    navigator.geolocation.getCurrentPosition(validateLocation, function(error) {
      console.error('Error getting location:', error); // Debugging
      geoWarning.style.display = 'block';  // Show warning if there is an error with geolocation
      loginButton.style.display = 'none';  // Hide login button
      registerButton.style.display = 'none';  // Hide register button
    });
  } else {
    console.log('Geolocation is not available in this browser.'); // Debugging
    geoWarning.style.display = 'block';  // Show warning if geolocation is not available
    loginButton.style.display = 'none';  // Hide login button
    registerButton.style.display = 'none';  // Hide register button
  }
});