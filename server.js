const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const chatSocket = require('./sockets/chatSocket');
const chatRoutes = require('./routes/chatRoutes');
const { scheduleCleanup } = require('./utils/cleanup');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', chatRoutes);

chatSocket(io);
scheduleCleanup();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
