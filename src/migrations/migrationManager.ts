import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import Migration from "./migration.model";
import { OutputType, print } from "../helpers/print";
import { DatabaseError } from "../errors/AppError";
import {
  IMigration,
  MigrationResult,
  MigrationStatus,
  MigrationConfig,
  DEFAULT_MIGRATION_CONFIG,
  generateChecksum,
  MigrationContext,
  ValidationResult,
  MigrationFileInfo,
} from "./types";

/**
 * Database Migration Manager
 * Handles running, tracking, and managing database migrations
 */
export class MigrationManager {
  private config: MigrationConfig;
  private migrations: Map<string, IMigration> = new Map();

  constructor(config?: Partial<MigrationConfig>) {
    this.config = { ...DEFAULT_MIGRATION_CONFIG, ...config };
  }

  /**
   * Initialize migration system
   */
  async initialize(): Promise<void> {
    try {
      print("🔄 Initializing migration system...", OutputType.INFORMATION);

      // Ensure migrations collection exists
      await this.ensureMigrationsCollection();

      // Load migration files
      await this.loadMigrations();

      print("✅ Migration system initialized successfully", OutputType.SUCCESS);
    } catch (error: any) {
      print(
        `❌ Failed to initialize migration system: ${error.message}`,
        OutputType.ERROR
      );
      throw new DatabaseError(
        `Migration initialization failed: ${error.message}`
      );
    }
  }

  /**
   * Load all migration files from the migrations directory
   */
  private async loadMigrations(): Promise<void> {
    try {
      const migrationsDir = path.resolve(this.config.migrationsPath);

      // Check if migrations directory exists
      try {
        await fs.access(migrationsDir);
      } catch {
        print(
          `⚠️ Migrations directory not found: ${migrationsDir}`,
          OutputType.WARNING
        );
        return;
      }

      const files = await fs.readdir(migrationsDir);
      const migrationFiles = files.filter(
        (file) => file.endsWith(".js") || file.endsWith(".ts")
      );

      print(
        `📁 Found ${migrationFiles.length} migration files`,
        OutputType.INFORMATION
      );

      for (const file of migrationFiles.sort()) {
        try {
          const filePath = path.join(migrationsDir, file);
          const migration = await this.loadMigrationFile(filePath);
          this.migrations.set(migration.name, migration);

          print(
            `📄 Loaded migration: ${migration.name} (v${migration.version})`,
            OutputType.SUCCESS
          );
        } catch (error: any) {
          print(
            `❌ Failed to load migration ${file}: ${error.message}`,
            OutputType.ERROR
          );
          throw error;
        }
      }
    } catch (error: any) {
      throw new DatabaseError(`Failed to load migrations: ${error.message}`);
    }
  }

