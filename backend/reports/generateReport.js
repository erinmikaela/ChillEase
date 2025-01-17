// backend/reports/generateReport.js

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const puppeteer = require('puppeteer'); // Add puppeteer

const router = express.Router();

// Path to your SQLite database
const dbPath = path.resolve(__dirname, '../database/queueease.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to the SQLite database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Helper function to calculate date ranges
function getDateRange(period, specificDate) {
  const today = new Date();
  let startDate, endDate;

  if (specificDate) {
    startDate = new Date(specificDate);
    endDate = new Date(specificDate);
    endDate.setDate(endDate.getDate() + 1);
  } else {
    switch (period) {
      case 'today':
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        break;
      case 'weekly':
        const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        startDate = new Date(firstDayOfWeek.getFullYear(), firstDayOfWeek.getMonth(), firstDayOfWeek.getDate());
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);
        break;
      case 'monthly':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        break;
      case 'six-months':
        startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        break;
      case 'annually':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear() + 1, 0, 1);
        break;
      case 'five-years':
        startDate = new Date(today.getFullYear() - 4, 0, 1);
        endDate = new Date(today.getFullYear() + 1, 0, 1);
        break;
      case 'ten-years':
        startDate = new Date(today.getFullYear() - 9, 0, 1);
        endDate = new Date(today.getFullYear() + 1, 0, 1);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    }
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

// Serve the report.html file
router.get('/report.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'report.html'));
});

// Serve static assets (CSS and JS) directly from the reports directory
router.use(express.static(path.join(__dirname)));

// API Endpoints

// 1. Service Utilization Report
router.get('/api/service-utilization', (req, res) => {
  const { period, date } = req.query;
  const { startDate, endDate } = getDateRange(period, date);

  const query = `
    SELECT 
      s.service_name,
      COUNT(t.transaction_id) AS total_transactions
    FROM 
      transactions t
    JOIN 
      services s ON t.service_id = s.service_id
    WHERE 
      t.created_at BETWEEN ? AND ?
    GROUP BY 
      t.service_id
    ORDER BY 
      total_transactions DESC;
  `;

  db.all(query, [startDate, endDate], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 2. User Registration Report
router.get('/api/user-registrations', (req, res) => {
  const { period, date } = req.query;
  const { startDate, endDate } = getDateRange(period, date);

  const query = `
    SELECT 
      DATE(created_at) AS registration_date,
      COUNT(id) AS total_users
    FROM 
      users
    WHERE 
      created_at BETWEEN ? AND ?
    GROUP BY 
      registration_date
    ORDER BY 
      registration_date ASC;
  `;

  db.all(query, [startDate, endDate], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 3. Daily Peak Time Report
router.get('/api/daily-peak-times', (req, res) => {
  const { period, date } = req.query;
  const { startDate, endDate } = getDateRange(period, date);

  const query = `
    SELECT 
      strftime('%H', created_at) AS hour,
      COUNT(transaction_id) AS total_transactions
    FROM 
      transactions
    WHERE 
      created_at BETWEEN ? AND ?
    GROUP BY 
      hour
    ORDER BY 
      total_transactions DESC;
  `;

  db.all(query, [startDate, endDate], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 4. Transaction Status Distribution Report
router.get('/api/transaction-status', (req, res) => {
  const { period, date } = req.query;
  const { startDate, endDate } = getDateRange(period, date);

  const query = `
    SELECT 
      status,
      COUNT(transaction_id) AS total_transactions
    FROM 
      transactions
    WHERE 
      created_at BETWEEN ? AND ?
    GROUP BY 
      status
    ORDER BY 
      total_transactions DESC;
  `;

  db.all(query, [startDate, endDate], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 5. Service-Specific Usage Trends Report
router.get('/api/service-usage-trends', (req, res) => {
  const { period, date } = req.query;
  const { startDate, endDate } = getDateRange(period, date);

  const query = `
    SELECT 
      DATE(t.created_at) AS usage_date,
      s.service_name,
      COUNT(t.transaction_id) AS total_transactions
    FROM 
      transactions t
    JOIN 
      services s ON t.service_id = s.service_id
    WHERE 
      t.created_at BETWEEN ? AND ?
    GROUP BY 
      usage_date, s.service_name
    ORDER BY 
      usage_date ASC, total_transactions DESC;
  `;

  db.all(query, [startDate, endDate], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// New endpoint to generate PDF
router.post('/api/generate-pdf', async (req, res) => {
  const { htmlContent } = req.body;

  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4' });

    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=report.pdf',
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Error generating PDF');
  }
});

module.exports = router;
