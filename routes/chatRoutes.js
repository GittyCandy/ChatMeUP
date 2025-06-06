// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../messages.json');

// GET all messages
router.get('/messages', (req, res) => {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading messages');
    try {
      const arr = JSON.parse(data || '[]');
      return res.json(arr);
    } catch {
      return res.json([]);
    }
  });
});

// DELETE one message by id (only used by author’s client)
router.delete('/messages/:id', (req, res) => {
  const msgId = req.params.id;
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading messages');
    let messages = [];
    try {
      messages = JSON.parse(data || '[]');
    } catch {
      messages = [];
    }
    const filtered = messages.filter(m => m.id !== msgId);
    fs.writeFile(filePath, JSON.stringify(filtered, null, 2), writeErr => {
      if (writeErr) return res.status(500).send('Error deleting message');
      return res.sendStatus(200);
    });
  });
});

module.exports = router;
