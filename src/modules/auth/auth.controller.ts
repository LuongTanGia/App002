import { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import User from "./user.model";
import HttpStatusCode from "../../errors/HttpStatusCode";
import { ErrorResponse } from "../../types/common.types";
import {
  RegisterUserBody,
  LoginUserBody,
  AuthResponse,
  UserPayload,
} from "./auth.types";
import { SecurityUtils } from "../../utils/security.utils";
import {
  ValidationError,
  ConflictError,
  UnauthorizedError,
} from "../../errors/AppError";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

/**
 * Register a new user with enhanced security
 */
export const registerUser = async (
  req: FastifyRequest<{ Body: RegisterUserBody }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    // Sanitize inputs
    const sanitizedUsername = SecurityUtils.sanitizeInput(
      username?.trim() || ""
    );
    const sanitizedEmail = SecurityUtils.sanitizeInput(email?.trim() || "");

    // Input validation
    if (!sanitizedUsername) {
      throw new ValidationError("Username is required");
    }

    if (!sanitizedEmail) {
      throw new ValidationError("Email is required");
    }

    if (!password?.trim()) {
      throw new ValidationError("Password is required");
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      throw new ValidationError("Invalid email format");
    }

    // Enhanced password validation using SecurityUtils
    try {
      SecurityUtils.validatePassword(password);
    } catch (error) {
      throw new ValidationError(
        error instanceof Error ? error.message : "Password validation failed"
      );
    }

    // Check if user already exists
    const userExists = await User.findOne({
      $or: [
        { email: sanitizedEmail.toLowerCase() },
        { username: sanitizedUsername },
      ],
    });

    if (userExists) {
      const field =
        userExists.email === sanitizedEmail.toLowerCase()
          ? "email"
          : "username";
      throw new ConflictError(`User with this ${field} already exists`);
    }

    // Hash password using SecurityUtils
    const hashedPassword = await SecurityUtils.hashPassword(password);

    const user = new User({
      username: sanitizedUsername,
      email: sanitizedEmail.toLowerCase(),
      password: hashedPassword,
    });

    await user.save();

    reply
      .status(HttpStatusCode.INSERT_OK)
      .send({ message: "User registered successfully" } as AuthResponse);
  } catch (error) {
    reply.status(HttpStatusCode.INTERNAL_SERVER_ERROR).send({
      error: "Failed to register user",
      details:
        error instanceof Error ? error.message : "Unknown error occurred",
    } as ErrorResponse);
  }
};

/**
 * User login with enhanced security
 */
export const loginUser = async (
  req: FastifyRequest<{ Body: LoginUserBody }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Sanitize inputs
    const sanitizedEmail = SecurityUtils.sanitizeInput(email?.trim() || "");

    // Input validation
    if (!sanitizedEmail) {
      throw new ValidationError("Email is required");
    }

    if (!password?.trim()) {
      throw new ValidationError("Password is required");
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      throw new ValidationError("Invalid email format");
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const isMatch = await (user as any).comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const tokenPayload: UserPayload = {
      userId: user._id.toString(),
      userName: user.username,
    };

    // Use SecurityUtils for token generation
    const token = SecurityUtils.generateToken(tokenPayload);

    reply.status(HttpStatusCode.OK).send({
      message: "Login successful",
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: (user as any).role || "user",
      },
    } as AuthResponse);
  } catch (error) {
    reply.status(HttpStatusCode.INTERNAL_SERVER_ERROR).send({
      error: "Failed to login",
      details:
        error instanceof Error ? error.message : "Unknown error occurred",
    } as ErrorResponse);
  }
};
