// src/libs/dbConfig.ts
import mongoose from "mongoose";

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: CachedConnection | undefined;
}

const globalWithCache = global as typeof globalThis & {
  mongooseCache: CachedConnection;
};

if (!globalWithCache.mongooseCache) {
  globalWithCache.mongooseCache = {
    conn: null,
    promise: null,
  };
}

// Helper function to get MongoDB URI - checked at runtime, not build time
function getMongoDBUri(): string {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    // During build time, Netlify might analyze routes without env vars
    // Throw a more descriptive error that won't fail the build
    if (process.env.NODE_ENV === "production" && !process.env.VERCEL && !process.env.NETLIFY) {
      // Only throw in production if we're actually trying to connect
      throw new Error(
        "Please define the MONGODB_URI environment variable inside .env"
      );
    }
    // For build time, use a placeholder that will fail gracefully at runtime
    throw new Error(
      "MONGODB_URI environment variable is not defined. Please configure it in your deployment environment."
    );
  }
  // Ensure we're connecting to the correct database
  return MONGODB_URI.replace(/\/$/, "") + "/your_default_db_name";
}

// Helper function to get connection options
function getConnectionOptions(): mongoose.ConnectOptions {
  return {
    bufferCommands: true,
    autoIndex: true,
    maxPoolSize: 50,
    minPoolSize: 10,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    family: 4,
    retryWrites: true,
    connectTimeoutMS: 30000,
    dbName: "your_default_db_name", // Explicitly set the database name
  };
}

let listenersSet = false;

function isConnectionUsable(): boolean {
  return (
    mongoose.connection.readyState === 1 && mongoose.connection.db !== undefined
  );
}

// Function to ensure models are registered
function ensureModelsRegistered() {
  // Import and register all models here
  // This ensures they're available before any queries
  try {
    import("@/models/User");
    import("@/models/Activity");
    import("@/models/Lead");
  } catch (error) {
    console.error("Error registering models:", error);
  }
}

export const connectMongoDB = async (): Promise<typeof mongoose> => {
  try {
    // Check for MONGODB_URI at runtime (not build time)
    const MONGODB_URI_WITH_DB = getMongoDBUri();
    const options = getConnectionOptions();

    // NEW: Ensure models are registered BEFORE connecting
    ensureModelsRegistered();

    if (isConnectionUsable()) {
      return mongoose;
    }

    if (globalWithCache.mongooseCache.promise) {
      return await globalWithCache.mongooseCache.promise;
    }

    if (!listenersSet) {
      mongoose.connection.on("connected", () => {
        console.log("MongoDB connection established");
      });

      mongoose.connection.on("error", (err) => {
        console.error("MongoDB connection error:", err);
        globalWithCache.mongooseCache.conn = null;
        globalWithCache.mongooseCache.promise = null;
      });

      mongoose.connection.on("disconnected", () => {
        console.log("MongoDB disconnected");
        globalWithCache.mongooseCache.conn = null;
        globalWithCache.mongooseCache.promise = null;
      });

      process.on("SIGTERM", () => handleShutdown("SIGTERM"));
      process.on("SIGINT", () => handleShutdown("SIGINT"));

      listenersSet = true;
    }

    globalWithCache.mongooseCache.promise = mongoose
      .connect(MONGODB_URI_WITH_DB, options)
      .then((mongooseInstance) => {
        console.log("MongoDB connected successfully to your_default_db_name");
        globalWithCache.mongooseCache.conn = mongooseInstance;
        return mongooseInstance;
      })
      .catch(async (error) => {
        console.error("Initial connection error:", error);
        globalWithCache.mongooseCache.promise = null;
        throw error;
      });

    return await globalWithCache.mongooseCache.promise;
  } catch (error) {
    globalWithCache.mongooseCache.conn = null;
    globalWithCache.mongooseCache.promise = null;
    throw new Error(getErrorMessage(error));
  }
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.message.includes("ETIMEOUT")) {
      return "Database connection timed out. Please check your network connection and try again.";
    }
    if (error.message.includes("Authentication failed")) {
      return "Database authentication failed. Please check your credentials.";
    }
    if (error.message.includes("ECONNREFUSED")) {
      return "Could not connect to database. Please check if the database server is running.";
    }
    return error.message;
  }
  return "An unexpected error occurred while connecting to the database.";
};

const handleShutdown = async (signal: string): Promise<void> => {
  try {
    await disconnectMongoDB();
    console.log(`MongoDB connection closed through ${signal}`);
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
};

export const disconnectMongoDB = async (): Promise<void> => {
  if (mongoose.connection.readyState === 0) return;
  try {
    await mongoose.connection.close();
    globalWithCache.mongooseCache.conn = null;
    globalWithCache.mongooseCache.promise = null;
    console.log("MongoDB disconnected successfully");
  } catch (error) {
    console.error("Error disconnecting from MongoDB:", error);
    throw error;
  }
};

export type DatabaseOperation<T> = () => Promise<T>;

export const withDatabase = async <T>(
  operation: DatabaseOperation<T>,
  retries = 3
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await connectMongoDB();
      return await operation();
    } catch (err) {
      lastError = err;
      console.error(
        `Database operation error (attempt ${attempt}/${retries}):`,
        err
      );

      if (attempt === retries) break;

      const backoffTime = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise((resolve) => setTimeout(resolve, backoffTime));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unknown database error");
};

export const executeDbOperation = async <T>(
  operation: () => Promise<T>,
  errorMessage = "Database operation failed"
): Promise<T> => {
  try {
    await connectMongoDB();
    return await operation();
  } catch (error) {
    console.error(errorMessage, error);
    throw new Error(errorMessage);
  }
};

export { mongoose };
