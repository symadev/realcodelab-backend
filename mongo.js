import { MongoClient } from "mongodb";

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cn4mz.mongodb.net/RealCodeLab?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

let db;

export async function connectMongo() {
  if (!db) {
    await client.connect();
    db = client.db("RealCodeLab");
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


// New helper function to get user collection
export async function getUserCollection() {
  if (!db) await connectMongo();
  return db.collection("user");
}
