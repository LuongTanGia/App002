import { MigrationManager } from "./migrationManager";
import { OutputType, print } from "../helpers/print";
import { DatabaseError } from "../errors/AppError";
import path from "path";

/**
 * Migration Service
 * Integrates migrations into the application lifecycle
 */
export class MigrationService {
  private migrationManager: MigrationManager;
  private isInitialized: boolean = false;

  constructor() {
    this.migrationManager = new MigrationManager({
      migrationsPath: path.join(__dirname, "scripts"),
      autoRun: false, // Don't auto-run on startup by default
      validateChecksums: true,
      timeoutMs: 60000,
    });
  }

  /**
   * Initialize migration service
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      await this.migrationManager.initialize();
      this.isInitialized = true;

      print("✅ Migration service initialized", OutputType.SUCCESS);
    } catch (error: any) {
      throw new DatabaseError(
        `Migration service initialization failed: ${error.message}`
      );
    }
  }

  /**
   * Check if there are pending migrations
   */
  async hasPendingMigrations(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const pendingMigrations =
        await this.migrationManager.getPendingMigrations();
      return pendingMigrations.length > 0;
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to check pending migrations: ${error.message}`
      );
    }
  }

  /**
   * Get migration status summary
   */
  async getStatusSummary(): Promise<{
    total: number;
    applied: number;
    pending: number;
    failed: number;
  }> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const status = await this.migrationManager.getStatus();
      const applied = status.filter(
        (m) => m.applied && m.status === "SUCCESS"
      ).length;
      const failed = status.filter((m) => m.status === "FAILED").length;
      const pending = status.filter((m) => !m.applied).length;

      return {
        total: status.length,
        applied,
        pending,
        failed,
      };
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to get migration status summary: ${error.message}`
      );
    }
  }

  /**
   * Run all pending migrations
   */
  async runPendingMigrations(): Promise<{
    success: boolean;
    migrationsRun: number;
  }> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const pendingMigrations =
        await this.migrationManager.getPendingMigrations();

      if (pendingMigrations.length === 0) {
        print("✅ No pending migrations to run", OutputType.SUCCESS);
        return { success: true, migrationsRun: 0 };
      }

      print(
        `🚀 Running ${pendingMigrations.length} pending migrations...`,
        OutputType.INFORMATION
      );

      const results = await this.migrationManager.migrate();
      const successCount = results.filter((r) => r.success).length;

      if (successCount === results.length) {
        print(
          `✅ All ${successCount} migrations completed successfully`,
          OutputType.SUCCESS
        );
        return { success: true, migrationsRun: successCount };
      } else {
        print(
          `⚠️ ${successCount}/${results.length} migrations completed successfully`,
          OutputType.WARNING
        );
        return { success: false, migrationsRun: successCount };
      }
    } catch (error: any) {
      print(
        `❌ Migration execution failed: ${error.message}`,
        OutputType.ERROR
      );
      throw new DatabaseError(`Failed to run migrations: ${error.message}`);
    }
  }

  /**
   * Check migration health and warn about issues
   */
  async checkMigrationHealth(): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const summary = await this.getStatusSummary();

      // Log migration status
      if (summary.pending > 0) {
        print(
          `⚠️ Warning: ${summary.pending} pending migration(s) found`,
          OutputType.WARNING
        );
        print(
          '   Run "npm run migrate" to apply pending migrations',
          OutputType.INFORMATION
        );
      }

      if (summary.failed > 0) {
        print(
          `❌ Error: ${summary.failed} migration(s) failed`,
          OutputType.ERROR
        );
        print(
          "   Check migration logs and fix failed migrations",
          OutputType.INFORMATION
        );
      }

      if (summary.pending === 0 && summary.failed === 0) {
        print(
          `✅ Migration health check passed (${summary.applied} applied)`,
          OutputType.SUCCESS
        );
      }
    } catch (error: any) {
      print(
        `❌ Migration health check failed: ${error.message}`,
        OutputType.ERROR
      );
    }
  }

  /**
   * Run migrations on application startup (if configured)
   */
  async runOnStartup(): Promise<void> {
    try {
      // Check environment variable to determine if migrations should auto-run
      const autoMigrate = process.env.AUTO_MIGRATE === "true";
      const nodeEnv = process.env.NODE_ENV;

      if (!autoMigrate) {
        // Just check health, don't auto-run
        await this.checkMigrationHealth();
        return;
      }

      // Only auto-run in development environment
      if (nodeEnv !== "development") {
        print(
          "⚠️ AUTO_MIGRATE is enabled but not in development environment",
          OutputType.WARNING
        );
        print(
          "   Migrations will not run automatically in production",
          OutputType.WARNING
        );
        await this.checkMigrationHealth();
        return;
      }

      print(
        "🔄 AUTO_MIGRATE enabled - checking for pending migrations...",
        OutputType.INFORMATION
      );

      const hasPending = await this.hasPendingMigrations();

      if (hasPending) {
        print("🚀 Auto-running pending migrations...", OutputType.INFORMATION);
        const result = await this.runPendingMigrations();

        if (!result.success) {
          print("❌ Some migrations failed during auto-run", OutputType.ERROR);
          print(
            "   Please check logs and run migrations manually",
            OutputType.WARNING
          );
        }
      } else {
        print("✅ No pending migrations found", OutputType.SUCCESS);
      }
    } catch (error: any) {
      print(
        `❌ Migration startup check failed: ${error.message}`,
        OutputType.ERROR
      );
      print(
        "   Application will continue but database may be out of sync",
        OutputType.WARNING
      );
    }
  }

  /**
   * Create a new migration (utility method)
   */
  async createMigration(
    name: string,
    description: string = "Auto-generated migration"
  ): Promise<string> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      return await this.migrationManager.createMigration(name, description);
    } catch (error: any) {
      throw new DatabaseError(`Failed to create migration: ${error.message}`);
    }
  }

  /**
   * Get the migration manager instance (for advanced usage)
   */
  getMigrationManager(): MigrationManager {
    return this.migrationManager;
  }
}

// Singleton instance
let migrationServiceInstance: MigrationService | null = null;

/**
 * Get singleton migration service instance
 */
export function getMigrationService(): MigrationService {
  if (!migrationServiceInstance) {
    migrationServiceInstance = new MigrationService();
  }
  return migrationServiceInstance;
}
