import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import authRoutes from "./modules/auth/auth.route";
import productRoutes from "./modules/product/product.route";
import { verifyToken, sanitizeInput } from "./modules/auth/auth.middleware";
import invoiceRoutes from "./modules/invoice/invoice.route";
import customerRoutes from "./modules/customer/customer.route";
import { globalErrorHandler } from "./errors/errorHandler";

import {
  globalRateLimiter,
  authRateLimiter,
} from "./middlewares/rateLimit.middleware";
import { PerformanceMonitor } from "./utils/performance.utils";
// import { cacheMiddleware } from "./utils/cache.utils";
import { ConnectionMonitor } from "./utils/database-simple.utils";
import { corsMiddleware } from "./middlewares/cors.middleware";

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === "production" ? "warn" : "info",
  },
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "30000"),
  bodyLimit:
    parseInt(process.env.MAX_REQUEST_SIZE?.replace("mb", "") || "10") *
    1024 *
    1024,
});

// Security headers middleware
app.addHook("onRequest", async (request, reply) => {
  // Set security headers
  reply.header("X-Content-Type-Options", "nosniff");
  reply.header("X-Frame-Options", "DENY");
  reply.header("X-XSS-Protection", "1; mode=block");
  // reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
  reply.header(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'"
  );

  // Remove server header
  reply.removeHeader("server");
});

// Register performance monitoring
app.addHook("onRequest", PerformanceMonitor.middleware());

// Register caching middleware for GET requests
// app.addHook("onRequest", cacheMiddleware.middleware());

// Register CORS middleware
app.addHook("onRequest", corsMiddleware);

// Register global rate limiting
app.addHook("onRequest", globalRateLimiter.middleware());

// Register input sanitization
app.addHook("onRequest", sanitizeInput);

// Register Swagger
app.register(swagger, {
  swagger: {
    info: {
      title: "Inventory Management API",
      description:
        "A comprehensive API for managing warehouse inventory, customers, and invoices",
      version: "1.0.0",
    },
    host: process.env.SWAGGER_HOST || "localhost:3000",
    schemes: [process.env.NODE_ENV === "production" ? "https" : "http"],
    consumes: ["application/json"],
    produces: ["application/json"],
    tags: [
      { name: "Auth", description: "Authentication endpoints" },
      { name: "Products", description: "Product management endpoints" },
      { name: "Customers", description: "Customer management endpoints" },
      { name: "Invoices", description: "Invoice management endpoints" },
    ],
  },
});

app.register(swaggerUI, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "list",
    deepLinking: false,
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
});

// Enhanced health check endpoint with performance data
app.get("/health", async (request, reply) => {
  return PerformanceMonitor.getHealthCheck();
});

// Performance metrics endpoint
app.get("/metrics", async (request, reply) => {
  const performanceMetrics = PerformanceMonitor.getMetrics();
  // const cacheStats = cacheMiddleware.getStats();
  const connectionStats = ConnectionMonitor.getConnectionStats();

  return {
    performance: performanceMetrics,
    // cache: cacheStats,
    database: connectionStats,
    timestamp: new Date().toISOString(),
  };
});

// Register authentication middleware
app.addHook("onRequest", verifyToken);

// Register routes with specific rate limiting
app.register(authRoutes, { prefix: "/api/auth" });
app.addHook("onRequest", async (request, reply) => {
  // Apply auth-specific rate limiting for auth endpoints
  if (request.url.startsWith("/api/auth/")) {
    await authRateLimiter.middleware()(request, reply);
  }
});

app.register(invoiceRoutes, { prefix: "/api/invoices" });
app.register(productRoutes, { prefix: "/api/products" });
app.register(customerRoutes, { prefix: "/api/customers" });

// Register global error handler
app.setErrorHandler(globalErrorHandler);

// Handle 404 routes
app.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    error: "Route not found",
    path: request.url,
    method: request.method,
  });
});

export default app;
