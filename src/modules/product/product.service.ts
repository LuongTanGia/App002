// src/modules/product/product.service.ts
import Product from "./product.model";
import StockHistory from "./stock-history.model";
import { DatabaseUtils, QueryMonitor } from "../../utils/database-simple.utils";
import { QueryCache } from "../../utils/cache.utils";
import { OutputType, print } from "../../helpers/print";

/**
 * Optimized product service with caching and performance monitoring
 */
export class ProductService {
  /**
   * Get products with pagination and caching
   */
  static async getProducts(
    options: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      inStock?: boolean;
    } = {}
  ) {
    const cacheKey = `products:${JSON.stringify(options)}`;

    return await QueryCache.cacheQuery(
      cacheKey,
      async () => {
        const filter: any = {};

        // Apply search filter
        if (options.search) {
          filter.$or = [
            { name: { $regex: options.search, $options: "i" } },
            { description: { $regex: options.search, $options: "i" } },
          ];
        }

        // Apply category filter
        if (options.category) {
          filter.category = options.category;
        }

        // Apply stock filter
        if (options.inStock !== undefined) {
          filter.stock = options.inStock ? { $gt: 0 } : 0;
        }

        return await DatabaseUtils.paginatedQuery(Product, filter, {
          page: options.page,
          limit: options.limit,
          select:
            "name description price stock category sold createdAt updatedAt",
          sort: { updatedAt: -1 },
        });
      },
      300
    ); // Cache for 5 minutes
  }

  /**
   * Get product by ID with caching
   */
  static async getProductById(productId: string) {
    const cacheKey = `product:${productId}`;

    return await QueryCache.cacheQuery(
      cacheKey,
      async () => {
        const queryId = QueryMonitor.startQuery("get-product-by-id");
        try {
          return await Product.findById(productId).lean();
        } finally {
          QueryMonitor.endQuery(queryId);
        }
      },
      600
    ); // Cache for 10 minutes
  }

  /**
   * Get low stock products
   */
  static async getLowStockProducts(threshold: number = 10) {
    const cacheKey = `low-stock:${threshold}`;

    return await QueryCache.cacheQuery(
      cacheKey,
      async () => {
        return await Product.find({ stock: { $lte: threshold } })
          .select("name stock price category")
          .sort({ stock: 1 })
          .limit(50)
          .lean();
      },
      120
    ); // Cache for 2 minutes
  }

  /**
   * Get product statistics
   */
  static async getProductStats() {
    const cacheKey = "product-stats";

    return await QueryCache.cacheQuery(
      cacheKey,
      async () => {
        return await DatabaseUtils.aggregate(Product, [
          {
            $group: {
              _id: null,
              totalProducts: { $sum: 1 },
              totalStock: { $sum: "$stock" },
              totalValue: { $sum: { $multiply: ["$price", "$stock"] } },
              avgPrice: { $avg: "$price" },
              lowStockCount: {
                $sum: {
                  $cond: [{ $lte: ["$stock", 10] }, 1, 0],
                },
              },
            },
          },
        ]);
      },
      300
    ); // Cache for 5 minutes
  }

  /**
   * Bulk update stock with performance optimization
   */
  static async bulkUpdateStock(
    updates: Array<{
      productId: string;
      stock: number;
    }>
  ) {
    const operations = updates.map((update) => ({
      updateOne: {
        filter: { _id: update.productId },
        update: { $set: { stock: update.stock, updatedAt: new Date() } },
      },
    }));

    const result = await DatabaseUtils.bulkWrite(Product, operations);

    // Invalidate related cache
    QueryCache.invalidateQuery("products");
    QueryCache.invalidateQuery("product-stats");
    QueryCache.invalidateQuery("low-stock");

    return result;
  }

  /**
   * Create product indexes for optimization
   */
  static async createIndexes() {
    try {
      // Create indexes for common queries
      await Product.collection.createIndex({ stock: 1 }); // Low stock queries
      await Product.collection.createIndex({ category: 1, price: -1 }); // Category with price sort
      await Product.collection.createIndex({
        name: "text",
        description: "text",
      }); // Text search
      await Product.collection.createIndex({ createdAt: -1 }); // Date sorting

      print(
        "Product collection indexes created successfully",
        OutputType.SUCCESS
      );
    } catch (error) {
      print(
        `Failed to create indexes: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        OutputType.ERROR
      );
    }
  }
}

/**
 * Legacy function - keep for backward compatibility but use optimized version
 */
export const adjustStock = async (
  productId: string,
  type: "IN" | "OUT",
  quantity: number,
  userName?: string,
  note?: string
) => {
  const queryId = QueryMonitor.startQuery("adjust-stock");

  try {
    const product = await Product.findById(productId);
    if (!product) throw new Error("Product not found");

    // Calculate new stock
    let newStock = product.stock;
    if (type === "IN") {
      newStock += quantity;
    } else {
      if (product.stock < quantity)
        throw new Error("Not enough stock to remove");
      newStock -= quantity;
      product.sold = (product.sold || 0) + quantity;
    }

    // Update product
    product.stock = newStock;
    await product.save();

    // Create stock history record
    await new StockHistory({
      productId: productId,
      type: type,
      quantity: quantity,
      previousStock: type === "IN" ? newStock - quantity : newStock + quantity,
      newStock: newStock,
      userName: userName || "System",
      note: note,
      createdAt: new Date(),
    }).save();

    // Invalidate cache for this product
    QueryCache.invalidateQuery(`product:${productId}`);
    QueryCache.invalidateQuery("products");
    QueryCache.invalidateQuery("product-stats");
    QueryCache.invalidateQuery("low-stock");

    print(
      `Stock adjusted: ${product.name} ${type} ${quantity} units`,
      OutputType.SUCCESS
    );

    return product;
  } finally {
    QueryMonitor.endQuery(queryId);
  }
};
