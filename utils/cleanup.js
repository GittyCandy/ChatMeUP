// utils/cleanup.js
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../messages.json');
const CLEANUP_INTERVAL = 1000 * 60 * 60 * 24; // every 24h
const MESSAGE_TTL_MS = 1000 * 60 * 60 * 24 * 3; // e.g. 3 days

function scheduleCleanup() {
  setInterval(() => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) return;
      let messages = [];
      try {
        messages = JSON.parse(data || '[]');
      } catch {
        messages = [];
      }
      const now = Date.now();
      const filtered = messages.filter(msg => {
        return now - new Date(msg.time).getTime() < MESSAGE_TTL_MS;
      });
      fs.writeFile(filePath, JSON.stringify(filtered, null, 2), () => {});
    });
  }, CLEANUP_INTERVAL);
}

module.exports = { scheduleCleanup };
