import { MigrationManager } from "../../../src/migrations/migrationManager";
import { IMigration, generateChecksum } from "../../../src/migrations/types";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import path from "path";
import fs from "fs/promises";

describe("MigrationManager", () => {
  let mongoServer: MongoMemoryServer;
  let migrationManager: MigrationManager;
  let testMigrationsPath: string;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test migrations directory
    testMigrationsPath = path.join(__dirname, "test-migrations");
    await fs.mkdir(testMigrationsPath, { recursive: true });
  });

  afterAll(async () => {
    // Cleanup
    try {
      await fs.rmdir(testMigrationsPath, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }

    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    migrationManager = new MigrationManager({
      migrationsPath: testMigrationsPath,
      validateChecksums: false, // Disable for tests
      timeoutMs: 5000,
    });
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
  });

  describe("Initialization", () => {
    it("should initialize migration system successfully", async () => {
      await expect(migrationManager.initialize()).resolves.not.toThrow();
    });

    it("should handle non-existent migrations directory gracefully", async () => {
      const nonExistentPath = path.join(__dirname, "non-existent");
      const manager = new MigrationManager({
        migrationsPath: nonExistentPath,
      });

      await expect(manager.initialize()).resolves.not.toThrow();
    });
  });

  describe("Migration File Handling", () => {
    beforeEach(async () => {
      // Create a test migration file
      const testMigration = `
import { IMigration } from '../../../types';

const migration: IMigration = {
  name: 'Test Migration',
  version: '20250721000001',
  description: 'Test migration for unit tests',

  async up(): Promise<void> {
    console.log('Test migration up');
  },

  async down(): Promise<void> {
    console.log('Test migration down');
  },
};

export default migration;
      `;

      await fs.writeFile(
        path.join(testMigrationsPath, "20250721000001_test_migration.ts"),
        testMigration,
        "utf8"
      );
    });

    it("should load migration files correctly", async () => {
      await migrationManager.initialize();
      const status = await migrationManager.getStatus();

      expect(status).toHaveLength(1);
      expect(status[0].name).toBe("Test Migration");
      expect(status[0].version).toBe("20250721000001");
      expect(status[0].applied).toBe(false);
    });

    it("should get pending migrations", async () => {
      await migrationManager.initialize();
      const pending = await migrationManager.getPendingMigrations();

      expect(pending).toHaveLength(1);
      expect(pending[0].name).toBe("Test Migration");
    });
  });

  describe("Migration Execution", () => {
    let mockMigration: IMigration;

    beforeEach(async () => {
      // Create mock migration
      mockMigration = {
        name: "Mock Migration",
        version: "20250721000002",
        description: "Mock migration for testing",
        up: jest.fn().mockResolvedValue(undefined),
        down: jest.fn().mockResolvedValue(undefined),
      };

      // Mock the migration loading to return our mock migration
      jest
        .spyOn(migrationManager as any, "loadMigrations")
        .mockImplementation(async () => {
          (migrationManager as any).migrations.set(
            mockMigration.name,
            mockMigration
          );
        });

      await migrationManager.initialize();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should run migration successfully", async () => {
      const results = await migrationManager.migrate();

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(mockMigration.up).toHaveBeenCalledTimes(1);
    });

    it("should handle migration failure", async () => {
      const errorMessage = "Mock migration error";
      (mockMigration.up as jest.Mock).mockRejectedValue(
        new Error(errorMessage)
      );

      const results = await migrationManager.migrate();

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe(errorMessage);
    });

    it("should rollback migration successfully", async () => {
      // First run the migration
      await migrationManager.migrate();

      // Then rollback
      const result = await migrationManager.rollback(mockMigration.name);

      expect(result.success).toBe(true);
      expect(mockMigration.down).toHaveBeenCalledTimes(1);
    });

    it("should handle rollback failure", async () => {
      // Run migration first
      await migrationManager.migrate();

      const errorMessage = "Mock rollback error";
      (mockMigration.down as jest.Mock).mockRejectedValue(
        new Error(errorMessage)
      );

      const result = await migrationManager.rollback(mockMigration.name);

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });
  });

  describe("Migration Status", () => {
    beforeEach(async () => {
      // Create test migration
      const testMigration: IMigration = {
        name: "Status Test Migration",
        version: "20250721000003",
        description: "Migration for status testing",
        up: jest.fn().mockResolvedValue(undefined),
        down: jest.fn().mockResolvedValue(undefined),
      };

      jest
        .spyOn(migrationManager as any, "loadMigrations")
        .mockImplementation(async () => {
          (migrationManager as any).migrations.set(
            testMigration.name,
            testMigration
          );
        });

      await migrationManager.initialize();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should show correct status for pending migration", async () => {
      const status = await migrationManager.getStatus();

      expect(status).toHaveLength(1);
      expect(status[0].applied).toBe(false);
      expect(status[0].status).toBe("PENDING");
    });

    it("should show correct status for applied migration", async () => {
      // Run migration first
      await migrationManager.migrate();

      const status = await migrationManager.getStatus();

      expect(status).toHaveLength(1);
      expect(status[0].applied).toBe(true);
      expect(status[0].status).toBe("SUCCESS");
      expect(status[0].appliedAt).toBeDefined();
    });
  });

  describe("Migration Creation", () => {
    it("should create migration file with correct template", async () => {
      const migrationName = "Test Create Migration";
      const description = "Test migration creation";

      const filePath = await migrationManager.createMigration(
        migrationName,
        description
      );

      expect(filePath).toContain("test_create_migration.ts");

      // Verify file exists and has correct content
      const fileContent = await fs.readFile(filePath, "utf8");
      expect(fileContent).toContain(migrationName);
      expect(fileContent).toContain(description);
      expect(fileContent).toContain("async up()");
      expect(fileContent).toContain("async down()");
    });
  });

  describe("Utility Functions", () => {
    it("should generate consistent checksum", () => {
      const content = "test content";
      const checksum1 = generateChecksum(content);
      const checksum2 = generateChecksum(content);

      expect(checksum1).toBe(checksum2);
      expect(checksum1).toHaveLength(64); // SHA256 hex length
    });

    it("should generate different checksums for different content", () => {
      const content1 = "test content 1";
      const content2 = "test content 2";

      const checksum1 = generateChecksum(content1);
      const checksum2 = generateChecksum(content2);

      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe("Error Handling", () => {
    it("should handle database connection errors gracefully", async () => {
      // Disconnect mongoose to simulate connection error
      await mongoose.disconnect();

      await expect(migrationManager.initialize()).rejects.toThrow();

      // Reconnect for cleanup
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
    });

    it("should handle migration timeout", async () => {
      const timeoutMigration: IMigration = {
        name: "Timeout Migration",
        version: "20250721000004",
        description: "Migration that times out",
        up: jest
          .fn()
          .mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 10000))
          ),
        down: jest.fn().mockResolvedValue(undefined),
      };

      const shortTimeoutManager = new MigrationManager({
        migrationsPath: testMigrationsPath,
        timeoutMs: 100, // Very short timeout
      });

      jest
        .spyOn(shortTimeoutManager as any, "loadMigrations")
        .mockImplementation(async () => {
          (shortTimeoutManager as any).migrations.set(
            timeoutMigration.name,
            timeoutMigration
          );
        });

      await shortTimeoutManager.initialize();

      const results = await shortTimeoutManager.migrate();

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe("Migration timeout");
    });
  });
});
