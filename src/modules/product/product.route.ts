import { FastifyInstance } from "fastify";
import {
  createProduct,
  deleteProduct,
  getProductById,
  getAllProducts,
  stockIn,
  stockOut,
  createProductList,
  getProductsSummary,
} from "./product.controller";

const productRoutes = async (app: FastifyInstance) => {
  // Get routes
  app.get("/", getAllProducts);
  app.get("/summary", getProductsSummary);
  app.get("/:id", getProductById);

  // Post routes
  app.post("/", createProduct);
  app.post("/batch", createProductList);
  app.post("/stock-in", stockIn);
  app.post("/stock-out", stockOut);

  // Delete route (should be DELETE method but keeping POST for compatibility)
  app.post("/delete", deleteProduct);
};

export default productRoutes;
