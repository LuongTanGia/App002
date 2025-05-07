// src/modules/inventory/product.route.ts
import { FastifyInstance } from "fastify";
import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  stockIn,
  stockOut,
} from "./product.controller";

const productRoutes = async (app: FastifyInstance) => {
  // Route để tạo sản phẩm
  app.get("/", getProducts);
  app.get("/:id", getProductById);
  app.post("/", createProduct);
  app.post("/stock-in", stockIn);
  app.post("/stock-out", stockOut);
  app.delete("/:id", deleteProduct);
};

export default productRoutes;
