// src/modules/auth/auth.controller.ts
import { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import User from "./user.model";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret"; // Thêm secret key trong .env

// Đăng ký người dùng mới
export const registerUser = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  const { username, email, password } = req.body as {
    username: string;
    email: string;
    password: string;
  };

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return reply.status(400).send({ error: "Email is already in use" });
    }

    const user = new User({ username, email, password });
    await user.save();

    return reply.status(201).send({ message: "User registered successfully" });
  } catch (error) {
    return reply.status(500).send({
      error: "Error registering user",
      details: (error as Error).message,
    });
  }
};

// Đăng nhập và tạo JWT token
export const loginUser = async (req: FastifyRequest, reply: FastifyReply) => {
  const { email, password } = req.body as { email: string; password: string };

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return reply.status(400).send({ error: "Invalid credentials" });
    }

    const isMatch = await (user as any).comparePassword(password);
    if (!isMatch) {
      return reply.status(400).send({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, userName: user.username },
      JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    return reply.status(200).send({ message: "Login successful", token });
  } catch (error) {
    return reply
      .status(500)
      .send({ error: "Error logging in", details: (error as Error).message });
  }
};
