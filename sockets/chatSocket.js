const { saveMessage } = require('../utils/messageStorage');

module.exports = function (io) {
  io.on('connection', socket => {
    console.log(`New client: ${socket.id}`);

    socket.on('joinRoom', room => {
      socket.join(room);
    });

    socket.on('chatMessage', ({ room, user, message }) => {
      const msg = { room, user, message, time: new Date().toISOString() };
      io.to(room).emit('message', msg);
      saveMessage(msg);
    });
  });
};
