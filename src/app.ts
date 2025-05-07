import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import authRoutes from "./modules/auth/auth.route"; // Import auth routes
import productRoutes from "./modules/product/product.route"; // Import product routes
import { verifyToken } from "./modules/auth/auth.middleware"; // Import verifyToken middleware

const app = Fastify({ logger: true });

// Register Plugins
app.register(cors);

app.register(swagger, {
  swagger: {
    info: {
      title: "Inventory API",
      description: "API for managing warehouse inventory",
      version: "1.0.0",
    },
    tags: [{ name: "Inventory", description: "Inventory routes" }],
    consumes: ["application/json"],
    produces: ["application/json"],
  },
});

app.register(swaggerUI, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "list",
    deepLinking: false,
  },
  staticCSP: true,
});
// Register Auth Routes
app.addHook("onRequest", verifyToken);
app.register(authRoutes, { prefix: "/api/auth" });

// Register Product Routes and protect them with auth
app.register(productRoutes, { prefix: "/api/products" });
// Add token verification to all routes after /api/auth

// Register Routes (placeholder)
// import inventoryRoutes from './modules/inventory/inventory.route';
// app.register(inventoryRoutes, { prefix: '/api/inventory' });

export default app;
