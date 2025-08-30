import { WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils.js';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = process.env.YJS_PORT || 6000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000", 
  "https://rhtradingglobal.com",
  "https://rhtreadingglobal.com"
];

// Create HTTP server
const server = http.createServer((req, res) => {
  // Handle CORS for HTTP requests
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      service: 'Yjs WebSocket Server',
      port: PORT,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Default response
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(`Yjs WebSocket server running on port ${PORT}\n`);
});

// Create WebSocket server
const wss = new WebSocketServer({ 
  server,
  verifyClient: (info) => {
    const origin = info.origin;
    // Allow all origins for development, restrict in production
    if (process.env.NODE_ENV === 'production') {
      return allowedOrigins.includes(origin);
    }
    return true; // Allow all in development
  }
});

// Connection counter for monitoring
let connectionCount = 0;
const rooms = new Map(); // Track active rooms

wss.on('connection', (ws, req) => {
  connectionCount++;
  console.log(`🔗 New Yjs WebSocket connection established`);
  console.log(`📊 Active connections: ${connectionCount}`);
  console.log(`🌐 Origin: ${req.headers.origin}`);
  console.log(`📡 User-Agent: ${req.headers['user-agent']?.substring(0, 50)}...`);

  // Extract room info from URL if available
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomName = url.searchParams.get('room') || 'default';
  
  // Track room
  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Set());
  }
  rooms.get(roomName).add(ws);
  
  console.log(`🏠 Client joined room: ${roomName}`);
  console.log(`👥 Room ${roomName} has ${rooms.get(roomName).size} clients`);

  // Set up Yjs WebSocket connection
  setupWSConnection(ws, req, {
    // Optional: Add custom document persistence
    // docName: roomName,
    // gc: true // Enable garbage collection
  });

  // Handle connection close
  ws.on('close', (code, reason) => {
    connectionCount--;
    console.log(` Yjs WebSocket connection closed`);
    console.log(` active connections: ${connectionCount}`);
    console.log(` Close code: ${code}, Reason: ${reason.toString()}`);
    
    // Remove from room tracking
    if (rooms.has(roomName)) {
      rooms.get(roomName).delete(ws);
      if (rooms.get(roomName).size === 0) {
        rooms.delete(roomName);
        console.log(`🗑️ Room ${roomName} is now empty and removed`);
      } else {
        console.log(` Room ${roomName} now has ${rooms.get(roomName).size} clients`);
      }
    }
  });

  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error(' Yjs WebSocket error:', error);
  });

  // Send initial connection confirmation
  if (ws.readyState === ws.OPEN) {
    // Note: Yjs handles its own protocol, so we don't send custom messages
    console.log('✅ Yjs connection setup completed');
  }
});

// WebSocket server error handling
wss.on('error', (error) => {
  console.error(' WebSocket Server error:', error);
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(' Yjs WebSocket Server Started');
  console.log(''.repeat(50));
  console.log(` Server URL: http://0.0.0.0:${PORT}`);
  console.log(` WebSocket URL: ws://0.0.0.0:${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Started at: ${new Date().toISOString()}`);
  console.log('═'.repeat(50));
});

// Graceful shutdown handling
const shutdown = () => {
  console.log('\n🛑 Shutting down Yjs WebSocket server...');
  
  // Close all WebSocket connections
  wss.clients.forEach((ws) => {
    ws.close(1001, 'Server shutting down');
  });
  
  // Close WebSocket server
  wss.close(() => {
    console.log('🔌 WebSocket server closed');
    
    // Close HTTP server
    server.close(() => {
      console.log('🌐 HTTP server closed');
      console.log('Yjs WebSocket server shut down gracefully');
      process.exit(0);
    });
  });

  // Force exit after timeout
  setTimeout(() => {
    console.log('⚠️ Forced shutdown due to timeout');
    process.exit(1);
  }, 5000);
};

// Handle process signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown();
});

// Monitoring endpoint (can be called via HTTP)
setInterval(() => {
  const stats = {
    activeConnections: connectionCount,
    activeRooms: rooms.size,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime()
  };
  
  console.log('📈 Server Stats:', {
    connections: stats.activeConnections,
    rooms: stats.activeRooms,
    memory: `${Math.round(stats.memoryUsage.heapUsed / 1024 / 1024)} MB`,
    uptime: `${Math.round(stats.uptime / 60)} minutes`
  });
}, 5 * 60 * 1000); // Every 5 minutes