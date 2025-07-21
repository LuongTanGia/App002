import { SecurityUtils } from "../../../src/utils/security.utils";
import { SecurityConfig } from "../../../src/config/security.config";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Mock dependencies
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");

const MockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const MockedJwt = jwt as jest.Mocked<typeof jwt>;

describe("SecurityUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret-key-for-jwt-signing-very-secure";
  });

  describe("hashPassword", () => {
    it("should hash password successfully", async () => {
      MockedBcrypt.genSalt.mockResolvedValue("salt" as never);
      MockedBcrypt.hash.mockResolvedValue("hashed-password" as never);

      const password = "Test123456";
      const result = await SecurityUtils.hashPassword(password);

      expect(MockedBcrypt.genSalt).toHaveBeenCalledWith(12);
      expect(MockedBcrypt.hash).toHaveBeenCalledWith(password, "salt");
      expect(result).toBe("hashed-password");
    });

    it("should validate password before hashing", async () => {
      const weakPassword = "123";

      await expect(SecurityUtils.hashPassword(weakPassword)).rejects.toThrow(
        "Password must be at least 8 characters long"
      );
    });
  });

  describe("comparePassword", () => {
    it("should compare passwords successfully", async () => {
      MockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await SecurityUtils.comparePassword("password", "hashed");

      expect(MockedBcrypt.compare).toHaveBeenCalledWith("password", "hashed");
      expect(result).toBe(true);
    });

    it("should return false on comparison error", async () => {
      MockedBcrypt.compare.mockRejectedValue(
        new Error("Comparison failed") as never
      );

      const result = await SecurityUtils.comparePassword("password", "hashed");

      expect(result).toBe(false);
    });
  });

  describe("validatePassword", () => {
    it("should validate a strong password", () => {
      const strongPassword = "Test123456!";

      expect(() =>
        SecurityUtils.validatePassword(strongPassword)
      ).not.toThrow();
    });

    it("should reject password that is too short", () => {
      const shortPassword = "Test1!";

      expect(() => SecurityUtils.validatePassword(shortPassword)).toThrow(
        "Password must be at least 8 characters long"
      );
    });

    it("should reject password without uppercase letter", () => {
      const noUppercasePassword = "test123456!";

      expect(() => SecurityUtils.validatePassword(noUppercasePassword)).toThrow(
        "Password must contain at least one uppercase letter"
      );
    });

    it("should reject password without lowercase letter", () => {
      const noLowercasePassword = "TEST123456!";

      expect(() => SecurityUtils.validatePassword(noLowercasePassword)).toThrow(
        "Password must contain at least one lowercase letter"
      );
    });

    it("should reject password without numbers", () => {
      const noNumberPassword = "TestPassword!";

      expect(() => SecurityUtils.validatePassword(noNumberPassword)).toThrow(
        "Password must contain at least one number"
      );
    });

    it("should reject common weak passwords", () => {
      const weakPassword = "password123";

      expect(() => SecurityUtils.validatePassword(weakPassword)).toThrow(
        "Password contains common weak patterns"
      );
    });

    it("should reject password that is too long", () => {
      const longPassword = "A".repeat(129) + "1!";

      expect(() => SecurityUtils.validatePassword(longPassword)).toThrow(
        "Password must not exceed 128 characters"
      );
    });
  });

  describe("generateToken", () => {
    it("should generate JWT token successfully", () => {
      MockedJwt.sign.mockReturnValue("jwt-token" as never);

      const payload = { userId: "user-id", email: "test@example.com" };
      const result = SecurityUtils.generateToken(payload);

      expect(MockedJwt.sign).toHaveBeenCalledWith(
        payload,
        process.env.JWT_SECRET,
        expect.objectContaining({
          expiresIn: SecurityConfig.JWT.EXPIRES_IN,
          algorithm: SecurityConfig.JWT.ALGORITHM,
          issuer: SecurityConfig.JWT.ISSUER,
        })
      );
      expect(result).toBe("jwt-token");
    });
  });

  describe("verifyToken", () => {
    it("should verify JWT token successfully", () => {
      const payload = { userId: "user-id", email: "test@example.com" };
      MockedJwt.verify.mockReturnValue(payload as never);

      const result = SecurityUtils.verifyToken("jwt-token");

      expect(MockedJwt.verify).toHaveBeenCalledWith(
        "jwt-token",
        process.env.JWT_SECRET
      );
      expect(result).toEqual(payload);
    });

    it("should throw error for invalid token", () => {
      MockedJwt.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      expect(() => SecurityUtils.verifyToken("invalid-token")).toThrow(
        "Invalid token"
      );
    });
  });

  describe("sanitizeInput", () => {
    it("should sanitize malicious script tags", () => {
      const maliciousInput = 'Hello <script>alert("xss")</script> World';
      const result = SecurityUtils.sanitizeInput(maliciousInput);

      expect(result).toBe("Hello  World");
    });

    it("should remove HTML brackets", () => {
      const htmlInput = "Hello <div>World</div>";
      const result = SecurityUtils.sanitizeInput(htmlInput);

      expect(result).toBe("Hello divWorld/div");
    });

    it("should trim whitespace", () => {
      const input = "  hello world  ";
      const result = SecurityUtils.sanitizeInput(input);

      expect(result).toBe("hello world");
    });

    it("should limit string length", () => {
      const longInput = "a".repeat(2000);
      const result = SecurityUtils.sanitizeInput(longInput);

      expect(result.length).toBeLessThanOrEqual(
        SecurityConfig.SANITIZATION.MAX_STRING_LENGTH
      );
    });

    it("should handle empty input", () => {
      const result = SecurityUtils.sanitizeInput("");
      expect(result).toBe("");
    });

    it("should handle null/undefined input", () => {
      expect(SecurityUtils.sanitizeInput(null as any)).toBe("");
      expect(SecurityUtils.sanitizeInput(undefined as any)).toBe("");
    });
  });

  describe("sanitizeEmail", () => {
    it("should sanitize email correctly", () => {
      const email = "  TEST@EXAMPLE.COM  ";
      const result = SecurityUtils.sanitizeEmail(email);

      expect(result).toBe("test@example.com");
    });

    it("should remove invalid characters", () => {
      const email = "te<st>@exam!ple$.com";
      const result = SecurityUtils.sanitizeEmail(email);

      expect(result).toBe("test@example.com");
    });

    it("should handle empty email", () => {
      const result = SecurityUtils.sanitizeEmail("");
      expect(result).toBe("");
    });
  });

  describe("generateSecureRandom", () => {
    it("should generate random string of specified length", () => {
      const result = SecurityUtils.generateSecureRandom(16);

      expect(typeof result).toBe("string");
      expect(result.length).toBe(32); // hex string is twice the byte length
    });

    it("should generate different strings on multiple calls", () => {
      const result1 = SecurityUtils.generateSecureRandom();
      const result2 = SecurityUtils.generateSecureRandom();

      expect(result1).not.toBe(result2);
    });
  });

  describe("generateCSRFToken", () => {
    it("should generate CSRF token", () => {
      const result = SecurityUtils.generateCSRFToken();

      expect(typeof result).toBe("string");
      expect(result.length).toBe(64); // 32 bytes in hex = 64 characters
    });
  });

  describe("validateCSRFToken", () => {
    it("should validate matching CSRF tokens", () => {
      const token = "a".repeat(64);
      const expected = "a".repeat(64);

      const result = SecurityUtils.validateCSRFToken(token, expected);
      expect(result).toBe(true);
    });

    it("should reject non-matching CSRF tokens", () => {
      const token = "a".repeat(64);
      const expected = "b".repeat(64);

      const result = SecurityUtils.validateCSRFToken(token, expected);
      expect(result).toBe(false);
    });

    it("should reject empty tokens", () => {
      const result = SecurityUtils.validateCSRFToken("", "token");
      expect(result).toBe(false);
    });
  });
});
