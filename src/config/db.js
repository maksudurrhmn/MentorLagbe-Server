import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('MONGODB_URI is missing from envirment variables');
}

const client = new MongoClient(uri);

let db;

export const connectDB = async () => {
  try {
    await client.connect();

    db = client.db(process.env.DB_NAME);

    console.log('MongoDB connected successfully');

    return db;
  } catch (error) {
    console.error('MongoDB connection failed', error.message);
    throw error;
  }
};

export const getDb = () => {
  if (!db) {
    throw new Error('Database is not connected yet');
  }
  return db;
};
