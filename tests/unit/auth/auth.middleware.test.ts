import {
  verifyToken,
  sanitizeInput,
} from "../../../src/modules/auth/auth.middleware";
import { SecurityUtils } from "../../../src/utils/security.utils";
import HttpStatusCode from "../../../src/errors/HttpStatusCode";
import { MockUtils } from "../../utils/mockUtils";

// Mock SecurityUtils
jest.mock("../../../src/utils/security.utils");

const MockedSecurityUtils = SecurityUtils as jest.Mocked<typeof SecurityUtils>;

describe("Auth Middleware", () => {
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    mockRequest = MockUtils.createMockRequest();
    mockReply = MockUtils.createMockReply();
    jest.clearAllMocks();
  });

  describe("verifyToken", () => {
    it("should skip authentication for excluded paths", async () => {
      mockRequest.routerPath = "/api/auth/login";

      await verifyToken(mockRequest, mockReply);

      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });

    it("should return 401 when no token provided", async () => {
      mockRequest.routerPath = "/api/protected";
      mockRequest.headers = {};

      await verifyToken(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(
        HttpStatusCode.UNAUTHORIZED
      );
      expect(mockReply.send).toHaveBeenCalledWith({
        error: "Authentication token is required",
      });
    });

    it("should return 401 when token is invalid", async () => {
      mockRequest.routerPath = "/api/protected";
      mockRequest.headers = {
        authorization: "Bearer invalid-token",
      };

      MockedSecurityUtils.verifyToken.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await verifyToken(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(
        HttpStatusCode.UNAUTHORIZED
      );
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("Invalid or expired token"),
        })
      );
    });

    it("should set user data when token is valid", async () => {
      mockRequest.routerPath = "/api/protected";
      mockRequest.headers = {
        authorization: "Bearer valid-token",
      };

      const mockPayload = {
        userId: "user-123",
        userName: "testuser",
        email: "test@example.com",
        role: "user",
      };

      MockedSecurityUtils.verifyToken.mockReturnValue(mockPayload);

      await verifyToken(mockRequest, mockReply);

      expect(mockRequest.user).toEqual({
        userId: "user-123",
        userName: "testuser",
        email: "test@example.com",
        role: "user",
      });
      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it("should handle token without Bearer prefix", async () => {
      mockRequest.routerPath = "/api/protected";
      mockRequest.headers = {
        authorization: "invalid-format-token",
      };

      await verifyToken(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(
        HttpStatusCode.UNAUTHORIZED
      );
    });
  });

  describe("sanitizeInput", () => {
    beforeEach(() => {
      MockedSecurityUtils.sanitizeInput = jest
        .fn()
        .mockImplementation((input) =>
          input?.replace(/<script.*?>.*?<\/script>/gi, "").trim()
        );
    });

    it("should sanitize request body", async () => {
      mockRequest.body = {
        username: '<script>alert("xss")</script>testuser',
        description: "Normal text",
      };

      await sanitizeInput(mockRequest, mockReply);

      expect(MockedSecurityUtils.sanitizeInput).toHaveBeenCalledWith(
        '<script>alert("xss")</script>testuser'
      );
      expect(MockedSecurityUtils.sanitizeInput).toHaveBeenCalledWith(
        "Normal text"
      );
    });

    it("should sanitize request query parameters", async () => {
      mockRequest.query = {
        search: "<script>evil()</script>search term",
        category: "electronics",
      };

      await sanitizeInput(mockRequest, mockReply);

      expect(MockedSecurityUtils.sanitizeInput).toHaveBeenCalledWith(
        "<script>evil()</script>search term"
      );
      expect(MockedSecurityUtils.sanitizeInput).toHaveBeenCalledWith(
        "electronics"
      );
    });

    it("should handle nested objects in body", async () => {
      mockRequest.body = {
        user: {
          name: '<img onerror="alert(1)" src=x>John',
          preferences: {
            theme: "dark<script>hack()</script>",
          },
        },
      };

      await sanitizeInput(mockRequest, mockReply);

      expect(MockedSecurityUtils.sanitizeInput).toHaveBeenCalledTimes(2);
    });

    it("should handle arrays in request data", async () => {
      mockRequest.body = {
        tags: [
          '<script>alert("xss1")</script>tag1',
          "normal-tag",
          '<script>alert("xss2")</script>tag2',
        ],
      };

      await sanitizeInput(mockRequest, mockReply);

      expect(MockedSecurityUtils.sanitizeInput).toHaveBeenCalledWith(
        '<script>alert("xss1")</script>tag1'
      );
      expect(MockedSecurityUtils.sanitizeInput).toHaveBeenCalledWith(
        "normal-tag"
      );
      expect(MockedSecurityUtils.sanitizeInput).toHaveBeenCalledWith(
        '<script>alert("xss2")</script>tag2'
      );
    });

    it("should skip sanitization when no body or query", async () => {
      await sanitizeInput(mockRequest, mockReply);

      expect(MockedSecurityUtils.sanitizeInput).not.toHaveBeenCalled();
    });

    it("should handle non-object body", async () => {
      mockRequest.body = "string-body";

      await sanitizeInput(mockRequest, mockReply);

      // Should not throw error and not call sanitize for non-object body
      expect(MockedSecurityUtils.sanitizeInput).not.toHaveBeenCalled();
    });
  });
});
