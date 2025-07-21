import {
  MigrationService,
  getMigrationService,
} from "../../../src/migrations/migrationService";
import { MigrationManager } from "../../../src/migrations/migrationManager";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Mock the print function to avoid console output during tests
jest.mock("../../../src/helpers/print", () => ({
  OutputType: {
    SUCCESS: "SUCCESS",
    ERROR: "ERROR",
    WARNING: "WARNING",
    INFORMATION: "INFORMATION",
  },
  print: jest.fn(),
}));

describe("MigrationService", () => {
  let mongoServer: MongoMemoryServer;
  let migrationService: MigrationService;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    migrationService = new MigrationService();
  });

  afterEach(async () => {
    // Clean up collections between tests
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      try {
        await collection.drop();
      } catch (error: any) {
        // Ignore "collection does not exist" errors
        if (error.message !== "ns not found") {
          console.warn("Failed to drop collection:", error.message);
        }
      }
    }

    jest.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize migration service successfully", async () => {
      await expect(migrationService.initialize()).resolves.not.toThrow();
    });

    it("should not reinitialize if already initialized", async () => {
      await migrationService.initialize();

      const migrationManager = migrationService.getMigrationManager();
      const initializeSpy = jest.spyOn(migrationManager, "initialize");

      // Second initialization should not call manager.initialize()
      await migrationService.initialize();

      expect(initializeSpy).not.toHaveBeenCalled();
    });
  });

  describe("Pending Migrations Check", () => {
    it("should return false when no pending migrations", async () => {
      // Mock getPendingMigrations to return empty array
      const migrationManager = migrationService.getMigrationManager();
      jest
        .spyOn(migrationManager, "getPendingMigrations")
        .mockResolvedValue([]);

      const hasPending = await migrationService.hasPendingMigrations();

      expect(hasPending).toBe(false);
    });

    it("should return true when there are pending migrations", async () => {
      const mockMigration = {
        name: "Test Migration",
        version: "20250721000001",
        description: "Test migration",
        up: jest.fn(),
        down: jest.fn(),
      };

      const migrationManager = migrationService.getMigrationManager();
      jest
        .spyOn(migrationManager, "getPendingMigrations")
        .mockResolvedValue([mockMigration]);

      const hasPending = await migrationService.hasPendingMigrations();

      expect(hasPending).toBe(true);
    });

    it("should initialize if not already initialized", async () => {
      const migrationManager = migrationService.getMigrationManager();
      const initializeSpy = jest.spyOn(migrationManager, "initialize");
      jest
        .spyOn(migrationManager, "getPendingMigrations")
        .mockResolvedValue([]);

      await migrationService.hasPendingMigrations();

      expect(initializeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Status Summary", () => {
    it("should return correct status summary", async () => {
      const mockStatus = [
        {
          name: "Migration 1",
          version: "1",
          description: "Test 1",
          applied: true,
          status: "SUCCESS" as const,
        },
        {
          name: "Migration 2",
          version: "2",
          description: "Test 2",
          applied: false,
          status: "PENDING" as const,
        },
        {
          name: "Migration 3",
          version: "3",
          description: "Test 3",
          applied: true,
          status: "FAILED" as const,
        },
      ];

      const migrationManager = migrationService.getMigrationManager();
      jest.spyOn(migrationManager, "getStatus").mockResolvedValue(mockStatus);

      const summary = await migrationService.getStatusSummary();

      expect(summary).toEqual({
        total: 3,
        applied: 1, // Only successful ones
        pending: 1,
        failed: 1,
      });
    });
  });

  describe("Running Migrations", () => {
    it("should handle no pending migrations", async () => {
      const migrationManager = migrationService.getMigrationManager();
      jest
        .spyOn(migrationManager, "getPendingMigrations")
        .mockResolvedValue([]);

      const result = await migrationService.runPendingMigrations();

      expect(result).toEqual({ success: true, migrationsRun: 0 });
    });

    it("should run pending migrations successfully", async () => {
      const mockMigrations = [
        {
          name: "Migration 1",
          version: "1",
          description: "Test 1",
          up: jest.fn(),
          down: jest.fn(),
        },
        {
          name: "Migration 2",
          version: "2",
          description: "Test 2",
          up: jest.fn(),
          down: jest.fn(),
        },
      ];

      const mockResults = [
        { success: true, executionTimeMs: 100 },
        { success: true, executionTimeMs: 150 },
      ];

      const migrationManager = migrationService.getMigrationManager();
      jest
        .spyOn(migrationManager, "getPendingMigrations")
        .mockResolvedValue(mockMigrations);
      jest.spyOn(migrationManager, "migrate").mockResolvedValue(mockResults);

      const result = await migrationService.runPendingMigrations();

      expect(result).toEqual({ success: true, migrationsRun: 2 });
    });

    it("should handle partial migration failures", async () => {
      const mockMigrations = [
        {
          name: "Migration 1",
          version: "1",
          description: "Test 1",
          up: jest.fn(),
          down: jest.fn(),
        },
      ];

      const mockResults = [
        { success: true, executionTimeMs: 100 },
        { success: false, executionTimeMs: 50, error: "Migration failed" },
      ];

      const migrationManager = migrationService.getMigrationManager();
      jest
        .spyOn(migrationManager, "getPendingMigrations")
        .mockResolvedValue(mockMigrations);
      jest.spyOn(migrationManager, "migrate").mockResolvedValue(mockResults);

      const result = await migrationService.runPendingMigrations();

      expect(result).toEqual({ success: false, migrationsRun: 1 });
    });
  });

  describe("Startup Behavior", () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should only check health when AUTO_MIGRATE is not enabled", async () => {
      process.env.AUTO_MIGRATE = "false";
      process.env.NODE_ENV = "development";

      const checkHealthSpy = jest
        .spyOn(migrationService, "checkMigrationHealth")
        .mockResolvedValue();
      const runPendingSpy = jest.spyOn(
        migrationService,
        "runPendingMigrations"
      );

      await migrationService.runOnStartup();

      expect(checkHealthSpy).toHaveBeenCalledTimes(1);
      expect(runPendingSpy).not.toHaveBeenCalled();
    });

    it("should not auto-run in production even if AUTO_MIGRATE is true", async () => {
      process.env.AUTO_MIGRATE = "true";
      process.env.NODE_ENV = "production";

      const checkHealthSpy = jest
        .spyOn(migrationService, "checkMigrationHealth")
        .mockResolvedValue();
      const runPendingSpy = jest.spyOn(
        migrationService,
        "runPendingMigrations"
      );

      await migrationService.runOnStartup();

      expect(checkHealthSpy).toHaveBeenCalledTimes(1);
      expect(runPendingSpy).not.toHaveBeenCalled();
    });

    it("should auto-run migrations in development when enabled", async () => {
      process.env.AUTO_MIGRATE = "true";
      process.env.NODE_ENV = "development";

      const hasPendingSpy = jest
        .spyOn(migrationService, "hasPendingMigrations")
        .mockResolvedValue(true);
      const runPendingSpy = jest
        .spyOn(migrationService, "runPendingMigrations")
        .mockResolvedValue({ success: true, migrationsRun: 1 });

      await migrationService.runOnStartup();

      expect(hasPendingSpy).toHaveBeenCalledTimes(1);
      expect(runPendingSpy).toHaveBeenCalledTimes(1);
    });

    it("should handle migration errors gracefully on startup", async () => {
      process.env.AUTO_MIGRATE = "true";
      process.env.NODE_ENV = "development";

      jest
        .spyOn(migrationService, "hasPendingMigrations")
        .mockRejectedValue(new Error("Test error"));

      // Should not throw error
      await expect(migrationService.runOnStartup()).resolves.not.toThrow();
    });
  });

  describe("Health Check", () => {
    it("should report healthy state when no issues", async () => {
      const mockSummary = {
        total: 3,
        applied: 3,
        pending: 0,
        failed: 0,
      };

      jest
        .spyOn(migrationService, "getStatusSummary")
        .mockResolvedValue(mockSummary);

      await migrationService.checkMigrationHealth();

      // Verify no warnings or errors were logged
      const { print } = require("../../../src/helpers/print");
      expect(print).toHaveBeenCalledWith(
        expect.stringContaining("Migration health check passed"),
        "SUCCESS"
      );
    });

    it("should warn about pending migrations", async () => {
      const mockSummary = {
        total: 3,
        applied: 2,
        pending: 1,
        failed: 0,
      };

      jest
        .spyOn(migrationService, "getStatusSummary")
        .mockResolvedValue(mockSummary);

      await migrationService.checkMigrationHealth();

      const { print } = require("../../../src/helpers/print");
      expect(print).toHaveBeenCalledWith(
        expect.stringContaining("1 pending migration(s) found"),
        "WARNING"
      );
    });

    it("should report failed migrations as errors", async () => {
      const mockSummary = {
        total: 3,
        applied: 2,
        pending: 0,
        failed: 1,
      };

      jest
        .spyOn(migrationService, "getStatusSummary")
        .mockResolvedValue(mockSummary);

      await migrationService.checkMigrationHealth();

      const { print } = require("../../../src/helpers/print");
      expect(print).toHaveBeenCalledWith(
        expect.stringContaining("1 migration(s) failed"),
        "ERROR"
      );
    });
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance from getMigrationService", () => {
      const service1 = getMigrationService();
      const service2 = getMigrationService();

      expect(service1).toBe(service2);
    });
  });

  describe("Migration Creation", () => {
    it("should create migration through service", async () => {
      const migrationManager = migrationService.getMigrationManager();
      const createSpy = jest
        .spyOn(migrationManager, "createMigration")
        .mockResolvedValue("/fake/path/migration.ts");

      const result = await migrationService.createMigration(
        "Test Migration",
        "Test description"
      );

      expect(createSpy).toHaveBeenCalledWith(
        "Test Migration",
        "Test description"
      );
      expect(result).toBe("/fake/path/migration.ts");
    });
  });
});
