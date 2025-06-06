const { saveMessage, deleteMessage, editMessage } = require('../utils/messageStorage');
const { sanitizeInput } = require('../utils/security');
const { encryptMessage } = require('../utils/crypto');

module.exports = function (io, ENCRYPTION_KEY) {
  const activeUsers = new Map();
  const typingUsers = new Map();
  const userRooms = new Map();

  io.on('connection', socket => {
    console.log(`New client: ${socket.id}`);

    // Send encryption key to the client
    socket.emit('encryptionKey', ENCRYPTION_KEY);

    socket.on('setUsername', (username) => {
      const cleanUsername = sanitizeInput(username) || `anon-${Math.random().toString(36).slice(2, 6)}`;
      activeUsers.set(socket.id, cleanUsername);
      updateUserList();
    });

    socket.on('joinRoom', (room) => {
      // Leave previous room if any
      if (userRooms.has(socket.id)) {
        const prevRoom = userRooms.get(socket.id);
        socket.leave(prevRoom);
        io.to(prevRoom).emit('userLeft', activeUsers.get(socket.id));
      }

      socket.join(room);
      userRooms.set(socket.id, room);
      io.to(room).emit('userJoined', activeUsers.get(socket.id));
      updateUserList(room);

      // Send room history
      socket.emit('roomHistory', getRoomHistory(room));
    });

    socket.on('chatMessage', ({ room, encryptedMessage }) => {
      const user = activeUsers.get(socket.id);
      const msg = {
        id: generateId(),
        room,
        user,
        encryptedMessage,
        time: new Date().toISOString(),
        senderSocket: socket.id
      };

      io.to(room).emit('message', msg);
      saveMessage(msg);
    });

      if (isPrivate && recipient) {
        socket.to(recipient).emit('privateMessage', msg);
      } else {
        io.to(room).emit('message', msg);
      }
      saveMessage(msg);
    });


function updateUserList(room) {
    const usersInRoom = {};

    // Get all sockets in each room
    if (room) {
      const socketsInRoom = io.sockets.adapter.rooms.get(room) || new Set();
      socketsInRoom.forEach(socketId => {
        usersInRoom[socketId] = activeUsers.get(socketId);
      });
      io.to(room).emit('userList', Object.values(usersInRoom));
    } else {
      io.emit('userList', Array.from(activeUsers.values()));
    }
  }

};




