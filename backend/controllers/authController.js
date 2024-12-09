// controllers/authController.js
const { db } = require('../models/database');

// Register User
exports.registerUser = (req, res) => {
  const { first_name, last_name, address, zip_code, contact_number, email, password, role } = req.body;

  const query = `
    INSERT INTO users (first_name, last_name, address, zip_code, contact_number, email, password, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.run(query, [first_name, last_name, address, zip_code, contact_number, email, password.trim(), role || 'user'], function (err) {
    if (err) {
      console.error('Error registering user:', err.message);
      return res.status(400).json({ message: 'Error registering user.' });
    }
    res.status(201).json({ user_id: this.lastID }); // Respond with the user ID
  });
};

// Login User
exports.loginUser = (req, res) => {
  const { email, password } = req.body;

  const query = `SELECT * FROM users WHERE email = ? AND password = ?`;
  db.get(query, [email.trim(), password.trim()], (err, user) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Store the user's ID in the session to ensure uniqueness across tabs/devices
    req.session.user_id = user.id;

    // Prepare user data to send to frontend
    const userData = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
    };

    // Redirect based on user role
    if (user.role === 'admin') {
      return res.status(200).json({
        message: 'Welcome, Admin!',
        redirect: '/admin-dashboard.html',
        user: userData,
      });
    } else if (user.role === 'user') {
      return res.status(200).json({
        message: 'Welcome, User!',
        redirect: '/user-dashboard.html',
        user: userData,
      });
    } else {
      return res.status(403).json({ message: 'Invalid role.' });
    }
  });
};

// Logout User
exports.logoutUser = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error logging out user:', err.message);
      return res.status(500).json({ message: 'Error logging out.' });
    }
    res.status(200).json({ message: 'Logout successful.' });
  });
};
