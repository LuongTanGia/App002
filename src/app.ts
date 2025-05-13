import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import authRoutes from "./modules/auth/auth.route"; // Import auth routes
import productRoutes from "./modules/product/product.route"; // Import product routes
import { verifyToken } from "./modules/auth/auth.middleware"; // Import verifyToken middleware
import invoiceRoutes from "./modules/invoice/invoice.route";
import customerRoutes from "./modules/customer/customer.route";

const app = Fastify({ logger: true });

app.register(cors);

app.register(swagger, {
  swagger: {
    info: {
      title: "Inventory API",
      description: "API for managing warehouse inventory",
      version: "1.0.0",
    },

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
app.addHook("onRequest", verifyToken);
app.register(authRoutes, { prefix: "/api/auth" });
app.register(invoiceRoutes, { prefix: "/api/invoices" });
app.register(productRoutes, { prefix: "/api/products" });
app.register(customerRoutes, { prefix: "/api/customers" });

export default app;
