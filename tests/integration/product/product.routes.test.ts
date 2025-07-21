import request from "supertest";
import Fastify, { FastifyInstance } from "fastify";
import mongoose from "mongoose";
import Product from "../../../src/modules/product/product.model";
import productRoutes from "../../../src/modules/product/product.route";
import { globalErrorHandler } from "../../../src/errors/errorHandler";
import { TestUtils } from "../../utils/testUtils";

describe("Product Routes Integration Tests", () => {
  let app: FastifyInstance;
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    // Create test app
    app = Fastify({ logger: false });

    // Register product routes
    await app.register(productRoutes, { prefix: "/api/products" });

    // Register error handler
    app.setErrorHandler(globalErrorHandler);

    await app.ready();

    // Create test user and get auth token
    testUser = await TestUtils.createTestUser();
    authToken = testUser.token;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await TestUtils.cleanupDatabase();
    // Recreate test user for each test
    testUser = await TestUtils.createTestUser();
    authToken = testUser.token;
  });

  describe("POST /api/products", () => {
    const validProductData = {
      name: "Test Product",
      description: "Test product description",
      price: 100,
      cost: 50,
      stock: 10,
      category: "Electronics",
      code: "TEST001",
    };

    it("should create a new product successfully", async () => {
      const response = await request(app.server)
        .post("/api/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send(validProductData)
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          message: "Product created successfully",
          product: expect.objectContaining({
            name: validProductData.name,
            price: validProductData.price,
            stock: validProductData.stock,
            category: validProductData.category,
            code: validProductData.code,
          }),
        })
      );

      // Verify product was created in database
      const product = await Product.findOne({ code: validProductData.code });
      expect(product).toBeTruthy();
      expect(product?.name).toBe(validProductData.name);
    });

    it("should return 401 without authentication", async () => {
      await request(app.server)
        .post("/api/products")
        .send(validProductData)
        .expect(401);
    });

    it("should return 400 for missing required fields", async () => {
      const invalidData = {
        name: "Test Product",
        // missing other required fields
      };

      await request(app.server)
        .post("/api/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    it("should return 409 for duplicate product code", async () => {
      // Create first product
      await TestUtils.createTestProduct({ code: validProductData.code });

      await request(app.server)
        .post("/api/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send(validProductData)
        .expect(409);
    });

    it("should validate price is non-negative", async () => {
      const invalidData = {
        ...validProductData,
        price: -10,
      };

      await request(app.server)
        .post("/api/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    it("should validate stock is non-negative", async () => {
      const invalidData = {
        ...validProductData,
        stock: -5,
      };

      await request(app.server)
        .post("/api/products")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe("GET /api/products", () => {
    beforeEach(async () => {
      // Create test products
      await TestUtils.createTestProducts(5);
    });

    it("should return paginated products", async () => {
      const response = await request(app.server)
        .get("/api/products?page=1&limit=10")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              price: expect.any(Number),
              stock: expect.any(Number),
            }),
          ]),
          pagination: expect.objectContaining({
            page: 1,
            limit: 10,
            total: expect.any(Number),
            pages: expect.any(Number),
          }),
        })
      );
    });

    it("should filter products by search term", async () => {
      await TestUtils.createTestProduct({
        name: "Special Search Product",
        code: "SEARCH001",
      });

      const response = await request(app.server)
        .get("/api/products?search=Special")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining("Special"),
          }),
        ])
      );
    });

    it("should filter products by category", async () => {
      await TestUtils.createTestProduct({
        name: "Electronics Product",
        category: "Electronics",
        code: "ELEC001",
      });

      const response = await request(app.server)
        .get("/api/products?category=Electronics")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(
        response.body.data.every(
          (product: any) => product.category === "Electronics"
        )
      ).toBe(true);
    });

    it("should filter products by stock status", async () => {
      await TestUtils.createTestProduct({
        name: "Out of Stock Product",
        stock: 0,
        code: "OUTSTOCK001",
      });

      const response = await request(app.server)
        .get("/api/products?inStock=false")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(
        response.body.data.some((product: any) => product.stock === 0)
      ).toBe(true);
    });

    it("should return 401 without authentication", async () => {
      await request(app.server).get("/api/products").expect(401);
    });
  });

  describe("GET /api/products/:id", () => {
    let testProduct: any;

    beforeEach(async () => {
      testProduct = await TestUtils.createTestProduct();
    });

    it("should return product by ID", async () => {
      const response = await request(app.server)
        .get(`/api/products/${testProduct._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          _id: testProduct._id,
          name: testProduct.name,
          price: testProduct.price,
          stock: testProduct.stock,
        })
      );
    });

    it("should return 404 for non-existent product", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      await request(app.server)
        .get(`/api/products/${nonExistentId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });

    it("should return 400 for invalid ObjectId", async () => {
      await request(app.server)
        .get("/api/products/invalid-id")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe("PUT /api/products/:id", () => {
    let testProduct: any;

    beforeEach(async () => {
      testProduct = await TestUtils.createTestProduct();
    });

    const updateData = {
      name: "Updated Product Name",
      price: 200,
      stock: 20,
    };

    it("should update product successfully", async () => {
      const response = await request(app.server)
        .put(`/api/products/${testProduct._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          message: "Product updated successfully",
          product: expect.objectContaining({
            name: updateData.name,
            price: updateData.price,
            stock: updateData.stock,
          }),
        })
      );

      // Verify update in database
      const updatedProduct = await Product.findById(testProduct._id);
      expect(updatedProduct?.name).toBe(updateData.name);
      expect(updatedProduct?.price).toBe(updateData.price);
    });

    it("should return 404 for non-existent product", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      await request(app.server)
        .put(`/api/products/${nonExistentId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);
    });

    it("should validate updated data", async () => {
      const invalidUpdateData = {
        name: "Updated Product",
        price: -100, // Invalid negative price
      };

      await request(app.server)
        .put(`/api/products/${testProduct._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidUpdateData)
        .expect(400);
    });
  });

  describe("DELETE /api/products/:id", () => {
    let testProduct: any;

    beforeEach(async () => {
      testProduct = await TestUtils.createTestProduct();
    });

    it("should delete product successfully", async () => {
      const response = await request(app.server)
        .delete(`/api/products/${testProduct._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        message: "Product deleted successfully",
      });

      // Verify deletion in database
      const deletedProduct = await Product.findById(testProduct._id);
      expect(deletedProduct).toBeNull();
    });

    it("should return 404 for non-existent product", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      await request(app.server)
        .delete(`/api/products/${nonExistentId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe("POST /api/products/:id/stock/adjust", () => {
    let testProduct: any;

    beforeEach(async () => {
      testProduct = await TestUtils.createTestProduct({ stock: 10 });
    });

    it("should adjust stock IN successfully", async () => {
      const adjustData = {
        type: "IN",
        quantity: 5,
        note: "Stock replenishment",
      };

      const response = await request(app.server)
        .post(`/api/products/${testProduct._id}/stock/adjust`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(adjustData)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          message: "Stock adjusted successfully",
          product: expect.objectContaining({
            stock: 15, // 10 + 5
          }),
        })
      );
    });

    it("should adjust stock OUT successfully", async () => {
      const adjustData = {
        type: "OUT",
        quantity: 3,
        note: "Stock removal",
      };

      const response = await request(app.server)
        .post(`/api/products/${testProduct._id}/stock/adjust`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(adjustData)
        .expect(200);

      expect(response.body.product.stock).toBe(7); // 10 - 3
    });

    it("should return 400 when trying to remove more stock than available", async () => {
      const adjustData = {
        type: "OUT",
        quantity: 20, // More than the available 10
        note: "Invalid removal",
      };

      await request(app.server)
        .post(`/api/products/${testProduct._id}/stock/adjust`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(adjustData)
        .expect(400);
    });

    it("should validate adjustment data", async () => {
      const invalidData = {
        type: "INVALID",
        quantity: -5,
      };

      await request(app.server)
        .post(`/api/products/${testProduct._id}/stock/adjust`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });
  });
});
