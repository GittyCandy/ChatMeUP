const { saveMessage, deleteMessage, editMessage } = require('../utils/messageStorage');
const { sanitizeInput } = require('../utils/security');

module.exports = function (io) {
  const activeUsers = new Map();
  const typingUsers = new Map();

  io.on('connection', socket => {
    console.log(`New client: ${socket.id}`);

    // Track user presence
    socket.on('setUsername', (username) => {
      const cleanUsername = sanitizeInput(username) || `anon-${Math.random().toString(36).slice(2, 6)}`;
      activeUsers.set(socket.id, cleanUsername);
      io.emit('userList', Array.from(activeUsers.values()));
    });

    socket.on('joinRoom', (room) => {
      socket.join(room);
      socket.emit('roomHistory', getRoomHistory(room));
      io.to(room).emit('userJoined', activeUsers.get(socket.id));
    });

    socket.on('leaveRoom', (room) => {
      socket.leave(room);
      io.to(room).emit('userLeft', activeUsers.get(socket.id));
    });

    socket.on('startTyping', (room) => {
      typingUsers.set(socket.id, room);
      io.to(room).emit('typing', activeUsers.get(socket.id));
    });

    socket.on('stopTyping', (room) => {
      typingUsers.delete(socket.id);
      io.to(room).emit('stoppedTyping', activeUsers.get(socket.id));
    });

    socket.on('chatMessage', ({ room, user, message, isPrivate, recipient }) => {
      const cleanMessage = sanitizeInput(message);
      const msg = {
        id: generateId(),
        room,
        user: sanitizeInput(user),
        message: cleanMessage,
        time: new Date().toISOString(),
        isPrivate,
        recipient,
        senderSocket: socket.id
      };

      if (isPrivate && recipient) {
        socket.to(recipient).emit('privateMessage', msg);
      } else {
        io.to(room).emit('message', msg);
      }
      saveMessage(msg);
    });

    socket.on('deleteMessage', ({ messageId, room }) => {
      const deleted = deleteMessage(messageId, socket.id);
      if (deleted) {
        io.to(room).emit('messageDeleted', messageId);
      }
    });

    socket.on('editMessage', ({ messageId, newContent, room }) => {
      const edited = editMessage(messageId, socket.id, sanitizeInput(newContent));
      if (edited) {
        io.to(room).emit('messageEdited', { id: messageId, content: edited.message });
      }
    });

    socket.on('disconnect', () => {
      activeUsers.delete(socket.id);
      typingUsers.delete(socket.id);
      io.emit('userList', Array.from(activeUsers.values()));
    });
  });

  function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
};