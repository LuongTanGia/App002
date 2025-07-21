import mongoose from "mongoose";
import { OutputType, print } from "../helpers/print";
import { DatabaseError } from "../errors/AppError";

mongoose.set("strictQuery", true);

// Enhanced MongoDB connection configuration
const getMongoConfig = (): mongoose.ConnectOptions => ({
  maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || "10"),
  minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE || "5"),
  maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME_MS || "30000"),
  serverSelectionTimeoutMS: parseInt(
    process.env.DB_SERVER_SELECTION_TIMEOUT_MS || "5000"
  ),
  socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT_MS || "45000"),
  bufferCommands: false, // Disable mongoose buffering
  heartbeatFrequencyMS: 10000,
});

const connect = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new DatabaseError(
        "MongoDB URI is not provided in environment variables"
      );
    }

    const connection = await mongoose.connect(mongoUri, getMongoConfig());

    print("Connected to MongoDB successfully", OutputType.SUCCESS);
    print(
      `Connection pool: ${getMongoConfig().maxPoolSize} max, ${
        getMongoConfig().minPoolSize
      } min`,
      OutputType.SUCCESS
    );

    // Handle connection events
    mongoose.connection.on("error", (error) => {
      print(`MongoDB connection error: ${error.message}`, OutputType.ERROR);
    });

    mongoose.connection.on("disconnected", () => {
      print("MongoDB disconnected", OutputType.WARNING);
    });

    mongoose.connection.on("reconnected", () => {
      print("MongoDB reconnected", OutputType.SUCCESS);
    });

    return connection;
  } catch (error: any) {
    const { code, name } = error;

    // Handle specific MongoDB errors
    if (code === 8000 || name === "MongoAuthError") {
      throw new DatabaseError("Invalid database credentials");
    } else if (code === "ENOTFOUND" || name === "MongoNetworkError") {
      throw new DatabaseError(
        "Cannot connect to MongoDB server - check connection string"
      );
    } else if (name === "MongoTimeoutError") {
      throw new DatabaseError("MongoDB connection timeout");
    } else if (name === "MongoServerSelectionError") {
      throw new DatabaseError(
        "Cannot select MongoDB server - check if MongoDB is running"
      );
    }

    // Generic database error
    throw new DatabaseError(`Database connection failed: ${error.message}`);
  }
};

export default connect;
