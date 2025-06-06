const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '../messages.json');

function getMessages() {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    return [];
  }
}

function saveMessage(msg) {
  const messages = getMessages();
  messages.push(msg);
  fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));
}

function deleteMessage(messageId, socketId) {
  const messages = getMessages();
  const index = messages.findIndex(m => m.id === messageId && m.senderSocket === socketId);
  if (index !== -1) {
    messages.splice(index, 1);
    fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));
    return true;
  }
  return false;
}

function editMessage(messageId, socketId, newContent) {
  const messages = getMessages();
  const message = messages.find(m => m.id === messageId && m.senderSocket === socketId);
  if (message) {
    message.message = newContent;
    message.edited = true;
    message.editTime = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));
    return message;
  }
  return null;
}

function getRoomHistory(room) {
  const messages = getMessages();
  return messages.filter(msg => msg.room === room && !msg.isPrivate);
}

module.exports = {
  saveMessage,
  deleteMessage,
  editMessage,
  getRoomHistory
};