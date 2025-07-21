import request from "supertest";
import Fastify, { FastifyInstance } from "fastify";
import mongoose from "mongoose";
import User from "../../../src/modules/auth/user.model";
import authRoutes from "../../../src/modules/auth/auth.route";
import { globalErrorHandler } from "../../../src/errors/errorHandler";
import { TestUtils } from "../../utils/testUtils";

describe("Auth Routes Integration Tests", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Create test app
    app = Fastify({ logger: false });

    // Register auth routes
    await app.register(authRoutes, { prefix: "/api/auth" });

    // Register error handler
    app.setErrorHandler(globalErrorHandler);

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await TestUtils.cleanupDatabase();
  });

  describe("POST /api/auth/register", () => {
    const validUserData = {
      username: "testuser",
      email: "test@example.com",
      password: "Test123456",
    };

    it("should register a new user successfully", async () => {
      const response = await request(app.server)
        .post("/api/auth/register")
        .send(validUserData)
        .expect(201);

      expect(response.body).toEqual({
        message: "User registered successfully",
      });

      // Verify user was created in database
      const user = await User.findOne({ email: validUserData.email });
      expect(user).toBeTruthy();
      expect(user?.username).toBe(validUserData.username);
      expect(user?.email).toBe(validUserData.email);
    });

    it("should return 400 for missing username", async () => {
      const invalidData = {
        email: "test@example.com",
        password: "Test123456",
      };

      const response = await request(app.server)
        .post("/api/auth/register")
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain("Username is required");
    });

    it("should return 400 for missing email", async () => {
      const invalidData = {
        username: "testuser",
        password: "Test123456",
      };

      const response = await request(app.server)
        .post("/api/auth/register")
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain("Email is required");
    });

    it("should return 400 for missing password", async () => {
      const invalidData = {
        username: "testuser",
        email: "test@example.com",
      };

      const response = await request(app.server)
        .post("/api/auth/register")
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain("Password is required");
    });

    it("should return 400 for invalid email format", async () => {
      const invalidData = {
        ...validUserData,
        email: "invalid-email",
      };

      const response = await request(app.server)
        .post("/api/auth/register")
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain("Invalid email format");
    });

    it("should return 400 for weak password", async () => {
      const invalidData = {
        ...validUserData,
        password: "weak",
      };

      const response = await request(app.server)
        .post("/api/auth/register")
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain(
        "Password must be at least 8 characters long"
      );
    });

    it("should return 409 for duplicate email", async () => {
      // Create user first
      await TestUtils.createTestUser({
        email: validUserData.email,
      });

      const response = await request(app.server)
        .post("/api/auth/register")
        .send(validUserData)
        .expect(409);

      expect(response.body.error).toContain(
        "User with this email already exists"
      );
    });

    it("should return 409 for duplicate username", async () => {
      // Create user first
      await TestUtils.createTestUser({
        username: validUserData.username,
      });

      const response = await request(app.server)
        .post("/api/auth/register")
        .send(validUserData)
        .expect(409);

      expect(response.body.error).toContain(
        "User with this username already exists"
      );
    });
  });

  describe("POST /api/auth/login", () => {
    const loginData = {
      email: "test@example.com",
      password: "Test123456",
    };

    beforeEach(async () => {
      // Create a test user before each login test
      await TestUtils.createTestUser({
        email: loginData.email,
        password: loginData.password,
      });
    });

    it("should login user successfully", async () => {
      const response = await request(app.server)
        .post("/api/auth/login")
        .send(loginData)
        .expect(200);

      expect(response.body).toEqual({
        message: "Login successful",
        token: expect.any(String),
        user: expect.objectContaining({
          id: expect.any(String),
          username: expect.any(String),
          email: loginData.email,
        }),
      });

      // Verify token is valid JWT
      expect(response.body.token).toMatch(
        /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/
      );
    });

    it("should return 400 for missing email", async () => {
      const invalidData = {
        password: "Test123456",
      };

      const response = await request(app.server)
        .post("/api/auth/login")
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain("Email is required");
    });

    it("should return 400 for missing password", async () => {
      const invalidData = {
        email: "test@example.com",
      };

      const response = await request(app.server)
        .post("/api/auth/login")
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain("Password is required");
    });

    it("should return 401 for non-existent user", async () => {
      const invalidData = {
        email: "nonexistent@example.com",
        password: "Test123456",
      };

      const response = await request(app.server)
        .post("/api/auth/login")
        .send(invalidData)
        .expect(401);

      expect(response.body.error).toBe("Invalid credentials");
    });

    it("should return 401 for incorrect password", async () => {
      const invalidData = {
        email: loginData.email,
        password: "wrongpassword",
      };

      const response = await request(app.server)
        .post("/api/auth/login")
        .send(invalidData)
        .expect(401);

      expect(response.body.error).toBe("Invalid credentials");
    });

    it("should sanitize email input", async () => {
      const sanitizedData = {
        email: "  TEST@EXAMPLE.COM  ",
        password: loginData.password,
      };

      // Create user with lowercase email
      await TestUtils.cleanupDatabase();
      await TestUtils.createTestUser({
        email: "test@example.com",
        password: loginData.password,
      });

      const response = await request(app.server)
        .post("/api/auth/login")
        .send(sanitizedData)
        .expect(200);

      expect(response.body.message).toBe("Login successful");
    });
  });

  describe("Rate Limiting", () => {
    it("should apply rate limiting to auth endpoints", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "Test123456",
      };

      // Make multiple requests quickly
      const promises = Array.from({ length: 10 }, () =>
        request(app.server).post("/api/auth/register").send(userData)
      );

      const responses = await Promise.all(promises);

      // First request should succeed, others should be rate limited
      const successfulResponses = responses.filter((r) => r.status === 201);
      const rateLimitedResponses = responses.filter((r) => r.status === 429);

      expect(successfulResponses.length).toBe(1);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe("Input Sanitization", () => {
    it("should sanitize malicious input", async () => {
      const maliciousData = {
        username: '<script>alert("xss")</script>testuser',
        email: "test@example.com",
        password: "Test123456",
      };

      const response = await request(app.server)
        .post("/api/auth/register")
        .send(maliciousData)
        .expect(201);

      expect(response.body.message).toBe("User registered successfully");

      // Verify sanitization happened
      const user = await User.findOne({ email: maliciousData.email });
      expect(user?.username).toBe("testuser"); // Script tags should be removed
    });
  });
});
