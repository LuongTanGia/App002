import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "./AppError";
import HttpStatusCode from "./HttpStatusCode";
import { ErrorResponse } from "../types/common.types";

export const globalErrorHandler = (
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  // Log error for debugging
  console.error("🔥 Error:", {
    message: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
    timestamp: new Date().toISOString(),
  });

  // Handle custom AppError
  if (error instanceof AppError) {
    const errorResponse: ErrorResponse = {
      error: error.message,
      ...(error.details && { details: error.details }),
    };

    reply.status(error.statusCode).send(errorResponse);
    return;
  }

  // Handle Fastify validation errors
  if ("validation" in error && error.validation) {
    const errorResponse: ErrorResponse = {
      error: "Validation failed",
      details: JSON.stringify(error.validation),
    };

    reply.status(HttpStatusCode.BAD_REQUEST).send(errorResponse);
    return;
  }

  // Handle MongoDB duplicate key error
  if (error.name === "MongoError" && (error as any).code === 11000) {
    const field = Object.keys((error as any).keyValue || {})[0];
    const errorResponse: ErrorResponse = {
      error: `Duplicate ${field}: ${
        (error as any).keyValue?.[field]
      } already exists`,
    };

    reply.status(HttpStatusCode.CONFLICT).send(errorResponse);
    return;
  }

  // Handle MongoDB CastError (Invalid ObjectId)
  if (error.name === "CastError") {
    const errorResponse: ErrorResponse = {
      error: "Invalid ID format",
    };

    reply.status(HttpStatusCode.BAD_REQUEST).send(errorResponse);
    return;
  }

  // Handle JWT errors
  if (error.name === "JsonWebTokenError") {
    const errorResponse: ErrorResponse = {
      error: "Invalid token",
    };

    reply.status(HttpStatusCode.UNAUTHORIZED).send(errorResponse);
    return;
  }

  if (error.name === "TokenExpiredError") {
    const errorResponse: ErrorResponse = {
      error: "Token expired",
    };

    reply.status(HttpStatusCode.UNAUTHORIZED).send(errorResponse);
    return;
  }

  // Default error response
  const errorResponse: ErrorResponse = {
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error.message,
    ...(process.env.NODE_ENV !== "production" && { details: error.stack }),
  };

  reply.status(HttpStatusCode.INTERNAL_SERVER_ERROR).send(errorResponse);
};
