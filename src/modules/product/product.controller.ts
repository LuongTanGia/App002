import { FastifyReply, FastifyRequest } from "fastify";
import Product from "./product.model";
import HttpStatusCode from "../../errors/HttpStatusCode";
import { ErrorResponse } from "../../types/common.types";
import {
  CreateProductBody,
  CreateProductListBody,
  StockTransactionBody,
  ProductParams,
  ProductSummary,
  DeleteProductBody,
} from "./product.types";

/**
 * Create a new product
 */
export const createProduct = async (
  req: FastifyRequest<{ Body: CreateProductBody }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { name, description, price, cost, stock, category, code } = req.body;

    // Input validation
    if (!name?.trim()) {
      reply
        .status(HttpStatusCode.BAD_REQUEST)
        .send({ error: "Product name is required" } as ErrorResponse);
      return;
    }

    if (!code?.trim()) {
      reply
        .status(HttpStatusCode.BAD_REQUEST)
        .send({ error: "Product code is required" } as ErrorResponse);
      return;
    }

    if (!description?.trim()) {
      reply
        .status(HttpStatusCode.BAD_REQUEST)
        .send({ error: "Product description is required" } as ErrorResponse);
      return;
    }

    if (!category?.trim()) {
      reply
        .status(HttpStatusCode.BAD_REQUEST)
        .send({ error: "Product category is required" } as ErrorResponse);
      return;
    }

    if (typeof price !== "number" || price < 0) {
      reply
        .status(HttpStatusCode.BAD_REQUEST)
        .send({
          error: "Price must be a non-negative number",
        } as ErrorResponse);
      return;
    }

    if (typeof cost !== "number" || cost < 0) {
      reply
        .status(HttpStatusCode.BAD_REQUEST)
        .send({ error: "Cost must be a non-negative number" } as ErrorResponse);
      return;
    }

    if (typeof stock !== "number" || stock < 0) {
      reply
        .status(HttpStatusCode.BAD_REQUEST)
        .send({
          error: "Stock must be a non-negative number",
        } as ErrorResponse);
      return;
    }

    // Check for existing product with same code or name
    const existingProduct = await Product.findOne({
      $or: [{ code: code.trim() }, { name: name.trim() }],
    });

    if (existingProduct) {
      const field = existingProduct.code === code.trim() ? "code" : "name";
      reply
        .status(HttpStatusCode.BAD_REQUEST)
        .send({
          error: `Product with this ${field} already exists`,
        } as ErrorResponse);
      return;
    }

    const product = new Product({
      name: name.trim(),
      description: description.trim(),
      price,
      cost,
      stock,
      category: category.trim(),
      code: code.trim(),
      ordered: 0,
      sold: 0,
    });

    await product.save();

    // Return clean response
    const productResponse = product.toObject();
    const { __v, ...cleanProductResponse } = productResponse;

    reply.status(HttpStatusCode.INSERT_OK).send(cleanProductResponse);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    reply.status(HttpStatusCode.INTERNAL_SERVER_ERROR).send({
      error: "Failed to create product",
      details: errorMessage,
    } as ErrorResponse);
  }
};
/**
 * Create multiple products from a list
 */
export const createProductList = async (
  req: FastifyRequest<{ Body: CreateProductListBody[] }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const products = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      reply
        .status(HttpStatusCode.BAD_REQUEST)
        .send({
          error: "Products array is required and cannot be empty",
        } as ErrorResponse);
      return;
    }

    const createdProducts = await Product.insertMany(
      products.map((product) => ({
        name: product.TenHang,
        description: product.TenHang,
        price: product.GiaBan,
        cost: product.GiaVon,
        stock: product.TonKho,
        ordered: product.KhachDat,
        code: product.MaHang,
        category: "General",
        sold: 0,
      }))
    );

    reply.status(HttpStatusCode.INSERT_OK).send(createdProducts);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    reply.status(HttpStatusCode.INTERNAL_SERVER_ERROR).send({
      error: "Failed to create product list",
      details: errorMessage,
    } as ErrorResponse);
  }
};

/**
 * Get all products
 */
export const getAllProducts = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const products = await Product.find().select("-__v");
    reply.status(HttpStatusCode.OK).send(products);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    reply.status(HttpStatusCode.INTERNAL_SERVER_ERROR).send({
      error: "Failed to fetch products",
      details: errorMessage,
    } as ErrorResponse);
  }
};

/**
 * Get products summary for dropdowns/selection
 */
export const getProductsSummary = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const products = await Product.find()
      .select("name cost stock price")
      .lean();
    const productsSummary: ProductSummary[] = products.map((product) => ({
      id: product._id.toString(),
      name: product.name,
      cost: product.cost,
      stock: product.stock,
      price: product.price,
    }));

    reply.status(HttpStatusCode.OK).send(productsSummary);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    reply.status(HttpStatusCode.INTERNAL_SERVER_ERROR).send({
      error: "Failed to fetch products summary",
      details: errorMessage,
    } as ErrorResponse);
  }
};
/**
 * Get product by ID
 */
