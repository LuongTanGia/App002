#!/usr/bin/env node

import { Command } from "commander";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { MigrationManager } from "./migrationManager";
import { OutputType, print } from "../helpers/print";

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name("migrate")
  .description("Database migration CLI tool")
  .version("1.0.0");

/**
 * Connect to database
 */
async function connectDatabase(): Promise<void> {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI environment variable is required");
    }

    await mongoose.connect(mongoUri);
    print("Connected to database successfully", OutputType.SUCCESS);
  } catch (error: any) {
    print(`Failed to connect to database: ${error.message}`, OutputType.ERROR);
    process.exit(1);
  }
}

/**
 * Disconnect from database
 */
async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  print("Disconnected from database", OutputType.INFORMATION);
}

/**
 * Run migrations
 */
program
  .command("up")
  .description("Run all pending migrations")
  .option(
    "-d, --dry-run",
    "Show which migrations would run without executing them"
  )
  .action(async (options) => {
    try {
      await connectDatabase();

      const migrationManager = new MigrationManager({
        migrationsPath: path.join(__dirname, "scripts"),
      });

      await migrationManager.initialize();

      if (options.dryRun) {
        print(
          "🔍 Dry run mode - showing pending migrations:",
          OutputType.INFORMATION
        );
        const pending = await migrationManager.getPendingMigrations();

        if (pending.length === 0) {
          print("✅ No pending migrations found", OutputType.SUCCESS);
        } else {
          pending.forEach((migration, index) => {
            print(
              `${index + 1}. ${migration.name} (v${migration.version})`,
              OutputType.INFORMATION
            );
            print(
              `   Description: ${migration.description}`,
              OutputType.INFORMATION
            );
          });
        }
      } else {
        const results = await migrationManager.migrate();

        if (results.length === 0) {
          print("✅ No pending migrations to run", OutputType.SUCCESS);
        } else {
          const successCount = results.filter((r) => r.success).length;
          print(
            `🎉 Migration completed: ${successCount}/${results.length} successful`,
            OutputType.SUCCESS
          );

          if (successCount < results.length) {
            process.exit(1);
          }
        }
      }
    } catch (error: any) {
      print(`❌ Migration failed: ${error.message}`, OutputType.ERROR);
      process.exit(1);
    } finally {
      await disconnectDatabase();
    }
  });

/**
 * Show migration status
 */
program
  .command("status")
  .description("Show migration status")
  .action(async () => {
    try {
      await connectDatabase();

      const migrationManager = new MigrationManager({
        migrationsPath: path.join(__dirname, "scripts"),
      });

      await migrationManager.initialize();
      const status = await migrationManager.getStatus();

      if (status.length === 0) {
        print("No migrations found", OutputType.INFORMATION);
        return;
      }

      print("📋 Migration Status:", OutputType.INFORMATION);
      print("=".repeat(80), OutputType.INFORMATION);

      status.forEach((migration) => {
        const statusIcon = migration.applied ? "✅" : "⏳";
        const statusText = migration.applied ? "APPLIED" : "PENDING";

        print(
          `${statusIcon} ${migration.name} (v${migration.version}) - ${statusText}`,
          migration.applied ? OutputType.SUCCESS : OutputType.WARNING
        );
        print(
          `   Description: ${migration.description}`,
          OutputType.INFORMATION
        );

        if (migration.applied && migration.appliedAt) {
          print(
            `   Applied: ${migration.appliedAt.toISOString()}`,
            OutputType.INFORMATION
          );
        }

        if (migration.status === "FAILED" && migration.errorMessage) {
          print(`   Error: ${migration.errorMessage}`, OutputType.ERROR);
        }

        print("", OutputType.INFORMATION); // Empty line
      });

      const appliedCount = status.filter((m) => m.applied).length;
      const pendingCount = status.length - appliedCount;

      print(
        `📊 Summary: ${appliedCount} applied, ${pendingCount} pending`,
        OutputType.INFORMATION
      );
    } catch (error: any) {
      print(
        `❌ Failed to get migration status: ${error.message}`,
        OutputType.ERROR
      );
      process.exit(1);
    } finally {
      await disconnectDatabase();
    }
  });

/**
 * Rollback migration
 */
