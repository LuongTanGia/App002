// Database Migrations Module
// Provides database migration functionality for schema changes and data transformations

export { MigrationManager } from "./migrationManager";
export { MigrationService, getMigrationService } from "./migrationService";
export * from "./types";
export { default as Migration } from "./migration.model";

/**
 * Migration Module Usage Examples:
 *
 * 1. Using Migration Service (Recommended):
 * ```typescript
 * import { getMigrationService } from './migrations';
 *
 * const migrationService = getMigrationService();
 * await migrationService.initialize();
 * await migrationService.runOnStartup(); // Check and optionally run migrations
 * ```
 *
 * 2. Using Migration Manager directly:
 * ```typescript
 * import { MigrationManager } from './migrations';
 *
 * const manager = new MigrationManager({
 *   migrationsPath: 'src/migrations/scripts',
 *   autoRun: false
 * });
 *
 * await manager.initialize();
 * const results = await manager.migrate();
 * ```
 *
 * 3. CLI Usage:
 * ```bash
 * npm run migrate              # Run pending migrations
 * npm run migrate:status       # Show migration status
 * npm run migrate:create "Add user roles"  # Create new migration
 * npm run migrate:down "migration-name"    # Rollback migration
 * npm run migrate:validate     # Validate migration files
 * ```
 *
 * 4. Environment Variables:
 * - AUTO_MIGRATE=true     # Auto-run migrations on startup (development only)
 * - MONGO_URI            # MongoDB connection string (required)
 *
 * 5. Creating Migrations:
 * Migration files should be placed in src/migrations/scripts/ and follow the pattern:
 * YYYYMMDDHHMMSS_descriptive_name.ts
 *
 * Each migration must export a default object implementing IMigration interface:
 * ```typescript
 * import { IMigration } from '../types';
 *
 * const migration: IMigration = {
 *   name: 'Add User Roles',
 *   version: '20250721120000',
 *   description: 'Add role field to users collection',
 *
 *   async up() {
 *     // Apply migration
 *     await mongoose.connection.collection('users').updateMany(
 *       {},
 *       { $set: { role: 'user' } }
 *     );
 *   },
 *
 *   async down() {
 *     // Rollback migration
 *     await mongoose.connection.collection('users').updateMany(
 *       {},
 *       { $unset: { role: 1 } }
 *     );
 *   }
 * };
 *
 * export default migration;
 * ```
 */
