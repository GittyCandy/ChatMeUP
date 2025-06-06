const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '../messages.json');

function saveMessage(msg) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    const messages = data ? JSON.parse(data) : [];
    messages.push(msg);
    fs.writeFile(filePath, JSON.stringify(messages, null, 2), () => {});
  });
}

module.exports = { saveMessage };