  /**
   * Load individual migration file
   */
  private async loadMigrationFile(filePath: string): Promise<IMigration> {
    try {
      // For development, we'll need to handle both .ts and .js files
      const extension = path.extname(filePath);
      let migrationModule: any;

      if (extension === ".ts") {
        // In development with ts-node
        migrationModule = await import(filePath);
      } else {
        // In production with compiled JS
        migrationModule = require(filePath);
      }

      const migration = migrationModule.default || migrationModule;

      if (!this.validateMigration(migration)) {
        throw new Error("Invalid migration structure");
      }

      return migration;
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to load migration file ${filePath}: ${error.message}`
      );
    }
  }

  /**
   * Validate migration structure
   */
  private validateMigration(migration: any): migration is IMigration {
    const validation: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!migration.name || typeof migration.name !== "string") {
      validation.errors.push("Migration must have a valid name");
    }

    if (!migration.version || typeof migration.version !== "string") {
      validation.errors.push("Migration must have a valid version");
    }

    if (!migration.description || typeof migration.description !== "string") {
      validation.errors.push("Migration must have a valid description");
    }

    if (!migration.up || typeof migration.up !== "function") {
      validation.errors.push('Migration must have an "up" function');
    }

    if (!migration.down || typeof migration.down !== "function") {
      validation.errors.push('Migration must have a "down" function');
    }

    if (validation.errors.length > 0) {
      print(
        `❌ Migration validation failed: ${validation.errors.join(", ")}`,
        OutputType.ERROR
      );
      return false;
    }

    return true;
  }

  /**
   * Ensure migrations collection exists
   */
  private async ensureMigrationsCollection(): Promise<void> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not available");
      }

      const collections = await db.listCollections().toArray();
      const migrationCollectionExists = collections.some(
        (col) => col.name === this.config.collectionName
      );

      if (!migrationCollectionExists) {
        await db.createCollection(this.config.collectionName);
        print(
          `✅ Created migrations collection: ${this.config.collectionName}`,
          OutputType.SUCCESS
        );
      }
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to ensure migrations collection: ${error.message}`
      );
    }
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<MigrationStatus[]> {
    try {
      const appliedMigrations = await Migration.find().sort({ appliedAt: 1 });
      const appliedMigrationNames = new Set(
        appliedMigrations.map((m) => m.name)
      );

      const status: MigrationStatus[] = [];

      // Add all available migrations
      for (const [name, migration] of this.migrations) {
        const applied = appliedMigrationNames.has(name);
        const appliedMigration = appliedMigrations.find((m) => m.name === name);

        status.push({
          name: migration.name,
          version: migration.version,
          description: migration.description,
          applied,
          appliedAt: appliedMigration?.appliedAt,
          status: appliedMigration?.status || "PENDING",
          errorMessage: appliedMigration?.errorMessage,
        });
      }

      // Add applied migrations that no longer have files
      for (const appliedMigration of appliedMigrations) {
        if (!this.migrations.has(appliedMigration.name)) {
          status.push({
            name: appliedMigration.name,
            version: appliedMigration.version,
            description: appliedMigration.description,
            applied: true,
            appliedAt: appliedMigration.appliedAt,
            status: appliedMigration.status,
            errorMessage: appliedMigration.errorMessage,
          });
        }
      }

      return status.sort((a, b) => a.version.localeCompare(b.version));
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to get migration status: ${error.message}`
      );
    }
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations(): Promise<IMigration[]> {
    try {
      const appliedMigrations = await Migration.find({ status: "SUCCESS" });
      const appliedMigrationNames = new Set(
        appliedMigrations.map((m) => m.name)
      );

      const pendingMigrations: IMigration[] = [];
      for (const [name, migration] of this.migrations) {
        if (!appliedMigrationNames.has(name)) {
          pendingMigrations.push(migration);
        }
      }

      // Sort by version
      return pendingMigrations.sort((a, b) =>
        a.version.localeCompare(b.version)
      );
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to get pending migrations: ${error.message}`
      );
    }
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<MigrationResult[]> {
    try {
      print("🚀 Starting database migration...", OutputType.INFORMATION);

      const pendingMigrations = await this.getPendingMigrations();

      if (pendingMigrations.length === 0) {
        print("✅ No pending migrations found", OutputType.SUCCESS);
        return [];
      }

      print(
        `📋 Found ${pendingMigrations.length} pending migrations`,
        OutputType.INFORMATION
      );

      const results: MigrationResult[] = [];

      for (const migration of pendingMigrations) {
        const result = await this.runSingleMigration(migration);
        results.push(result);

        if (!result.success) {
          print(
            `❌ Migration ${migration.name} failed, stopping execution`,
            OutputType.ERROR
          );
          break;
        }
      }

      const successCount = results.filter((r) => r.success).length;
      print(
        `🎉 Migration completed: ${successCount}/${results.length} successful`,
        OutputType.SUCCESS
      );

      return results;
    } catch (error: any) {
      print(`❌ Migration process failed: ${error.message}`, OutputType.ERROR);
      throw new DatabaseError(`Migration failed: ${error.message}`);
    }
  }

