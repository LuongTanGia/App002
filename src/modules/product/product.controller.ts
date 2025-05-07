// src/modules/inventory/product.controller.ts
import { FastifyReply, FastifyRequest } from "fastify";
import Product from "./product.model";
import HttpStatusCode from "../../errors/HttpStatusCode";
import { adjustStock } from "./product.service";

// Define request body types
interface CreateProductBody {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
}

interface StockTransactionBody {
  productId: string;
  quantity: number;
  note: string;
}

// Create a new product
export const createProduct = async (
  req: FastifyRequest<{ Body: CreateProductBody }>,
  reply: FastifyReply
) => {
  try {
    const { name, description, price, stock, category } = req.body;

    const existingProduct = await Product.findOne({ name });
    if (existingProduct) {
      return reply
        .status(HttpStatusCode.BAD_REQUEST)
        .send({ error: "Product with the same name already exists" });
    }

    const product = new Product({ name, description, price, stock, category });
    await product.save();

    return reply.status(HttpStatusCode.INSERT_OK).send(product);
  } catch (error: any) {
    return reply
      .status(HttpStatusCode.BAD_REQUEST)
      .send({ error: "Error creating product", details: error.message });
  }
};

// Get the list of products
export const getProducts = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const products = await Product.find();
    return reply.status(HttpStatusCode.OK).send(products);
  } catch (error: any) {
    return reply
      .status(HttpStatusCode.BAD_REQUEST)
      .send({ error: "Error fetching products", details: error.message });
  }
};
export const getProductById = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return reply
        .status(HttpStatusCode.NOT_FOUND)
        .send({ error: "Product not found" });
    }
    return reply.status(HttpStatusCode.OK).send(product);
  } catch (error: any) {
    return reply
      .status(HttpStatusCode.BAD_REQUEST)
      .send({ error: "Error fetching product", details: error.message });
  }
};
// Stock in (Add to inventory)
export const stockIn = async (
  req: FastifyRequest<{ Body: StockTransactionBody }>,
  reply: FastifyReply
) => {
  try {
    const { productId, quantity, note } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return reply
        .status(HttpStatusCode.NOT_FOUND)
        .send({ error: "Product not found" });
    }

    const userName = (req.user as any)?.userName; // Extract userName from token

    // Cập nhật stock

    product.stock += quantity;

    product.transactions.push({
      type: "IN",
      quantity,
      note,
      performedBy: userName,
    });
    await product.save();

    return reply.status(HttpStatusCode.OK).send(product);
  } catch (error: any) {
    return reply
      .status(HttpStatusCode.BAD_REQUEST)
      .send({ error: "Error adding stock", details: error.message });
  }
};

// Stock out (Reduce inventory)
export const stockOut = async (
  req: FastifyRequest<{ Body: StockTransactionBody }>,
  reply: FastifyReply
) => {
  try {
    const { productId, quantity, note } = req.body;
    const userName = (req.user as any)?.userName;
    const product = await Product.findById(productId);
    if (!product) {
      return reply
        .status(HttpStatusCode.NOT_FOUND)
        .send({ error: "Product not found" });
    }
    if (product.stock < quantity) {
      return reply
        .status(HttpStatusCode.BAD_REQUEST)
        .send({ error: "Not enough stock" });
    }
    if (product.stock < quantity) throw new Error("Not enough stock to remove");
    product.stock -= quantity;

    // Cập nhật dữ liệu đã bán
    product.sold = (product.sold || 0) + quantity;
    product.transactions.push({
      type: "OUT",
      quantity,
      note,
      performedBy: userName,
    });
    await product.save();

    return reply.status(HttpStatusCode.OK).send(product);
  } catch (error: any) {
    return reply
      .status(HttpStatusCode.BAD_REQUEST)
      .send({ error: "Error reducing stock", details: error.message });
  }
};
export const deleteProduct = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return reply
        .status(HttpStatusCode.NOT_FOUND)
        .send({ error: "Product not found" });
    }
    return reply
      .status(HttpStatusCode.OK)
      .send({ message: "Product deleted successfully", product });
  } catch (error: any) {
    return reply
      .status(HttpStatusCode.BAD_REQUEST)
      .send({ error: "Error deleting product", details: error.message });
  }
};