program
  .command("down <migration>")
  .description("Rollback a specific migration")
  .action(async (migrationName) => {
    try {
      await connectDatabase();

      const migrationManager = new MigrationManager({
        migrationsPath: path.join(__dirname, "scripts"),
      });

      await migrationManager.initialize();

      print(`🔄 Rolling back migration: ${migrationName}`, OutputType.WARNING);
      const result = await migrationManager.rollback(migrationName);

      if (result.success) {
        print(
          `✅ Rollback completed in ${result.executionTimeMs}ms`,
          OutputType.SUCCESS
        );
      } else {
        print(`❌ Rollback failed: ${result.error}`, OutputType.ERROR);
        process.exit(1);
      }
    } catch (error: any) {
      print(`❌ Rollback failed: ${error.message}`, OutputType.ERROR);
      process.exit(1);
    } finally {
      await disconnectDatabase();
    }
  });

/**
 * Reset all migrations
 */
program
  .command("reset")
  .description(
    "Reset all migrations (WARNING: This will rollback all migrations)"
  )
  .option("-y, --yes", "Skip confirmation prompt")
  .action(async (options) => {
    try {
      if (!options.yes) {
        print(
          "⚠️  WARNING: This will rollback ALL migrations!",
          OutputType.WARNING
        );
        print(
          "This action cannot be undone. Make sure you have a database backup.",
          OutputType.WARNING
        );
        print(
          "Use --yes flag to skip this confirmation.",
          OutputType.INFORMATION
        );
        return;
      }

      await connectDatabase();

      const migrationManager = new MigrationManager({
        migrationsPath: path.join(__dirname, "scripts"),
      });

      await migrationManager.initialize();
      await migrationManager.reset();

      print("✅ All migrations have been reset", OutputType.SUCCESS);
    } catch (error: any) {
      print(`❌ Reset failed: ${error.message}`, OutputType.ERROR);
      process.exit(1);
    } finally {
      await disconnectDatabase();
    }
  });

/**
 * Create new migration
 */
program
  .command("create <name>")
  .description("Create a new migration file")
  .option(
    "-d, --description <description>",
    "Migration description",
    "Auto-generated migration"
  )
  .action(async (name, options) => {
    try {
      const migrationManager = new MigrationManager({
        migrationsPath: path.join(__dirname, "scripts"),
      });

      const filePath = await migrationManager.createMigration(
        name,
        options.description
      );
      print(`✅ Created migration file: ${filePath}`, OutputType.SUCCESS);
      print(
        `📝 Edit the file to add your migration logic`,
        OutputType.INFORMATION
      );
    } catch (error: any) {
      print(
        `❌ Failed to create migration: ${error.message}`,
        OutputType.ERROR
      );
      process.exit(1);
    }
  });

/**
 * Validate migrations
 */
program
  .command("validate")
  .description("Validate all migration files")
  .action(async () => {
    try {
      const migrationManager = new MigrationManager({
        migrationsPath: path.join(__dirname, "scripts"),
      });

      await migrationManager.initialize();
      const fileInfos = await migrationManager.getMigrationFiles();

      print("🔍 Validating migration files...", OutputType.INFORMATION);
      print("=".repeat(60), OutputType.INFORMATION);

      let hasErrors = false;

      for (const fileInfo of fileInfos) {
        print(`📄 ${fileInfo.filename}`, OutputType.INFORMATION);
        print(`   Version: ${fileInfo.version}`, OutputType.INFORMATION);
        print(`   Name: ${fileInfo.name}`, OutputType.INFORMATION);
        print(
          `   Checksum: ${fileInfo.checksum.substring(0, 16)}...`,
          OutputType.INFORMATION
        );

        // Basic validation passed if we can load the file
        print(`   Status: ✅ Valid`, OutputType.SUCCESS);
        print("", OutputType.INFORMATION);
      }

      if (!hasErrors) {
        print(
          `✅ All ${fileInfos.length} migration files are valid`,
          OutputType.SUCCESS
        );
      }
    } catch (error: any) {
      print(`❌ Validation failed: ${error.message}`, OutputType.ERROR);
      process.exit(1);
    }
  });

// Handle uncaught errors
process.on("uncaughtException", async (error) => {
  print(`💥 Uncaught exception: ${error.message}`, OutputType.ERROR);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});

process.on("unhandledRejection", async (error: any) => {
  print(`💥 Unhandled rejection: ${error.message}`, OutputType.ERROR);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});

// Parse command line arguments
program.parse();
