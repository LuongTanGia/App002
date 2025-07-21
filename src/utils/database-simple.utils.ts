import mongoose from "mongoose";
import { OutputType, print } from "../helpers/print";

/**
 * Simplified Database utilities for performance optimization
 */
export class DatabaseUtils {
  /**
   * Execute paginated query
   */
  static async paginatedQuery(
    model: any,
    filter: object = {},
    options: {
      page?: number;
      limit?: number;
      select?: string;
      sort?: Record<string, 1 | -1>;
    } = {}
  ): Promise<any> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    try {
      // Count total documents
      const total = await model.countDocuments(filter);

      // Execute main query with optimizations
      let query = model.find(filter).skip(skip).limit(limit).lean();

      if (options.select) {
        query = query.select(options.select);
      }

      if (options.sort) {
        query = query.sort(options.sort);
      }

      const data = await query.exec();
      const pages = Math.ceil(total / limit);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      print(
        `Database query error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        OutputType.ERROR
      );
      throw error;
    }
  }

  /**
   * Bulk operations for better performance
   */
  static async bulkWrite(model: any, operations: any[]): Promise<any> {
    try {
      return await model.bulkWrite(operations, {
        ordered: false,
      });
    } catch (error) {
      print(
        `Bulk write error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        OutputType.ERROR
      );
      throw error;
    }
  }

  /**
   * Aggregation pipeline
   */
  static async aggregate(model: any, pipeline: any[]): Promise<any[]> {
    try {
      return await model.aggregate(pipeline);
    } catch (error) {
      print(
        `Aggregation error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        OutputType.ERROR
      );
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  static async getDatabaseStats(): Promise<any> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not available");
      }

      const stats = await db.stats();
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        indexSize: stats.indexSize,
        storageSize: stats.storageSize,
        objects: stats.objects,
      };
    } catch (error) {
      print(
        `Database stats error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        OutputType.ERROR
      );
      throw error;
    }
  }
}

/**
 * Query performance monitor
 */
export class QueryMonitor {
  private static queryTimes: Map<string, number> = new Map();

  static startQuery(queryName: string): string {
    const queryId = `${queryName}-${Date.now()}-${Math.random()}`;
    this.queryTimes.set(queryId, Date.now());
    return queryId;
  }

  static endQuery(queryId: string): void {
    const startTime = this.queryTimes.get(queryId);
    if (startTime) {
      const duration = Date.now() - startTime;

      if (duration > 500) {
        print(
          `Slow query detected: ${queryId} - ${duration}ms`,
          OutputType.WARNING
        );
      }

      this.queryTimes.delete(queryId);
    }
  }
}

/**
 * Connection monitoring
 */
export class ConnectionMonitor {
  static getConnectionStats(): object {
    const connection = mongoose.connection;

    return {
      readyState: this.getReadyStateString(connection.readyState),
      name: connection.name,
      host: connection.host,
      port: connection.port,
    };
  }

  static async testConnection(): Promise<boolean> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        return false;
      }

      await db.admin().ping();
      return true;
    } catch (error) {
      print(
        `Connection test failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        OutputType.ERROR
      );
      return false;
    }
  }

  private static getReadyStateString(state: number): string {
    const states = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };
    return states[state as keyof typeof states] || "unknown";
  }
}
