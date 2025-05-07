import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import connect from "./database/db";

const start = async () => {
  try {
    const PORT = process.env.PORT || 3000;
    await connect();
    await app.listen({ port: +PORT, host: "0.0.0.0" });
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
  } catch (err) {
    console.error("❌ Server startup error:", err);
    process.exit(1);
  }
};

start();
