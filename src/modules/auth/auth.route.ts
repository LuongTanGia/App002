// src/modules/auth/auth.route.ts
import { FastifyInstance } from "fastify";
import { registerUser, loginUser } from "./auth.controller";

const authRoutes = async (app: FastifyInstance) => {
  app.post("/register", registerUser);
  app.post("/login", loginUser);
};

export default authRoutes;
