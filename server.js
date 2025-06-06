const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const chatSocket = require('./sockets/chatSocket');
const chatRoutes = require('./routes/chatRoutes');
const { scheduleCleanup } = require('./utils/cleanup');

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingInterval: 25000,
  pingTimeout: 60000
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', chatRoutes);

// Initialize socket and cleanup
chatSocket(io);
scheduleCleanup();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));