export const getProductById = async (
  req: FastifyRequest<{ Params: ProductParams }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      reply
        .status(HttpStatusCode.BAD_REQUEST)
        .send({ error: "Invalid product ID format" } as ErrorResponse);
      return;
    }

    const product = await Product.findById(id).select("-__v");

    if (!product) {
      reply
        .status(HttpStatusCode.NOT_FOUND)
        .send({ error: "Product not found" } as ErrorResponse);
      return;
    }

    reply.status(HttpStatusCode.OK).send(product);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    reply.status(HttpStatusCode.INTERNAL_SERVER_ERROR).send({
      error: "Failed to fetch product",
      details: errorMessage,
    } as ErrorResponse);
  }
};
/**
 * Add stock to inventory (Stock In)
 */
export const stockIn = async (
  req: FastifyRequest<{ Body: StockTransactionBody }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { productId, quantity, note } = req.body;

    // Input validation
    if (!productId?.trim()) {
      reply
        .status(HttpStatusCode.BAD_REQUEST)
        .send({ error: "Product ID is required" } as ErrorResponse);
      return;
    }

    if (typeof quantity !== "number" || quantity <= 0) {
      reply
        .status(HttpStatusCode.BAD_REQUEST)
        .send({ error: "Quantity must be a positive number" } as ErrorResponse);
      return;
    }

    // Validate ObjectId format
    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      reply
        .status(HttpStatusCode.BAD_REQUEST)
        .send({ error: "Invalid product ID format" } as ErrorResponse);
      return;
    }

    const product = await Product.findById(productId);
    if (!product) {
      reply
        .status(HttpStatusCode.NOT_FOUND)
        .send({ error: "Product not found" } as ErrorResponse);
      return;
    }

    const userName = (req.user as any)?.userName || "System";

    // Update stock
    product.stock += quantity;

    product.transactions.push({
      type: "IN",
      quantity,
      note: note?.trim() || "",
      performedBy: userName,
      date: new Date(),
      timestamp: new Date(),
    });

    await product.save();

    // Return clean response
    const productResponse = product.toObject();
    const { __v, ...cleanProductResponse } = productResponse;

    reply.status(HttpStatusCode.OK).send(cleanProductResponse);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    reply.status(HttpStatusCode.INTERNAL_SERVER_ERROR).send({
      error: "Failed to add stock",
      details: errorMessage,
    } as ErrorResponse);
  }
};

/**
 * Remove stock from inventory (Stock Out)
 */
export const stockOut = async (
  req: FastifyRequest<{ Body: StockTransactionBody }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { productId, quantity, note } = req.body;

    // Input validation
    if (!productId?.trim()) {
      reply
        .status(HttpStatusCode.BAD_REQUEST)
        .send({ error: "Product ID is required" } as ErrorResponse);
      return;
    }

    if (typeof quantity !== "number" || quantity <= 0) {
      reply
        .status(HttpStatusCode.BAD_REQUEST)
        .send({ error: "Quantity must be a positive number" } as ErrorResponse);
      return;
    }

    // Validate ObjectId format
    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      reply
        .status(HttpStatusCode.BAD_REQUEST)
        .send({ error: "Invalid product ID format" } as ErrorResponse);
      return;
    }

    const product = await Product.findById(productId);
    if (!product) {
      reply
        .status(HttpStatusCode.NOT_FOUND)
        .send({ error: "Product not found" } as ErrorResponse);
      return;
    }

    if (product.stock < quantity) {
      reply
        .status(HttpStatusCode.BAD_REQUEST)
        .send({ error: "Insufficient stock available" } as ErrorResponse);
      return;
    }

    const userName = (req.user as any)?.userName || "System";

    // Update stock and sold quantity
    product.stock -= quantity;
    product.sold = (product.sold || 0) + quantity;

    product.transactions.push({
      type: "OUT",
      quantity,
      note: note?.trim() || "",
      performedBy: userName,
      date: new Date(),
      timestamp: new Date(),
    });

    await product.save();

    // Return clean response
    const productResponse = product.toObject();
    const { __v, ...cleanProductResponse } = productResponse;

    reply.status(HttpStatusCode.OK).send(cleanProductResponse);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    reply.status(HttpStatusCode.INTERNAL_SERVER_ERROR).send({
      error: "Failed to reduce stock",
      details: errorMessage,
    } as ErrorResponse);
  }
};
/**
 * Delete a product
 */
export const deleteProduct = async (
  req: FastifyRequest<{ Body: DeleteProductBody }>,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { productId } = req.body;

    // Input validation
    if (!productId?.trim()) {
      reply
        .status(HttpStatusCode.BAD_REQUEST)
        .send({ error: "Product ID is required" } as ErrorResponse);
      return;
    }

    // Validate ObjectId format
    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      reply
        .status(HttpStatusCode.BAD_REQUEST)
        .send({ error: "Invalid product ID format" } as ErrorResponse);
      return;
    }

    const product = await Product.findByIdAndDelete(productId);
    if (!product) {
      reply
        .status(HttpStatusCode.NOT_FOUND)
        .send({ error: "Product not found" } as ErrorResponse);
      return;
    }

    reply.status(HttpStatusCode.OK).send({
      message: "Product deleted successfully",
      product: {
        id: product._id,
        name: product.name,
        code: product.code,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    reply.status(HttpStatusCode.INTERNAL_SERVER_ERROR).send({
      error: "Failed to delete product",
      details: errorMessage,
    } as ErrorResponse);
  }
};