  /**
   * Run single migration
   */
  private async runSingleMigration(
    migration: IMigration
  ): Promise<MigrationResult> {
    const context: MigrationContext = {
      startTime: new Date(),
    };

    let session: mongoose.ClientSession | null = null;

    try {
      print(
        `🔄 Running migration: ${migration.name} (v${migration.version})`,
        OutputType.INFORMATION
      );

      // Start transaction for migration consistency
      session = await mongoose.startSession();
      session.startTransaction();

      // Create migration record
      const migrationRecord = new Migration({
        name: migration.name,
        version: migration.version,
        description: migration.description,
        checksum: generateChecksum(migration.name + migration.version),
        status: "PENDING",
        executionTimeMs: 0,
      });

      await migrationRecord.save({ session });

      // Execute migration with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Migration timeout")),
          this.config.timeoutMs
        );
      });

      await Promise.race([migration.up(), timeoutPromise]);

      context.endTime = new Date();
      context.executionTimeMs =
        context.endTime.getTime() - context.startTime.getTime();

      // Update migration record
      migrationRecord.status = "SUCCESS";
      migrationRecord.executionTimeMs = context.executionTimeMs;
      await migrationRecord.save({ session });

      await session.commitTransaction();

      print(
        `✅ Migration ${migration.name} completed in ${context.executionTimeMs}ms`,
        OutputType.SUCCESS
      );

      return {
        success: true,
        executionTimeMs: context.executionTimeMs,
      };
    } catch (error: any) {
      if (session && session.inTransaction()) {
        await session.abortTransaction();
      }

      context.endTime = new Date();
      context.executionTimeMs =
        context.endTime.getTime() - context.startTime.getTime();

      // Update migration record with error
      try {
        await Migration.updateOne(
          { name: migration.name },
          {
            status: "FAILED",
            errorMessage: error.message,
            executionTimeMs: context.executionTimeMs,
          }
        );
      } catch (updateError) {
        print(
          `⚠️ Failed to update migration record: ${updateError}`,
          OutputType.WARNING
        );
      }

      print(
        `❌ Migration ${migration.name} failed: ${error.message}`,
        OutputType.ERROR
      );

      return {
        success: false,
        executionTimeMs: context.executionTimeMs,
        error: error.message,
      };
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  /**
   * Rollback migration
   */
  async rollback(migrationName: string): Promise<MigrationResult> {
    try {
      print(
        `🔄 Rolling back migration: ${migrationName}`,
        OutputType.INFORMATION
      );

      const migration = this.migrations.get(migrationName);
      if (!migration) {
        throw new Error(`Migration ${migrationName} not found`);
      }

      const migrationRecord = await Migration.findOne({ name: migrationName });
      if (!migrationRecord || migrationRecord.status !== "SUCCESS") {
        throw new Error(`Migration ${migrationName} is not applied or failed`);
      }

      const context: MigrationContext = {
        startTime: new Date(),
      };

      let session: mongoose.ClientSession | null = null;

      try {
        session = await mongoose.startSession();
        session.startTransaction();

        // Execute rollback
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error("Rollback timeout")),
            this.config.timeoutMs
          );
        });

        await Promise.race([migration.down(), timeoutPromise]);

        context.endTime = new Date();
        context.executionTimeMs =
          context.endTime.getTime() - context.startTime.getTime();

        // Remove migration record
        await Migration.deleteOne({ name: migrationName }, { session });

        await session.commitTransaction();

        print(
          `✅ Rollback ${migrationName} completed in ${context.executionTimeMs}ms`,
          OutputType.SUCCESS
        );

        return {
          success: true,
          executionTimeMs: context.executionTimeMs,
        };
      } catch (error: any) {
        if (session && session.inTransaction()) {
          await session.abortTransaction();
        }
        throw error;
      } finally {
        if (session) {
          await session.endSession();
        }
      }
    } catch (error: any) {
      print(
        `❌ Rollback ${migrationName} failed: ${error.message}`,
        OutputType.ERROR
      );
      return {
        success: false,
        executionTimeMs: 0,
        error: error.message,
      };
    }
  }

  /**
   * Reset all migrations (WARNING: This will rollback all migrations)
   */
  async reset(): Promise<void> {
    try {
      print("⚠️ Resetting all migrations...", OutputType.WARNING);

      const appliedMigrations = await Migration.find({
        status: "SUCCESS",
      }).sort({ appliedAt: -1 }); // Rollback in reverse order

      for (const migrationRecord of appliedMigrations) {
        const migration = this.migrations.get(migrationRecord.name);
        if (migration) {
          await this.rollback(migration.name);
        } else {
          print(
            `⚠️ Migration file not found for ${migrationRecord.name}, removing record only`,
            OutputType.WARNING
          );
          await Migration.deleteOne({ name: migrationRecord.name });
        }
      }

      print("✅ All migrations have been reset", OutputType.SUCCESS);
    } catch (error: any) {
      throw new DatabaseError(`Failed to reset migrations: ${error.message}`);
    }
  }

  /**
   * Create new migration file template
   */
  async createMigration(name: string, description: string): Promise<string> {
    try {
      const timestamp = new Date()
        .toISOString()
        .replace(/[:\-T]/g, "")
        .split(".")[0];
      const version = `${timestamp}`;
      const filename = `${version}_${name
        .toLowerCase()
        .replace(/\s+/g, "_")}.ts`;
      const filePath = path.join(this.config.migrationsPath, filename);

      const template = this.generateMigrationTemplate(
        name,
        version,
        description
      );

      // Ensure migrations directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      await fs.writeFile(filePath, template, "utf8");

      print(`✅ Created migration file: ${filename}`, OutputType.SUCCESS);

      return filePath;
    } catch (error: any) {
      throw new DatabaseError(`Failed to create migration: ${error.message}`);
    }
  }

  /**
   * Generate migration template
   */
  private generateMigrationTemplate(
    name: string,
    version: string,
    description: string
  ): string {
    return `import mongoose from 'mongoose';
import { IMigration } from '../types';

/**
 * Migration: ${name}
 * Version: ${version}
 * Description: ${description}
 * Created: ${new Date().toISOString()}
 */
const migration: IMigration = {
  name: '${name}',
  version: '${version}',
  description: '${description}',

  /**
   * Apply migration
   */
  async up(): Promise<void> {
    try {
      // Add your migration logic here
      console.log('Running migration: ${name}');
      
      // Example: Create new collection
      // await mongoose.connection.db.createCollection('new_collection');
      
      // Example: Add index
      // await mongoose.connection.collection('users').createIndex({ email: 1 }, { unique: true });
      
      // Example: Update documents
      // await mongoose.connection.collection('products').updateMany(
      //   {},
      //   { $set: { newField: 'defaultValue' } }
      // );
      
      console.log('Migration ${name} completed successfully');
    } catch (error: any) {
      console.error('Migration ${name} failed:', error.message);
      throw error;
    }
  },

  /**
   * Rollback migration
   */
  async down(): Promise<void> {
    try {
      // Add your rollback logic here
      console.log('Rolling back migration: ${name}');
      
      // Example: Drop collection
      // await mongoose.connection.db.dropCollection('new_collection');
      
      // Example: Drop index
      // await mongoose.connection.collection('users').dropIndex('email_1');
      
      // Example: Remove field from documents
      // await mongoose.connection.collection('products').updateMany(
      //   {},
      //   { $unset: { newField: 1 } }
      // );
      
      console.log('Rollback ${name} completed successfully');
    } catch (error: any) {
      console.error('Rollback ${name} failed:', error.message);
      throw error;
    }
  },
};

export default migration;
`;
  }

  /**
   * Get migration file information
   */
  async getMigrationFiles(): Promise<MigrationFileInfo[]> {
    try {
      const migrationsDir = path.resolve(this.config.migrationsPath);
      const files = await fs.readdir(migrationsDir);
      const migrationFiles = files.filter(
        (file) => file.endsWith(".js") || file.endsWith(".ts")
      );

      const fileInfos: MigrationFileInfo[] = [];

      for (const file of migrationFiles) {
        const filePath = path.join(migrationsDir, file);
        const content = await fs.readFile(filePath, "utf8");
        const checksum = generateChecksum(content);

        // Extract version and name from filename
        const match = file.match(/^(\d+)_(.+)\.(ts|js)$/);
        if (match) {
          const [, version, name] = match;

          fileInfos.push({
            filename: file,
            version,
            name: name.replace(/_/g, " "),
            description: "Auto-generated description",
            checksum,
            filePath,
          });
        }
      }

      return fileInfos.sort((a, b) => a.version.localeCompare(b.version));
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to get migration files: ${error.message}`
      );
    }
  }
}
