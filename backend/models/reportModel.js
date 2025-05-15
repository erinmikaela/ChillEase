const { db } = require('./database');

// Insert a new report
exports.createReport = (data, callback) => {
  const query = `
    INSERT INTO reports (user_id, category, severity, subject, description, screenshot, occurred_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    data.user_id,
    data.category,
    data.severity,
    data.subject,
    data.description,
    data.screenshot,
    data.occurred_at
  ];
  db.run(query, values, function (err) {
    callback(err, this?.lastID);
  });
};

// Get all reports (admin use)
exports.getAllReports = (callback) => {
  const query = `
    SELECT r.*, u.first_name || ' ' || u.last_name AS full_name, u.email
    FROM reports r
    JOIN users u ON r.user_id = u.id
    ORDER BY r.submitted_at DESC
  `;
  db.all(query, [], callback);
};
