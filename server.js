const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const chatSocket = require('./sockets/chatSocket');
const chatRoutes = require('./routes/chatRoutes');
const { scheduleCleanup } = require('./utils/cleanup');
const { generateEncryptionKey } = require('./utils/crypto');

const app = express();
const server = http.createServer(app);

// Generate encryption key for the session
const ENCRYPTION_KEY = generateEncryptionKey();

// Security middleware
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingInterval: 25000,
  pingTimeout: 60000
});

// Share encryption key with clients through a secure endpoint
app.get('/api/encryption-key', (req, res) => {
  res.json({ key: ENCRYPTION_KEY });
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', chatRoutes);

chatSocket(io, ENCRYPTION_KEY);
scheduleCleanup();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));