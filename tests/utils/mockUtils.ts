import { FastifyRequest, FastifyReply } from "fastify";

/**
 * Mock utilities for testing
 */
export class MockUtils {
  /**
   * Create mock Fastify request
   */
  static createMockRequest(
    overrides: Partial<FastifyRequest> = {}
  ): Partial<FastifyRequest> {
    return {
      body: {},
      query: {},
      params: {},
      headers: {},
      url: "/",
      method: "GET",
      ...overrides,
    };
  }

  /**
   * Create mock Fastify reply
   */
  static createMockReply(): Partial<FastifyReply> {
    const reply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      removeHeader: jest.fn().mockReturnThis(),
      code: jest.fn().mockReturnThis(),
      statusCode: 200,
      sent: false,
    };

    return reply;
  }

  /**
   * Mock JWT token
   */
  static mockJWT() {
    return {
      sign: jest.fn().mockReturnValue("mock-token"),
      verify: jest
        .fn()
        .mockReturnValue({ userId: "mock-user-id", email: "mock@example.com" }),
    };
  }

  /**
   * Mock bcrypt
   */
  static mockBcrypt() {
    return {
      hash: jest.fn().mockResolvedValue("hashed-password"),
      compare: jest.fn().mockResolvedValue(true),
      genSalt: jest.fn().mockResolvedValue("salt"),
    };
  }

  /**
   * Mock mongoose model
   */
  static mockMongooseModel(mockData: any = {}) {
    return {
      find: jest.fn().mockReturnThis(),
      findOne: jest.fn().mockReturnThis(),
      findById: jest.fn().mockReturnThis(),
      create: jest.fn().mockResolvedValue(mockData),
      updateOne: jest.fn().mockReturnThis(),
      deleteOne: jest.fn().mockReturnThis(),
      countDocuments: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue([]),
      bulkWrite: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      save: jest.fn().mockResolvedValue(mockData),
      lean: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockData),
    };
  }

  /**
   * Create mock console to suppress logs in tests
   */
  static mockConsole() {
    return {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };
  }

  /**
   * Mock process.env
   */
  static mockProcessEnv(envVars: Record<string, string>) {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv, ...envVars };
    });

    afterEach(() => {
      process.env = originalEnv;
    });
  }

  /**
   * Mock Date.now for consistent testing
   */
  static mockDateNow(timestamp: number = 1640995200000) {
    // 2022-01-01
    const originalDateNow = Date.now;

    beforeEach(() => {
      Date.now = jest.fn(() => timestamp);
    });

    afterEach(() => {
      Date.now = originalDateNow;
    });
  }

  /**
   * Mock setTimeout for faster tests
   */
  static mockTimers() {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });
  }
}
