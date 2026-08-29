
import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI || process.env.MONGO_URI.includes('<username>')) {
      console.warn('Warning: MONGO_URI in .env contains placeholder values or is not set. Running with fallback data.');
      return;
    }
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`Warning: Could not connect to MongoDB (${error.message}). Running with fallback data.`);
  }
};
