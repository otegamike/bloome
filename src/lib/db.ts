import "server-only";

import mongoose from "mongoose";

import { getEnv } from "@/lib/env";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var __mongooseCache: MongooseCache | undefined;
}

function getCache(): MongooseCache {
  if (!globalThis.__mongooseCache) {
    globalThis.__mongooseCache = { conn: null, promise: null };
  }
  return globalThis.__mongooseCache;
}

/**
 * Connect to MongoDB once and reuse the connection across
 * serverless invocations and dev hot-reloads. The database is always
 * "Bloome", no matter what path the connection string carries.
 */
export async function connectDB(): Promise<typeof mongoose> {
  const cache = getCache();
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    const { MONGODB_URI } = getEnv();
    cache.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false, dbName: "Bloome" });
  }
  try {
    cache.conn = await cache.promise;
  } catch (error) {
    // A failed attempt must never poison the cache: drop it so the next
    // request retries instead of failing instantly forever.
    cache.promise = null;
    throw error;
  }
  return cache.conn;
}
