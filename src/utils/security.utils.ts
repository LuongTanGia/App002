import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { SecurityConfig } from "../config/security.config";
import { UnauthorizedError } from "../errors/AppError";
import { OutputType, print } from "../helpers/print";

export class SecurityUtils {
  /**
   * Generate a strong JWT secret
   */
  static generateJWTSecret(): string {
    return crypto.randomBytes(64).toString("hex");
  }

  /**
   * Validate JWT secret strength
   */
  static validateJWTSecret(secret: string): boolean {
    return !!(secret && secret.length >= SecurityConfig.JWT.SECRET_MIN_LENGTH);
  }

  /**
   * Get or generate JWT secret
   */
  static getJWTSecret(): string {
    const secret = process.env.JWT_SECRET;
    print(
      "🚀 ~ SecurityUtils ~ getJWTSecret ~ secret:" + " " + secret,
      OutputType.SUCCESS
    );

    if (!secret || !this.validateJWTSecret(secret)) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "JWT_SECRET must be set and be at least 32 characters long in production"
        );
      }

      // Generate a warning for development
      print(
        "⚠️  WARNING: Using weak or missing JWT_SECRET. Generate a strong secret for production!",
        OutputType.WARNING
      );
      return this.generateJWTSecret();
    }

    return secret;
  }

  /**
   * Enhanced password hashing with configurable rounds
   */
  static async hashPassword(
    password: string,
    rounds: number = 12
  ): Promise<string> {
    // Validate password strength first
    this.validatePassword(password);

    const salt = await bcrypt.genSalt(rounds);
    return bcrypt.hash(password, salt);
  }

  /**
   * Password comparison with timing attack protection
   */
  static async comparePassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      // Always return false on error to prevent timing attacks
      return false;
    }
  }

  /**
   * Comprehensive password validation
   */
  static validatePassword(password: string): void {
    const config = SecurityConfig.PASSWORD;
    const errors: string[] = [];

    if (!password || password.length < config.MIN_LENGTH) {
      errors.push(
        `Password must be at least ${config.MIN_LENGTH} characters long`
      );
    }

    if (password.length > config.MAX_LENGTH) {
      errors.push(`Password must not exceed ${config.MAX_LENGTH} characters`);
    }

    if (config.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (config.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (config.REQUIRE_NUMBERS && !/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (config.REQUIRE_SYMBOLS && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    // Check for common weak patterns
    const commonWeakPasswords = [
      "password",
      "123456",
      "qwerty",
      "admin",
      "letmein",
      "welcome",
      "monkey",
      "1234567890",
      "password123",
    ];

    if (
      commonWeakPasswords.some((weak) =>
        password.toLowerCase().includes(weak.toLowerCase())
      )
    ) {
      errors.push("Password contains common weak patterns");
    }

    if (errors.length > 0) {
      throw new Error(errors.join("; "));
    }
  }

  /**
   * Generate secure JWT token
   */
  static generateToken(
    payload: object,
    expiresIn: string = SecurityConfig.JWT.EXPIRES_IN
  ): string {
    const secret = this.getJWTSecret();

    return jwt.sign(payload, secret, {
      expiresIn: expiresIn,
      algorithm: "HS256" as jwt.Algorithm,
      issuer: SecurityConfig.JWT.ISSUER,
    } as jwt.SignOptions);
  }

  /**
   * Verify JWT token with enhanced security
   */
  static verifyToken(token: string): any {
    try {
      const secret = this.getJWTSecret();

      return jwt.verify(token, secret);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError("Token has expired");
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError("Invalid token");
      }
      throw new UnauthorizedError("Token verification failed");
    }
  }

  /**
   * Generate secure random string
   */
  static generateSecureRandom(length: number = 32): string {
    return crypto.randomBytes(length).toString("hex");
  }

  /**
   * Input sanitization
   */
  static sanitizeInput(input: string): string {
    if (!input) return "";

    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
      .replace(/[<>]/g, "") // Remove HTML brackets
      .substring(0, SecurityConfig.SANITIZATION.MAX_STRING_LENGTH);
  }

  /**
   * Email sanitization and validation
   */
  static sanitizeEmail(email: string): string {
    if (!email) return "";

    return email
      .toLowerCase()
      .trim()
      .replace(/[^\w@.-]/g, ""); // Only allow alphanumeric, @, ., and -
  }

  /**
   * Generate CSRF token
   */
  static generateCSRFToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Validate CSRF token
   */
  static validateCSRFToken(token: string, expected: string): boolean {
    if (!token || !expected) return false;
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  }
}
