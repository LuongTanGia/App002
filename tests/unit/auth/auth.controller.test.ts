import {
  registerUser,
  loginUser,
} from "../../../src/modules/auth/auth.controller";
import User from "../../../src/modules/auth/user.model";
import { SecurityUtils } from "../../../src/utils/security.utils";
import {
  ValidationError,
  ConflictError,
  UnauthorizedError,
} from "../../../src/errors/AppError";
import { MockUtils } from "../../utils/mockUtils";

// Mock dependencies
jest.mock("../../../src/modules/auth/user.model");
jest.mock("../../../src/utils/security.utils");

const MockedUser = User as jest.Mocked<typeof User>;
const MockedSecurityUtils = SecurityUtils as jest.Mocked<typeof SecurityUtils>;

describe("Auth Controller", () => {
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    mockRequest = MockUtils.createMockRequest();
    mockReply = MockUtils.createMockReply();
    jest.clearAllMocks();
  });

  describe("registerUser", () => {
    beforeEach(() => {
      // Setup default mocks
      MockedSecurityUtils.sanitizeInput = jest
        .fn()
        .mockImplementation((input) => input);
      MockedSecurityUtils.validatePassword = jest.fn();
      MockedSecurityUtils.hashPassword = jest
        .fn()
        .mockResolvedValue("hashed-password");
      MockedUser.findOne = jest.fn().mockResolvedValue(null);
      MockedUser.prototype.save = jest.fn().mockResolvedValue({
        _id: "user-id",
        username: "testuser",
        email: "test@example.com",
      });
    });

    it("should register a new user successfully", async () => {
      mockRequest.body = {
        username: "testuser",
        email: "test@example.com",
        password: "Test123456",
      };

      await registerUser(mockRequest, mockReply);

      expect(MockedSecurityUtils.sanitizeInput).toHaveBeenCalledWith(
        "testuser"
      );
      expect(MockedSecurityUtils.sanitizeInput).toHaveBeenCalledWith(
        "test@example.com"
      );
      expect(MockedSecurityUtils.validatePassword).toHaveBeenCalledWith(
        "Test123456"
      );
      expect(MockedSecurityUtils.hashPassword).toHaveBeenCalledWith(
        "Test123456"
      );
      expect(MockedUser.findOne).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: "User registered successfully",
      });
    });

    it("should throw ValidationError when username is missing", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: "Test123456",
      };

      await expect(registerUser(mockRequest, mockReply)).rejects.toThrow(
        ValidationError
      );
    });

    it("should throw ValidationError when email is missing", async () => {
      mockRequest.body = {
        username: "testuser",
        password: "Test123456",
      };

      await expect(registerUser(mockRequest, mockReply)).rejects.toThrow(
        ValidationError
      );
    });

    it("should throw ValidationError when password is missing", async () => {
      mockRequest.body = {
        username: "testuser",
        email: "test@example.com",
      };

      await expect(registerUser(mockRequest, mockReply)).rejects.toThrow(
        ValidationError
      );
    });

    it("should throw ValidationError for invalid email format", async () => {
      mockRequest.body = {
        username: "testuser",
        email: "invalid-email",
        password: "Test123456",
      };

      await expect(registerUser(mockRequest, mockReply)).rejects.toThrow(
        ValidationError
      );
    });

    it("should throw ValidationError for weak password", async () => {
      mockRequest.body = {
        username: "testuser",
        email: "test@example.com",
        password: "weak",
      };

      MockedSecurityUtils.validatePassword = jest
        .fn()
        .mockImplementation(() => {
          throw new Error("Password is too weak");
        });

      await expect(registerUser(mockRequest, mockReply)).rejects.toThrow(
        ValidationError
      );
    });

    it("should throw ConflictError when user already exists", async () => {
      mockRequest.body = {
        username: "testuser",
        email: "test@example.com",
        password: "Test123456",
      };

      MockedUser.findOne = jest.fn().mockResolvedValue({
        email: "test@example.com",
        username: "testuser",
      });

      await expect(registerUser(mockRequest, mockReply)).rejects.toThrow(
        ConflictError
      );
    });
  });

  describe("loginUser", () => {
    beforeEach(() => {
      MockedSecurityUtils.sanitizeInput = jest
        .fn()
        .mockImplementation((input) => input);
      MockedSecurityUtils.generateToken = jest
        .fn()
        .mockReturnValue("jwt-token");
    });

    it("should login user successfully", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: "Test123456",
      };

      const mockUser = {
        _id: "user-id",
        username: "testuser",
        email: "test@example.com",
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      MockedUser.findOne = jest.fn().mockResolvedValue(mockUser);

      await loginUser(mockRequest, mockReply);

      expect(MockedUser.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
      });
      expect(mockUser.comparePassword).toHaveBeenCalledWith("Test123456");
      expect(MockedSecurityUtils.generateToken).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });

    it("should throw ValidationError when email is missing", async () => {
      mockRequest.body = {
        password: "Test123456",
      };

      await expect(loginUser(mockRequest, mockReply)).rejects.toThrow(
        ValidationError
      );
    });

    it("should throw ValidationError when password is missing", async () => {
      mockRequest.body = {
        email: "test@example.com",
      };

      await expect(loginUser(mockRequest, mockReply)).rejects.toThrow(
        ValidationError
      );
    });

    it("should throw UnauthorizedError when user does not exist", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: "Test123456",
      };

      MockedUser.findOne = jest.fn().mockResolvedValue(null);

      await expect(loginUser(mockRequest, mockReply)).rejects.toThrow(
        UnauthorizedError
      );
    });

    it("should throw UnauthorizedError when password is incorrect", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      const mockUser = {
        _id: "user-id",
        username: "testuser",
        email: "test@example.com",
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      MockedUser.findOne = jest.fn().mockResolvedValue(mockUser);

      await expect(loginUser(mockRequest, mockReply)).rejects.toThrow(
        UnauthorizedError
      );
    });
  });
});
