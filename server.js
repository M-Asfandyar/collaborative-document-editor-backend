const express = require('express');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const Document = require('./models/Document');
const User = require('./models/User');
const logger = require('./logger');
const client = require('prom-client');
const redisAdapter = require('socket.io-redis');
const { swaggerUi, specs } = require('./swagger');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});

io.adapter(redisAdapter({ host: 'localhost', port: 6379 }));

const port = process.env.PORT || 4000; // Allow custom port via environment variable
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  logger.info('Connected to MongoDB');
}).catch((err) => {
  logger.error('Error connecting to MongoDB:', err);
});

app.use(cors({
  origin: "http://localhost:3001",
}));

app.use(express.json());

// Prometheus metrics
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

const counter = new client.Counter({
  name: 'node_request_operations_total',
  help: 'The total number of processed requests'
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.get('/', (req, res) => {
  counter.inc();
  res.send('Server is running');
});

// Serve API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

const documentRoutes = require('./api/documents');
const authRoutes = require('./api/auth');
app.use('/api/documents', documentRoutes);
app.use('/api/auth', authRoutes);

let activeUsers = {};

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

const debouncedDocumentChange = debounce(async ({ id, content }) => {
  const document = await Document.findById(id);
  if (document) {
    document.content = content;
    await document.save();
    io.to(id).emit('documentUpdate', content);
  }
}, 300);

io.on('connection', (socket) => {
  logger.info('A user connected');

  socket.on('join', async ({ documentId, token }) => {
    socket.join(documentId);

    if (!activeUsers[documentId]) {
      activeUsers[documentId] = [];
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('username');

      if (user) {
        activeUsers[documentId].push({ id: socket.id, username: user.username });
        io.to(documentId).emit('activeUsers', activeUsers[documentId]);
        logger.info(`User ${user.username} joined document: ${documentId}`);
      }
    } catch (err) {
      logger.error('Error decoding token or finding user:', err);
    }
  });

  socket.on('leave', (documentId) => {
    socket.leave(documentId);
    if (activeUsers[documentId]) {
      activeUsers[documentId] = activeUsers[documentId].filter(user => user.id !== socket.id);
      io.to(documentId).emit('activeUsers', activeUsers[documentId]);
    }
    logger.info(`User left document: ${documentId}`);
  });

  socket.on('documentChange', debouncedDocumentChange);

  socket.on('disconnect', () => {
    logger.info('User disconnected');
    for (const documentId in activeUsers) {
      if (activeUsers[documentId].some(user => user.id === socket.id)) {
        activeUsers[documentId] = activeUsers[documentId].filter(user => user.id !== socket.id);
        io.to(documentId).emit('activeUsers', activeUsers[documentId]);
      }
    }
  });
});

server.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});

module.exports = { app, server }; // Export the app and server for testing purposes
