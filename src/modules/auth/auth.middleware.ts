import { FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user?: any;
    routerPath?: string;
  }
}
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

export const verifyToken = async (req: FastifyRequest, reply: FastifyReply) => {
  const excludedPaths = ["/api/auth/login", "/api/auth/register", "/docs"];
  if (excludedPaths.includes(req.routerPath || req.raw.url || "")) {
    return;
  }

  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return reply.status(403).send({ error: "Token is required" });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    console.log("🚀 ~ decoded:", decoded);

    return;
  } catch (error) {
    return reply.status(401).send({ error: "Invalid or expired token" });
  }
};
