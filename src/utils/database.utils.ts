import mongoose, {
  Document,
  Query,
  PopulateOptions,
  PipelineStage,
} from "mongoose";
import { OutputType, print } from "../helpers/print";

interface IndexConfig {
  fields: Record<string, 1 | -1>;
  options?: {
    unique?: boolean;
    sparse?: boolean;
    background?: boolean;
    name?: string;
  };
}

interface QueryOptimization {
  select?: string;
  populate?: string | PopulateOptions | (string | PopulateOptions)[];
  lean?: boolean;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}

/**
 * Database query performance monitor
 */
export class DatabaseMonitor {
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
          `Slow database query detected: ${queryId} - ${duration}ms`,
          OutputType.WARNING
        );
      }

      this.queryTimes.delete(queryId);
    }
  }
}

/**
 * Database optimization utilities
 */
export class DatabaseOptimizer {
  /**
   * Create optimized query with lean, select, and populate
   */
  static optimizeQuery<T extends Document>(
    query: Query<T[], T>,
    optimization: QueryOptimization = {}
  ): Query<any, T> {
    const { select, populate, lean = true, limit, sort } = optimization;

    let optimizedQuery: Query<any, T> = query;

    // Apply lean for better performance (returns plain objects)
    if (lean) {
      optimizedQuery = optimizedQuery.lean();
    }

    // Select only required fields
    if (select) {
      optimizedQuery = optimizedQuery.select(select);
    }

    // Apply population if needed
    if (populate) {
      if (typeof populate === "string") {
        optimizedQuery = optimizedQuery.populate(populate);
      } else {
        optimizedQuery = optimizedQuery.populate(
          populate as PopulateOptions | (string | PopulateOptions)[]
        );
      }
    }

    // Apply sorting
    if (sort) {
      optimizedQuery = optimizedQuery.sort(sort);
    }

    // Apply limit
    if (limit) {
      optimizedQuery = optimizedQuery.limit(limit);
    }

    return optimizedQuery;
  }

