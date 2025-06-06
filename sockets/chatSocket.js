// sockets/chatSocket.js
const { saveMessage, deleteMessageById } = require('../utils/messageStorage');

module.exports = function (io) {
  io.on('connection', socket => {
    console.log(`New client connected: ${socket.id}`);

    // When a client explicitly “joins” a room
    socket.on('joinRoom', room => {
      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room}`);
    });

    // When a client sends a new chat message
    socket.on('chatMessage', msg => {
      // msg should already contain: { id, room, user, userId, ciphertext, time }
      // Simply broadcast back to everyone in that room
      io.to(msg.room).emit('newMessage', msg);
      // Save to disk
      saveMessage(msg);
    });

    // When a client deletes a message
    socket.on('deleteMessage', msgId => {
      // Remove from JSON storage
      deleteMessageById(msgId, () => {
        // Broadcast to all clients: remove this msgId
        io.emit('messageDeleted', msgId);
      });
    });
  });
};
