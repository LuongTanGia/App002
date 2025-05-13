// src/modules/inventory/product.route.ts
import { FastifyInstance } from "fastify";
import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  stockIn,
  stockOut,
  createProductList,
  getProducts_Small,
} from "./product.controller";

const productRoutes = async (app: FastifyInstance) => {
  // Route để tạo sản phẩm
  app.get("/", getProducts);
  app.get("/list", getProducts_Small);
  app.get("/:id", getProductById);
  app.post("/", createProduct);
  app.post("/stock-in", stockIn);
  app.post("/stock-out", stockOut);
  app.post("/delete", deleteProduct);
  app.post("/list", createProductList);
};

export default productRoutes;
