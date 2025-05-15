const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// Routes
router.post('/submit', reportController.submitReport);   // User submits report
router.get('/all', reportController.viewAllReports);     // Admin gets all reports

// Acknowledge instead of delete
router.put('/acknowledge/:id', (req, res) => {
  const id = req.params.id;
  const db = require('../models/database').db;

  const query = `UPDATE reports SET acknowledged = 1 WHERE id = ?`;
  db.run(query, [id], function (err) {
    if (err) return res.status(500).json({ message: 'Failed to acknowledge report' });
    res.status(200).json({ message: 'Report acknowledged successfully' });
  });
});

module.exports = router;
