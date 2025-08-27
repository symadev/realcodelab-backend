import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { Server as IOServer } from 'socket.io';
import { connectMongo, getUserCollection, saveSnapshot } from './mongo.js';
import { compileCode } from './judge0.js';

const PORT = process.env.PORT || 5000;
const app = express();

app.use(cors({ origin: (process.env.CORS_ORIGINS || '*').split(',') }));
app.use(express.json());

const server = http.createServer(app);
const io = new IOServer(server, {
  path: '/socket.io',
  cors: { origin: (process.env.CORS_ORIGINS || '*').split(',') },
});

let userCollection;

// MongoDB init
async function init() {
  try {
    await connectMongo();
    userCollection = await getUserCollection();
    console.log('MongoDB connected');

    server.listen(PORT, () => {
      console.log(`Express + Socket.IO server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Server failed to start:', err);
    process.exit(1);
  }
}

// JWT middleware
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).send({ message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(401).send({ message: 'Unauthorized' });
    req.decoded = decoded;
    next();
  });
}

// Routes
app.post('/compile', async (req, res) => {
  try {
    const data = await compileCode(req.body);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(502).json({ status: 'Internal Error', stderr: 'Compiler unavailable' });
  }
});

app.post('/rooms/:id/snapshot', async (req, res) => {
  try {
    await saveSnapshot(req.params.id, req.body.text || '');
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false });
  }
});

app.post('/jwt', (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
  res.send({ token });
});

// Auth routes
app.post('/signup', async (req, res) => {
  try {
    if (!userCollection) return res.status(500).send({ message: 'DB not connected' });
    const user = req.body;
    const existingUser = await userCollection.findOne({ email: user.email });
    if (existingUser) return res.status(400).send({ message: 'User already exists' });
    await userCollection.insertOne(user);
    const token = jwt.sign({ email: user.email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
    res.send({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Signup failed' });
  }
});

app.post('/login', async (req, res) => {
  try {
    if (!userCollection) return res.status(500).send({ message: 'DB not connected' });
    const { email, password } = req.body;
    const user = await userCollection.findOne({ email });
    if (!user || user.password !== password) return res.status(401).send({ message: 'Invalid credentials' });
    const token = jwt.sign({ email: user.email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
    res.send({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Login failed' });
  }
});

app.get('/me', verifyToken, async (req, res) => {
  try {
    if (!userCollection) return res.status(500).send({ message: 'DB not connected' });
    const user = await userCollection.findOne({ email: req.decoded.email });
    if (!user) return res.status(404).send({ message: 'User not found' });
    res.send(user);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Failed' });
  }
});

app.get('/', (_, res) => res.send('RealCodeLab backend is running'));

// Socket.IO
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('join_room', ({ room_id, name }) => {
    socket.join(room_id);
    io.to(room_id).emit('presence', { type: 'join', id: socket.id, name });
  });

  socket.on('cursor_update', ({ room_id, cursor }) => {
    socket.to(room_id).emit('cursor_update', { id: socket.id, cursor });
  });

  socket.on('disconnecting', () => {
    const rooms = Array.from(socket.rooms);
    rooms.forEach((room) => {
      if (room !== socket.id) io.to(room).emit('presence', { type: 'leave', id: socket.id });
    });
  });

  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

init();
