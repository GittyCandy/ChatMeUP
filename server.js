// server.js
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

// serve the “public” folder
app.use(express.static(path.join(__dirname, 'public')));

// JSON body parsing for delete endpoint
app.use(express.json());

app.use('/api', chatRoutes);

chatSocket(io);
scheduleCleanup();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
