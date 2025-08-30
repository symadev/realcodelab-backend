import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let client;
let db;
let userCollection;

export async function connectMongo() {
  try {
    const uri = process.env.MONGO_URI;
    
    if (!uri) {
      throw new Error('MONGO_URI environment variable is not defined');
    }

    console.log('Connecting to MongoDB...');
    
    client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      heartbeatFrequencyMS: 10000, // Send a ping to check server every 10 seconds
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
    });

    await client.connect();
    
    // Test the connection
    await client.db().admin().ping();
    console.log('MongoDB connected successfully!');

    db = client.db('RealCodeLab');
    userCollection = db.collection('users');
    
    // Create indexes for better performance
    await userCollection.createIndex({ email: 1 }, { unique: true });
    
    return db;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    throw error;
  }
}

export function getUserCollection() {
  if (!userCollection) {
    throw new Error('Database not initialized. Call connectMongo() first.');
  }
  return userCollection;
}

export async function saveSnapshot(roomId, content) {
  try {
    if (!db) {
      throw new Error('Database not connected');
    }

    const snapshotsCollection = db.collection('snapshots');
    
    const snapshot = {
      roomId,
      content,
      timestamp: new Date(),
      version: Date.now()
    };

    // Upsert snapshot (update if exists, create if not)
    const result = await snapshotsCollection.replaceOne(
      { roomId },
      snapshot,
      { upsert: true }
    );

    console.log(`Snapshot saved for room ${roomId}:`, result);
    return result;
  } catch (error) {
    console.error('Error saving snapshot:', error);
    throw error;
  }
}

export async function getSnapshot(roomId) {
  try {
    if (!db) {
      throw new Error('Database not connected');
    }

    const snapshotsCollection = db.collection('snapshots');
    const snapshot = await snapshotsCollection.findOne({ roomId });
    
    return snapshot ? snapshot.content : '';
  } catch (error) {
    console.error('Error getting snapshot:', error);
    throw error;
  }
}

export async function listRooms() {
  try {
    if (!db) {
      throw new Error('Database not connected');
    }

    const snapshotsCollection = db.collection('snapshots');
    const rooms = await snapshotsCollection.find({}, { 
      projection: { roomId: 1, timestamp: 1 } 
    }).sort({ timestamp: -1 }).toArray();
    
    return rooms;
  } catch (error) {
    console.error('Error listing rooms:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closeMongo() {
  try {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await closeMongo();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeMongo();
  process.exit(0);
});