import crypto from "crypto";

/**
 * Interface for migration structure
 */
export interface IMigration {
  name: string;
  version: string;
  description: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

/**
 * Migration execution result
 */
export interface MigrationResult {
  success: boolean;
  executionTimeMs: number;
  error?: string;
}

/**
 * Migration status
 */
export interface MigrationStatus {
  name: string;
  version: string;
  description: string;
  applied: boolean;
  appliedAt?: Date;
  status: "SUCCESS" | "FAILED" | "PENDING";
  errorMessage?: string;
}

/**
 * Migration configuration
 */
export interface MigrationConfig {
  migrationsPath: string;
  collectionName: string;
  autoRun: boolean;
  validateChecksums: boolean;
  timeoutMs: number;
}

/**
 * Default migration configuration
 */
export const DEFAULT_MIGRATION_CONFIG: MigrationConfig = {
  migrationsPath: "src/migrations/scripts",
  collectionName: "migrations",
  autoRun: false,
  validateChecksums: true,
  timeoutMs: 60000, // 1 minute timeout
};

/**
 * Generate checksum for migration content
 */
export function generateChecksum(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Migration execution context
 */
export interface MigrationContext {
  startTime: Date;
  endTime?: Date;
  executionTimeMs?: number;
}

/**
 * Migration validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Migration file metadata
 */
export interface MigrationFileInfo {
  filename: string;
  version: string;
  name: string;
  description: string;
  checksum: string;
  filePath: string;
}
