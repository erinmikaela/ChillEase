const express = require('express');
const router  = express.Router();
const { db }  = require('../models/database');

// ── USER ENDPOINTS ──

// Fetch all announcements
// GET /api/support/announcements
router.get('/announcements', (req, res) => {
  db.all(
    `SELECT id, text, datetime(created_at) AS created_at
     FROM announcements
     ORDER BY id`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Fetch all FAQs
// GET /api/support/faqs
router.get('/faqs', (req, res) => {
  db.all(
    `SELECT id, question, answer, datetime(created_at) AS created_at
     FROM faqs
     ORDER BY id`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});


// ── ADMIN ENDPOINTS ──

// Create a new announcement
// POST /api/admin/support/announcements
router.post('/announcements', (req, res) => {
  const { text } = req.body;
  db.run(
    `INSERT INTO announcements (text) VALUES (?)`,
    [text],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({
        id:         this.lastID,
        text,
        created_at: new Date().toISOString()
      });
    }
  );
});

// Update an announcement
// PUT /api/admin/support/announcements/:id
router.put('/announcements/:id', (req, res) => {
  const { id }   = req.params;
  const { text } = req.body;
  db.run(
    `UPDATE announcements SET text = ? WHERE id = ?`,
    [text, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

// Delete an announcement
// DELETE /api/admin/support/announcements/:id
router.delete('/announcements/:id', (req, res) => {
  const { id } = req.params;
  db.run(
    `DELETE FROM announcements WHERE id = ?`,
    [id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: this.changes });
    }
  );
});

// Create a new FAQ
// POST /api/admin/support/faqs
router.post('/faqs', (req, res) => {
  const { question, answer } = req.body;
  db.run(
    `INSERT INTO faqs (question, answer) VALUES (?, ?)`,
    [question, answer],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({
        id:          this.lastID,
        question,
        answer,
        created_at:  new Date().toISOString()
      });
    }
  );
});

// Update a FAQ
// PUT /api/admin/support/faqs/:id
router.put('/faqs/:id', (req, res) => {
  const { id }           = req.params;
  const { question, answer } = req.body;
  db.run(
    `UPDATE faqs SET question = ?, answer = ? WHERE id = ?`,
    [question, answer, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

// Delete a FAQ
// DELETE /api/admin/support/faqs/:id
router.delete('/faqs/:id', (req, res) => {
  const { id } = req.params;
  db.run(
    `DELETE FROM faqs WHERE id = ?`,
    [id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: this.changes });
    }
  );
});

module.exports = router;
