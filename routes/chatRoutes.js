const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../messages.json');

router.get('/messages', (req, res) => {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading messages');
    res.json(JSON.parse(data || '[]'));
  });
});

module.exports = router;
