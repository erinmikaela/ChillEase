const bcrypt = require('bcrypt'); // Import bcrypt for password hashing
const { db } = require('./database');

const UserModel = {
    // Create a new user with hashed password
    createUser: (user, callback) => {
        // Hash the password before saving it
        bcrypt.hash(user.password, 10, (err, hashedPassword) => {
            if (err) {
                console.error('Error hashing password:', err.message);
                return callback(err); // Pass the error to the callback
            }

            const query = `
                INSERT INTO users (first_name, last_name, address, zip_code, contact_number, email, password, role)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            db.run(query, [
                user.first_name,
                user.last_name,
                user.address,
                user.zip_code,
                user.contact_number,
                user.email,
                hashedPassword, // Save the hashed password
                user.role || 'user'
            ], callback);
        });
    },

    // Fetch a user by email
    getUserByEmail: (email, callback) => {
        const query = `SELECT * FROM users WHERE email = ?`;
        db.get(query, [email], callback);
    },

    // Fetch all users with the 'user' role
    getAllUsers: (callback) => {
        const query = `SELECT * FROM users WHERE role = 'user' ORDER BY created_at DESC`;
        db.all(query, [], callback);
    }
};

module.exports = UserModel;