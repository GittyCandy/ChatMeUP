// utils/messageStorage.js
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const filePath = path.join(__dirname, '../messages.json');

/**
 * Save a new message object to messages.json
 * msg must include: { id, room, user, userId, ciphertext, time }
 */
function saveMessage(msg) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    let messages = [];
    try {
      messages = data ? JSON.parse(data) : [];
    } catch {
      messages = [];
    }
    messages.push(msg);
    fs.writeFile(filePath, JSON.stringify(messages, null, 2), () => {});
  });
}

/**
 * Delete a message by ID
 */
function deleteMessageById(msgId, callback) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return callback(err);
    let messages = [];
    try {
      messages = data ? JSON.parse(data) : [];
    } catch {
      messages = [];
    }
    const filtered = messages.filter(m => m.id !== msgId);
    fs.writeFile(filePath, JSON.stringify(filtered, null, 2), () => {
      callback();
    });
  });
}

module.exports = { saveMessage, deleteMessageById };
