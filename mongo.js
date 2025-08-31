import dotenv from "dotenv";
dotenv.config()

import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI; // use full URI directly
const client = new MongoClient(uri);

let db;

export async function connectMongo() {
  if (!db) {
    await client.connect();
    db = client.db("RealCodeLab"); // make sure this matches your database name in Atlas
    console.log("Connected to MongoDB");
  }
  return db;
}

export async function saveSnapshot(roomId, text) {
  if (!db) await connectMongo();
  const collection = db.collection("snapshots");
  return collection.updateOne(
    { roomId },
    { $set: { text, updatedAt: new Date() } },
    { upsert: true }
  );
}

export async function getUserCollection() {
  if (!db) await connectMongo();
  return db.collection("user");
}

