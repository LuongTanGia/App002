import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import connect from "./database/db";
import { print, OutputType } from "./helpers/print";

const start = async () => {
  try {
    const PORT = process.env.PORT || 3000;
    await connect();
    await app.listen({ port: +PORT, host: "0.0.0.0" });
    print(
      `🚀 Server is running at http://localhost:${PORT}`,
      OutputType.SUCCESS
    );
  } catch (err) {
    print(`❌ Server startup error: ${err}`, OutputType.ERROR);
    process.exit(1);
  }
};

start();
