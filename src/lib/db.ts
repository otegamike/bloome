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
 * serverless invocations and dev hot-reloads.
 */
export async function connectDB(): Promise<typeof mongoose> {
  const cache = getCache();
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    const { MONGODB_URI } = getEnv();
    cache.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
