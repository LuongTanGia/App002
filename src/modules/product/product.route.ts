// src/modules/inventory/product.route.ts
import { FastifyInstance } from "fastify";
import {
  createProduct,
  getProducts,
  stockIn,
  stockOut,
} from "./product.controller";

const productRoutes = async (app: FastifyInstance) => {
  // Route để tạo sản phẩm
  app.post("/", createProduct);

  // Route để lấy danh sách sản phẩm
  app.get("/", getProducts);

  // Route để nhập kho (cộng tồn kho)
  app.post("/stock-in", stockIn);

  // Route để xuất kho (trừ tồn kho)
  app.post("/stock-out", stockOut);
};

export default productRoutes;
