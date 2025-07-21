import { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import HttpStatusCode from "../../errors/HttpStatusCode";
import { ErrorResponse } from "../../types/common.types";
import { UserPayload } from "./auth.types";
import { SecurityUtils } from "../../utils/security.utils";
import { AppError, UnauthorizedError } from "../../errors/AppError";
import { OutputType, print } from "../../helpers/print";

/**
 * Verify JWT token middleware with enhanced security
 */
export const verifyToken = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const excludedPaths = ["/api/auth/login", "/api/auth/register", "/docs"];
  const requestPath = req.routerPath || req.raw.url || "";

  // Skip authentication for excluded paths
  if (excludedPaths.some((path) => requestPath.startsWith(path))) {
    return;
  }

  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    reply
      .status(HttpStatusCode.UNAUTHORIZED)
      .send({ error: "Authentication token is required" } as ErrorResponse);
    return;
  }

  try {
    // Use SecurityUtils for enhanced token verification
    const payload = SecurityUtils.verifyToken(token);

    if (!payload || !payload.userId) {
      throw new UnauthorizedError("Invalid or expired token");
    }

    req.user = {
      userId: payload.userId,
      userName: payload.userName || payload.email,
      email: payload.email,
      role: payload.role || "user",
    };

    // Optional: Log successful authentication in development
    if (process.env.NODE_ENV === "development") {
      print(
        `🔐 Authenticated user: ${req.user.userName} (${req.user.userId})`,
        OutputType.SUCCESS
      );
    }
  } catch (error) {
    let errorMessage = "Invalid or expired token";

    if (error instanceof jwt.TokenExpiredError) {
      errorMessage = "Token has expired";
    } else if (error instanceof jwt.JsonWebTokenError) {
      errorMessage = "Invalid token format";
    } else if (error instanceof AppError) {
      errorMessage = error.message;
    }

    reply.status(HttpStatusCode.UNAUTHORIZED).send({
      error: errorMessage,
      details: error instanceof Error ? error.message : "Unknown error",
    } as ErrorResponse);
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (roles: string[]) => {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = req.user;

    if (!user) {
      reply
        .status(HttpStatusCode.UNAUTHORIZED)
        .send({ error: "Authentication required" } as ErrorResponse);
      return;
    }

    if (!roles.includes(user.role || "user")) {
      reply.status(HttpStatusCode.FORBIDDEN).send({
        error: "Insufficient permissions",
        message: `Required roles: ${roles.join(", ")}`,
      } as ErrorResponse);
      return;
    }
  };
};

// Admin-only middleware
export const requireAdmin = requireRole(["admin"]);

// User or admin middleware
export const requireUserOrAdmin = requireRole(["user", "admin"]);

/**
 * Input sanitization middleware
 */
export const sanitizeInput = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  // Helper function to recursively sanitize object properties
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === "string") {
      return SecurityUtils.sanitizeInput(obj);
    }

    if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize the key as well
        const sanitizedKey = SecurityUtils.sanitizeInput(String(key));
        sanitized[sanitizedKey] = sanitizeObject(value);
      }
      return sanitized;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => sanitizeObject(item));
    }

    // Return primitive values as-is (numbers, booleans, null, undefined)
    return obj;
  };

  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === "object") {
    req.query = sanitizeObject(req.query);
  }
};
