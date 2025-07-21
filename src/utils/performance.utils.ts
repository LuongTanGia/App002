import { FastifyRequest, FastifyReply } from "fastify";
import { OutputType, print } from "../helpers/print";

interface PerformanceMetrics {
  requestCount: number;
  responseTime: {
    avg: number;
    min: number;
    max: number;
  };
  errorRate: number;
  activeConnections: number;
  memoryUsage: NodeJS.MemoryUsage;
}

interface RequestTiming {
  startTime: number;
  endTime?: number;
  duration?: number;
  path: string;
  method: string;
  statusCode?: number;
}

export class PerformanceMonitor {
  private static metrics: PerformanceMetrics = {
    requestCount: 0,
    responseTime: {
      avg: 0,
      min: Infinity,
      max: 0,
    },
    errorRate: 0,
    activeConnections: 0,
    memoryUsage: process.memoryUsage(),
  };

  private static requestTimings: Map<string, RequestTiming> = new Map();
  private static responseTimes: number[] = [];
  private static errorCount = 0;

  /**
   * Start timing a request
   */
  static startTiming(req: FastifyRequest): void {
    const requestId = this.generateRequestId(req);
    const timing: RequestTiming = {
      startTime: Date.now(),
      path: req.url,
      method: req.method,
    };

    this.requestTimings.set(requestId, timing);
    this.metrics.requestCount++;
    this.metrics.activeConnections++;
  }

  /**
   * End timing a request and calculate metrics
   */
  static endTiming(req: FastifyRequest, reply: FastifyReply): void {
    const requestId = this.generateRequestId(req);
    const timing = this.requestTimings.get(requestId);

    if (timing) {
      timing.endTime = Date.now();
      timing.duration = timing.endTime - timing.startTime;
      timing.statusCode = reply.statusCode;

      // Update response time metrics
      this.updateResponseTimeMetrics(timing.duration);

      // Update error rate
      if (reply.statusCode >= 400) {
        this.errorCount++;
      }

      this.metrics.errorRate =
        (this.errorCount / this.metrics.requestCount) * 100;
      this.metrics.activeConnections--;

      // Log slow requests
      if (timing.duration > 1000) {
        print(
          `Slow request detected: ${timing.method} ${timing.path} - ${timing.duration}ms`,
          OutputType.WARNING
        );
      }

      this.requestTimings.delete(requestId);
    }
  }

  /**
   * Get current performance metrics
   */
  static getMetrics(): PerformanceMetrics {
    this.metrics.memoryUsage = process.memoryUsage();
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      requestCount: 0,
      responseTime: {
        avg: 0,
        min: Infinity,
        max: 0,
      },
      errorRate: 0,
      activeConnections: 0,
      memoryUsage: process.memoryUsage(),
    };
    this.responseTimes = [];
    this.errorCount = 0;
  }

  /**
   * Log performance summary
   */
  static logSummary(): void {
    const metrics = this.getMetrics();
    const memoryMB = Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024);

    print(
      `Performance Summary:
      - Total Requests: ${metrics.requestCount}
      - Average Response Time: ${metrics.responseTime.avg.toFixed(2)}ms
      - Error Rate: ${metrics.errorRate.toFixed(2)}%
      - Active Connections: ${metrics.activeConnections}
      - Memory Usage: ${memoryMB}MB`,
      OutputType.SUCCESS
    );
  }

  /**
   * Performance monitoring middleware
   */
  static middleware() {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      this.startTiming(req);

      // Hook to end timing when response is sent
      reply.raw.on("finish", () => {
        this.endTiming(req, reply);
      });
    };
  }

  /**
   * Health check endpoint with performance data
   */
  static getHealthCheck(): object {
    const metrics = this.getMetrics();
    const uptime = process.uptime();

    return {
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
      performance: {
        requestsPerSecond: Math.round(metrics.requestCount / uptime),
        avgResponseTime: `${metrics.responseTime.avg.toFixed(2)}ms`,
        errorRate: `${metrics.errorRate.toFixed(2)}%`,
        memoryUsage: `${Math.round(
          metrics.memoryUsage.heapUsed / 1024 / 1024
        )}MB`,
        activeConnections: metrics.activeConnections,
      },
      version: "1.0.0",
    };
  }

  private static generateRequestId(req: FastifyRequest): string {
    return `${req.method}-${req.url}-${Date.now()}-${Math.random()}`;
  }

  private static updateResponseTimeMetrics(duration: number): void {
    this.responseTimes.push(duration);

    // Keep only last 1000 response times for efficiency
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    this.metrics.responseTime.min = Math.min(
      this.metrics.responseTime.min,
      duration
    );
    this.metrics.responseTime.max = Math.max(
      this.metrics.responseTime.max,
      duration
    );
    this.metrics.responseTime.avg =
      this.responseTimes.reduce((sum, time) => sum + time, 0) /
      this.responseTimes.length;
  }
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
