import mongoose from "mongoose";

/**
 * Database Migration Schema
 * Tracks which migrations have been applied
 */
const migrationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    version: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    executionTimeMs: {
      type: Number,
      required: true,
    },
    checksum: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED", "PENDING"],
      default: "PENDING",
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
migrationSchema.index({ name: 1 });
migrationSchema.index({ version: 1 });
migrationSchema.index({ appliedAt: 1 });

const Migration = mongoose.model("Migration", migrationSchema);

export default Migration;
