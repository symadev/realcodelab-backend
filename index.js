import { setupWSConnection } from 'y-websocket/bin/utils.js';
import { WebSocketServer } from 'ws';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as IOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { connectMongo, getUserCollection, saveSnapshot } from './mongo.js';
import { compileCode, getSubmission } from "./judge0.js";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
 
  "https://rhtradingglobal.com",
  "https://rhtreadingglobal.com"
];

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
    return callback(new Error(msg), false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Handle preflight requests
app.options("*", cors());

app.use(express.json());

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Socket.IO server
const io = new IOServer(server, {
  path: '/socket.io',
  cors: {
    origin: allowedOrigins,
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Yjs WebSocket server
const wss = new WebSocketServer({ 
  server, 
  path: '/yjs',
  verifyClient: (info) => {
    // Allow all origins for Yjs WebSocket
    return true;
  }
});

wss.on('connection', (ws, req) => {
  console.log('Yjs WebSocket connection established');
  setupWSConnection(ws, req);
});

let userCollection;

async function init() {
  try {
    await connectMongo();
    userCollection = await getUserCollection();
    console.log('MongoDB connected successfully');

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`HTTP server: http://0.0.0.0:${PORT}`);
      console.log(`Socket.IO: http://0.0.0.0:${PORT}/socket.io`);
      console.log(`Yjs WebSocket: ws://0.0.0.0:${PORT}/yjs`);
    });
  } catch (err) {
    console.error('Server failed to start:', err);
    process.exit(1);
  }
}

// JWT middleware
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token missing' });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.decoded = decoded;
    next();
  });
}

// Health check route
app.get('/', (req, res) => {
  res.json({ 
    message: 'RealCodeLab backend is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      compile: '/compile',
      auth: {
        signup: '/signup',
        login: '/login',
        profile: '/me'
      },
      websocket: {
        socketio: '/socket.io',
        yjs: '/yjs'
      }
    }
  });
});

// Compile routes
app.post("/compile", async (req, res) => {
  try {
    const { language_id, source_code, stdin } = req.body;
    
    if (!language_id || !source_code) {
      return res.status(400).json({ 
        error: 'Missing required fields: language_id and source_code' 
      });
    }

    const result = await compileCode({ language_id, source_code, stdin });
    res.json(result);
  } catch (err) {
    console.error('Compile error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/submissions/:token", async (req, res) => {
  try {
    const result = await getSubmission(req.params.token);
    res.json(result);
  } catch (err) {
    console.error('Submission error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Snapshot route
app.post('/rooms/:id/snapshot', async (req, res) => {
  try {
    const roomId = req.params.id;
    const text = req.body.text || '';
    
    await saveSnapshot(roomId, text);
    res.json({ success: true, message: 'Snapshot saved' });
  } catch (error) {
    console.error('Snapshot save error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Auth routes
app.post('/signup', async (req, res) => {
  try {
    if (!userCollection) {
      return res.status(500).json({ message: 'Database not connected' });
    }

    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const existingUser = await userCollection.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const user = { name, email, password };
    await userCollection.insertOne(user);
    
    const token = jwt.sign(
      { email: user.email }, 
      process.env.ACCESS_TOKEN_SECRET, 
      { expiresIn: '24h' }
    );

    res.status(201).json({ 
      token, 
      user: { name: user.name, email: user.email } 
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Signup failed' });
  }
});

app.post('/login', async (req, res) => {
  try {
    if (!userCollection) {
      return res.status(500).json({ message: 'Database not connected' });
    }

    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const user = await userCollection.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { email: user.email }, 
      process.env.ACCESS_TOKEN_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({ 
      token, 
      user: { name: user.name, email: user.email } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

app.get('/me', verifyToken, async (req, res) => {
  try {
    if (!userCollection) {
      return res.status(500).json({ message: 'Database not connected' });
    }

    const user = await userCollection.findOne({ email: req.decoded.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ name: user.name, email: user.email });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Socket.IO client connected:', socket.id);

  socket.on('join_room', ({ room_id, name }) => {
    socket.join(room_id);
    console.log(`User ${name} joined room ${room_id}`);
    
    // Broadcast to others in the room
    socket.to(room_id).emit('presence', { 
      type: 'join', 
      id: socket.id, 
      name 
    });
    
    // Send acknowledgment back to sender
    socket.emit('room_joined', { room_id, message: 'Successfully joined room' });
  });

  socket.on('cursor_update', ({ room_id, cursor }) => {
    socket.to(room_id).emit('cursor_update', { 
      id: socket.id, 
      cursor 
    });
  });

  socket.on('leave_room', ({ room_id }) => {
    socket.leave(room_id);
    socket.to(room_id).emit('presence', { 
      type: 'leave', 
      id: socket.id 
    });
  });

  socket.on('disconnecting', () => {
    const rooms = Array.from(socket.rooms);
    rooms.forEach((room) => {
      if (room !== socket.id) {
        socket.to(room).emit('presence', { 
          type: 'leave', 
          id: socket.id 
        });
      }
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket.IO client disconnected:', socket.id, reason);
  });

  socket.on('error', (error) => {
    console.error('Socket.IO error:', error);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Initialize server
init();