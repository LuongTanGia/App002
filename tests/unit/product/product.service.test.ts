import { ProductService } from "../../../src/modules/product/product.service";
import Product from "../../../src/modules/product/product.model";
import { DatabaseUtils } from "../../../src/utils/database-simple.utils";
import { QueryCache } from "../../../src/utils/cache.utils";

// Mock dependencies
jest.mock("../../../src/modules/product/product.model");
jest.mock("../../../src/utils/database-simple.utils");
jest.mock("../../../src/utils/cache.utils");

const MockedProduct = Product as jest.Mocked<typeof Product>;
const MockedDatabaseUtils = DatabaseUtils as jest.Mocked<typeof DatabaseUtils>;
const MockedQueryCache = QueryCache as jest.Mocked<typeof QueryCache>;

describe("ProductService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getProducts", () => {
    it("should return cached products if available", async () => {
      const mockProducts = {
        data: [
          { _id: "1", name: "Product 1", price: 100 },
          { _id: "2", name: "Product 2", price: 200 },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      MockedQueryCache.cacheQuery.mockResolvedValue(mockProducts);

      const result = await ProductService.getProducts({
        page: 1,
        limit: 10,
      });

      expect(MockedQueryCache.cacheQuery).toHaveBeenCalled();
      expect(result).toEqual(mockProducts);
    });

    it("should filter products by search term", async () => {
      MockedQueryCache.cacheQuery.mockImplementation(async (key, fn) => {
        return await fn();
      });

      MockedDatabaseUtils.paginatedQuery.mockResolvedValue({
        data: [{ _id: "1", name: "Test Product", price: 100 }],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });

      await ProductService.getProducts({
        search: "Test",
        page: 1,
        limit: 10,
      });

      expect(MockedDatabaseUtils.paginatedQuery).toHaveBeenCalledWith(
        Product,
        expect.objectContaining({
          $or: expect.arrayContaining([
            { name: { $regex: "Test", $options: "i" } },
            { description: { $regex: "Test", $options: "i" } },
          ]),
        }),
        expect.any(Object)
      );
    });

    it("should filter products by category", async () => {
      MockedQueryCache.cacheQuery.mockImplementation(async (key, fn) => {
        return await fn();
      });

      MockedDatabaseUtils.paginatedQuery.mockResolvedValue({
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false,
        },
      });

      await ProductService.getProducts({
        category: "Electronics",
        page: 1,
        limit: 10,
      });

      expect(MockedDatabaseUtils.paginatedQuery).toHaveBeenCalledWith(
        Product,
        expect.objectContaining({
          category: "Electronics",
        }),
        expect.any(Object)
      );
    });

    it("should filter products by stock status", async () => {
      MockedQueryCache.cacheQuery.mockImplementation(async (key, fn) => {
        return await fn();
      });

      MockedDatabaseUtils.paginatedQuery.mockResolvedValue({
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false,
        },
      });

      await ProductService.getProducts({
        inStock: true,
        page: 1,
        limit: 10,
      });

      expect(MockedDatabaseUtils.paginatedQuery).toHaveBeenCalledWith(
        Product,
        expect.objectContaining({
          stock: { $gt: 0 },
        }),
        expect.any(Object)
      );
    });
  });

  describe("getProductById", () => {
    it("should return cached product if available", async () => {
      const mockProduct = { _id: "1", name: "Test Product", price: 100 };

      MockedQueryCache.cacheQuery.mockResolvedValue(mockProduct);

      const result = await ProductService.getProductById("1");

      expect(MockedQueryCache.cacheQuery).toHaveBeenCalled();
      expect(result).toEqual(mockProduct);
    });

    it("should fetch product from database if not cached", async () => {
      const mockProduct = { _id: "1", name: "Test Product", price: 100 };

      MockedQueryCache.cacheQuery.mockImplementation(async (key, fn) => {
        return await fn();
      });

      // Mock the find chain
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(mockProduct),
      };
      MockedProduct.findById = jest.fn().mockReturnValue(mockQuery);

      const result = await ProductService.getProductById("1");

      expect(MockedProduct.findById).toHaveBeenCalledWith("1");
      expect(mockQuery.lean).toHaveBeenCalled();
      expect(result).toEqual(mockProduct);
    });
  });

  describe("getLowStockProducts", () => {
    it("should return products with stock below threshold", async () => {
      const mockProducts = [
        { _id: "1", name: "Low Stock Product", stock: 5 },
        { _id: "2", name: "Another Low Stock", stock: 3 },
      ];

      MockedQueryCache.cacheQuery.mockImplementation(async (key, fn) => {
        return await fn();
      });

      // Mock the query chain
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProducts),
      };
      MockedProduct.find = jest.fn().mockReturnValue(mockQuery);

      const result = await ProductService.getLowStockProducts(10);

      expect(MockedProduct.find).toHaveBeenCalledWith({ stock: { $lte: 10 } });
      expect(mockQuery.select).toHaveBeenCalledWith(
        "name stock price category"
      );
      expect(mockQuery.sort).toHaveBeenCalledWith({ stock: 1 });
      expect(mockQuery.limit).toHaveBeenCalledWith(50);
      expect(mockQuery.lean).toHaveBeenCalled();
      expect(result).toEqual(mockProducts);
    });

    it("should use default threshold of 10", async () => {
      MockedQueryCache.cacheQuery.mockImplementation(async (key, fn) => {
        return await fn();
      });

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      MockedProduct.find = jest.fn().mockReturnValue(mockQuery);

      await ProductService.getLowStockProducts();

      expect(MockedProduct.find).toHaveBeenCalledWith({ stock: { $lte: 10 } });
    });
  });

  describe("getProductStats", () => {
    it("should return product statistics", async () => {
      const mockStats = [
        {
          _id: null,
          totalProducts: 100,
          totalStock: 1000,
          totalValue: 50000,
          avgPrice: 500,
          lowStockCount: 5,
        },
      ];

      MockedQueryCache.cacheQuery.mockImplementation(async (key, fn) => {
        return await fn();
      });

      MockedDatabaseUtils.aggregate.mockResolvedValue(mockStats);

      const result = await ProductService.getProductStats();

      expect(MockedDatabaseUtils.aggregate).toHaveBeenCalledWith(
        Product,
        expect.arrayContaining([
          expect.objectContaining({
            $group: expect.objectContaining({
              _id: null,
              totalProducts: { $sum: 1 },
              totalStock: { $sum: "$stock" },
              totalValue: { $sum: { $multiply: ["$price", "$stock"] } },
              avgPrice: { $avg: "$price" },
              lowStockCount: expect.objectContaining({
                $sum: expect.objectContaining({
                  $cond: [{ $lte: ["$stock", 10] }, 1, 0],
                }),
              }),
            }),
          }),
        ])
      );
      expect(result).toEqual(mockStats);
    });
  });

  describe("bulkUpdateStock", () => {
    it("should perform bulk stock update", async () => {
      const updates = [
        { productId: "1", stock: 50 },
        { productId: "2", stock: 75 },
      ];

      const mockBulkResult = { modifiedCount: 2 };
      MockedDatabaseUtils.bulkWrite.mockResolvedValue(mockBulkResult);

      MockedQueryCache.invalidateQuery = jest.fn();

      const result = await ProductService.bulkUpdateStock(updates);

      const expectedOperations = updates.map((update) => ({
        updateOne: {
          filter: { _id: update.productId },
          update: {
            $set: { stock: update.stock, updatedAt: expect.any(Date) },
          },
        },
      }));

      expect(MockedDatabaseUtils.bulkWrite).toHaveBeenCalledWith(
        Product,
        expectedOperations
      );

      // Verify cache invalidation
      expect(MockedQueryCache.invalidateQuery).toHaveBeenCalledWith("products");
      expect(MockedQueryCache.invalidateQuery).toHaveBeenCalledWith(
        "product-stats"
      );
      expect(MockedQueryCache.invalidateQuery).toHaveBeenCalledWith(
        "low-stock"
      );

      expect(result).toEqual(mockBulkResult);
    });

    it("should handle empty updates array", async () => {
      const result = await ProductService.bulkUpdateStock([]);

      expect(MockedDatabaseUtils.bulkWrite).toHaveBeenCalledWith(Product, []);
    });
  });
});
