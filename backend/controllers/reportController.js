const Report = require('../models/reportModel');

exports.submitReport = (req, res) => {
  const data = {
    user_id: req.body.user_id, // Make sure this is sent from frontend
    category: req.body.category,
    severity: req.body.severity,
    subject: req.body.subject,
    description: req.body.description,
    screenshot: req.body.screenshot || null,
    occurred_at: req.body.occurred_at || null
  };

  Report.createReport(data, (err, id) => {
    if (err) return res.status(500).json({ message: 'Failed to save report' });
    res.status(200).json({ message: 'Report submitted', report_id: id });
  });
};

exports.viewAllReports = (req, res) => {
  Report.getAllReports((err, rows) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch reports' });
    res.status(200).json(rows);
  });
};
