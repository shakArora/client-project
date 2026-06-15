/**
 * Mongoose connection helpers for the MongoDB database.
 * Provides a single connect call and a retry wrapper used at server startup on Railway.
 * @author Shivum Arora
 * @date 6/6/2026
 */
import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase() {
  if (!env.mongoUri) {
    throw new Error("MONGODB_URI env var is not set");
  }

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10_000, // give Atlas 10 s to respond
    socketTimeoutMS: 45_000,
  });

  return mongoose.connection;
}

/**
 * Connect with retries — used on Railway so the server binds its port first
 * (satisfying the healthcheck) and then connects to Mongo in the background.
 */
export async function connectWithRetry(maxRetries = 5, delayMs = 3_000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await connectDatabase();
      console.log("MongoDB connected ✓");
      return;
    } catch (err) {
      console.error(`MongoDB connect attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt === maxRetries) {
        console.error("All MongoDB connect attempts failed — exiting.");
        process.exit(1);
      }
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}
