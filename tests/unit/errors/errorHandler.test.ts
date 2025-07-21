import { globalErrorHandler } from "../../../src/errors/errorHandler";
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
} from "../../../src/errors/AppError";
import HttpStatusCode from "../../../src/errors/HttpStatusCode";
import { MockUtils } from "../../utils/mockUtils";

describe("Global Error Handler", () => {
  let mockRequest: any;
  let mockReply: any;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    mockRequest = MockUtils.createMockRequest();
    mockRequest.url = "/api/test";
    mockRequest.method = "POST";

    mockReply = MockUtils.createMockReply();

    // Spy on console.error to verify error logging
    consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("AppError handling", () => {
    it("should handle ValidationError correctly", () => {
      const error = new ValidationError("Invalid input data", {
        field: "email",
      });

      globalErrorHandler(error, mockRequest, mockReply);

      expect(consoleSpy).toHaveBeenCalledWith(
        "🔥 Error:",
        expect.objectContaining({
          message: "Invalid input data",
          url: "/api/test",
          method: "POST",
          timestamp: expect.any(String),
        })
      );

      expect(mockReply.status).toHaveBeenCalledWith(HttpStatusCode.BAD_REQUEST);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "Invalid input data",
        details: { field: "email" },
      });
    });

    it("should handle NotFoundError correctly", () => {
      const error = new NotFoundError("Resource not found");

      globalErrorHandler(error, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(HttpStatusCode.NOT_FOUND);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "Resource not found",
      });
    });

    it("should handle UnauthorizedError correctly", () => {
      const error = new UnauthorizedError("Access denied");

      globalErrorHandler(error, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(
        HttpStatusCode.UNAUTHORIZED
      );
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "Access denied",
      });
    });

    it("should handle AppError without details", () => {
      const error = new AppError("Custom error", HttpStatusCode.CONFLICT);

      globalErrorHandler(error, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(HttpStatusCode.CONFLICT);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "Custom error",
      });
    });
  });

  describe("Fastify validation errors", () => {
    it("should handle Fastify validation errors", () => {
      const error = {
        message: "Validation failed",
        validation: [
          { keyword: "required", dataPath: ".email", message: "is required" },
          {
            keyword: "format",
            dataPath: ".password",
            message: "invalid format",
          },
        ],
      } as any;

      globalErrorHandler(error, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(HttpStatusCode.BAD_REQUEST);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "Validation failed",
        details: JSON.stringify(error.validation),
      });
    });
  });

  describe("MongoDB errors", () => {
    it("should handle MongoDB duplicate key error", () => {
      const error = {
        name: "MongoError",
        code: 11000,
        keyValue: { email: "test@example.com" },
        message: "Duplicate key error",
      } as any;

      globalErrorHandler(error, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(HttpStatusCode.CONFLICT);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "Duplicate email: test@example.com already exists",
      });
    });

    it("should handle MongoDB CastError", () => {
      const error = {
        name: "CastError",
        message: "Cast to ObjectId failed",
      } as any;

      globalErrorHandler(error, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(HttpStatusCode.BAD_REQUEST);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "Invalid ID format",
      });
    });
  });

  describe("JWT errors", () => {
    it("should handle JsonWebTokenError", () => {
      const error = {
        name: "JsonWebTokenError",
        message: "Invalid token",
      } as any;

      globalErrorHandler(error, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(
        HttpStatusCode.UNAUTHORIZED
      );
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "Invalid token",
      });
    });

    it("should handle TokenExpiredError", () => {
      const error = {
        name: "TokenExpiredError",
        message: "Token expired",
      } as any;

      globalErrorHandler(error, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(
        HttpStatusCode.UNAUTHORIZED
      );
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "Token expired",
      });
    });
  });

  describe("Generic errors", () => {
    it("should handle generic Error in development", () => {
      process.env.NODE_ENV = "development";

      const error = new Error("Something went wrong");
      error.stack = "Error stack trace";

      globalErrorHandler(error, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(
        HttpStatusCode.INTERNAL_SERVER_ERROR
      );
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "Something went wrong",
        details: "Error stack trace",
      });
    });

    it("should handle generic Error in production", () => {
      process.env.NODE_ENV = "production";

      const error = new Error("Something went wrong");

      globalErrorHandler(error, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(
        HttpStatusCode.INTERNAL_SERVER_ERROR
      );
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "Internal server error",
      });
    });
  });

  describe("Error logging", () => {
    it("should log all error details", () => {
      const error = new Error("Test error");
      error.stack = "Test stack trace";

      globalErrorHandler(error, mockRequest, mockReply);

      expect(consoleSpy).toHaveBeenCalledWith(
        "🔥 Error:",
        expect.objectContaining({
          message: "Test error",
          stack: "Test stack trace",
          url: "/api/test",
          method: "POST",
          timestamp: expect.any(String),
        })
      );
    });

    it("should log error even when stack is missing", () => {
      const error = new Error("Test error without stack");
      delete error.stack;

      globalErrorHandler(error, mockRequest, mockReply);

      expect(consoleSpy).toHaveBeenCalledWith(
        "🔥 Error:",
        expect.objectContaining({
          message: "Test error without stack",
          url: "/api/test",
          method: "POST",
        })
      );
    });
  });
});