  /**
   * Execute paginated query with optimization
   */
  static async paginatedQuery<T extends Document>(
    model: mongoose.Model<T>,
    filter: object = {},
    options: {
      page?: number;
      limit?: number;
      select?: string;
      populate?: string | PopulateOptions | (string | PopulateOptions)[];
      sort?: Record<string, 1 | -1>;
    } = {}
  ): Promise<{
    data: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const queryId = DatabaseMonitor.startQuery(`paginated-${model.modelName}`);

    try {
      // Count total documents
      const total = await model.countDocuments(filter);

      // Execute main query with optimizations
      let query = model.find(filter).skip(skip).limit(limit).lean();

      if (options.select) {
        query = query.select(options.select);
      }

      if (options.populate) {
        if (typeof options.populate === "string") {
          query = query.populate(options.populate);
        } else {
          query = query.populate(
            options.populate as PopulateOptions | (string | PopulateOptions)[]
          );
        }
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
    } finally {
      DatabaseMonitor.endQuery(queryId);
    }
  }

  /**
   * Bulk operations for better performance
   */
  static async bulkWrite<T extends Document>(
    model: mongoose.Model<T>,
    operations: any[],
    options: {
      ordered?: boolean;
      bypassDocumentValidation?: boolean;
    } = {}
  ): Promise<any> {
    const queryId = DatabaseMonitor.startQuery(`bulk-${model.modelName}`);

    try {
      return await model.bulkWrite(operations, {
        ordered: false,
        bypassDocumentValidation: false,
        ...options,
      });
    } finally {
      DatabaseMonitor.endQuery(queryId);
    }
  }

  /**
   * Aggregation pipeline with performance monitoring
   */
  static async aggregate<T extends Document>(
    model: mongoose.Model<T>,
    pipeline: PipelineStage[],
    options: {
      allowDiskUse?: boolean;
      maxTimeMS?: number;
    } = {}
  ): Promise<any[]> {
    const queryId = DatabaseMonitor.startQuery(`aggregate-${model.modelName}`);

    try {
      return await model.aggregate(pipeline, {
        allowDiskUse: true,
        maxTimeMS: 30000,
        ...options,
      });
    } finally {
      DatabaseMonitor.endQuery(queryId);
    }
  }

  /**
   * Create indexes for better query performance
   */
  static async createIndexes<T extends Document>(
    model: mongoose.Model<T>,
    indexes: IndexConfig[]
  ): Promise<void> {
    print(`Creating indexes for ${model.modelName}...`, OutputType.SUCCESS);

    for (const index of indexes) {
      try {
        await model.collection.createIndex(index.fields, index.options);
        print(
          `Index created: ${JSON.stringify(index.fields)}`,
          OutputType.SUCCESS
        );
      } catch (error) {
        print(
          `Failed to create index ${JSON.stringify(index.fields)}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          OutputType.ERROR
        );
      }
    }
  }

  /**
   * Analyze query performance
   */
  static async explainQuery<T extends Document>(
    query: Query<any, T>,
    executionMode:
      | "queryPlanner"
      | "executionStats"
      | "allPlansExecution" = "executionStats"
  ): Promise<any> {
    return await query.explain(executionMode);
  }

  /**
   * Get database statistics
   */
  static async getDatabaseStats(): Promise<{
    collections: number;
    dataSize: number;
    indexSize: number;
    storageSize: number;
    objects: number;
  }> {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection is not established.");
    }

    const stats = await db.stats();

    return {
      collections: stats.collections,
      dataSize: stats.dataSize,
      indexSize: stats.indexSize,
      storageSize: stats.storageSize,
      objects: stats.objects,
    };
  }

  /**
   * Optimize collection by creating recommended indexes
   */
  static async optimizeCollection<T extends Document>(
    model: mongoose.Model<T>,
    commonQueries: Array<{
      filter: object;
      sort?: object;
    }>
  ): Promise<void> {
    print(`Optimizing collection: ${model.modelName}`, OutputType.SUCCESS);

    const recommendedIndexes: IndexConfig[] = [];

    // Analyze common queries to suggest indexes
    for (const query of commonQueries) {
      const filterFields = Object.keys(query.filter);
      const sortFields = query.sort ? Object.keys(query.sort) : [];

      // Create compound index for filter + sort fields
      if (filterFields.length > 0) {
        const indexFields: Record<string, 1 | -1> = {};

        // Add filter fields first
        filterFields.forEach((field) => {
          indexFields[field] = 1;
        });

        // Add sort fields
        sortFields.forEach((field) => {
          if (query.sort && !indexFields[field]) {
            const sortValue = (query.sort as Record<string, 1 | -1>)[field];
            indexFields[field] = sortValue || 1;
          }
        });

        recommendedIndexes.push({
          fields: indexFields,
          options: {
            background: true,
            name: `idx_${filterFields.join("_")}_${sortFields.join("_")}`,
          },
        });
      }
    }

    // Remove duplicates
    const uniqueIndexes = recommendedIndexes.filter(
      (index, i, arr) =>
        arr.findIndex(
          (idx) => JSON.stringify(idx.fields) === JSON.stringify(index.fields)
        ) === i
    );

    await this.createIndexes(model, uniqueIndexes);
  }
}

/**
 * Connection pool monitoring
 */
export class ConnectionPoolMonitor {
  static getPoolStats(): object {
    const connection = mongoose.connection;

    return {
      readyState: connection.readyState,
      name: connection.name,
      host: connection.host,
      port: connection.port,
      collections: Object.keys(connection.collections).length,
    };
  }

  static async testConnection(): Promise<boolean> {
    try {
      if (!mongoose.connection.db) {
        throw new Error("Database connection is not established.");
      }
      await mongoose.connection.db.admin().ping();
      return true;
    } catch (error) {
      print(
        `Database connection test failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        OutputType.ERROR
      );
      return false;
    }
  }
}
