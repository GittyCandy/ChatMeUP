const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../messages.json');
const CLEANUP_INTERVAL = 1000 * 60 * 60 * 24; // 1 day

function scheduleCleanup() {
  setInterval(() => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) return;
      const messages = JSON.parse(data || '[]');
      const now = new Date();
      const filtered = messages.filter(msg => {
        return now - new Date(msg.time) < CLEANUP_INTERVAL * 2;
      });
      fs.writeFile(filePath, JSON.stringify(filtered, null, 2), () => {});
    });
  }, CLEANUP_INTERVAL);
}

module.exports = { scheduleCleanup };
