import Fastify, { FastifyInstance } from "fastify";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import app from "../../src/app";
import User from "../../src/modules/auth/user.model";
import Product from "../../src/modules/product/product.model";
import Customer from "../../src/modules/customer/customer.model";

export interface TestUser {
  _id: string;
  username: string;
  email: string;
  password?: string;
  token?: string;
}

export interface TestProduct {
  _id: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  category: string;
  code: string;
}

export interface TestCustomer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

/**
 * Test utilities for creating test data and helpers
 */
export class TestUtils {
  /**
   * Create test Fastify app instance
   */
  static async createTestApp(): Promise<FastifyInstance> {
    const testApp = Fastify({
      logger: false, // Disable logging in tests
    });

    return testApp;
  }

  /**
   * Create a test user in database
   */
  static async createTestUser(
    overrides: Partial<TestUser> = {}
  ): Promise<TestUser> {
    const defaultUser = {
      username: "testuser",
      email: "test@example.com",
      password: "Test123456",
    };

    const userData = { ...defaultUser, ...overrides };
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = await User.create({
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
    });

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" }
    );

    return {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      token,
    };
  }

  /**
   * Create multiple test users
   */
  static async createTestUsers(count: number): Promise<TestUser[]> {
    const users: TestUser[] = [];

    for (let i = 0; i < count; i++) {
      const user = await this.createTestUser({
        username: `testuser${i}`,
        email: `test${i}@example.com`,
      });
      users.push(user);
    }

    return users;
  }

  /**
   * Create a test product in database
   */
  static async createTestProduct(
    overrides: Partial<TestProduct> = {}
  ): Promise<TestProduct> {
    const defaultProduct = {
      name: "Test Product",
      description: "Test product description",
      price: 100,
      cost: 50,
      stock: 10,
      category: "Electronics",
      code: "TEST001",
    };

    const productData = { ...defaultProduct, ...overrides };
    const product = await Product.create(productData);

    return {
      _id: product._id.toString(),
      name: product.name,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      category: product.category,
      code: product.code,
    };
  }

  /**
   * Create multiple test products
   */
  static async createTestProducts(count: number): Promise<TestProduct[]> {
    const products: TestProduct[] = [];

    for (let i = 0; i < count; i++) {
      const product = await this.createTestProduct({
        name: `Test Product ${i}`,
        code: `TEST00${i}`,
        price: 100 + i * 10,
        stock: 10 + i,
      });
      products.push(product);
    }

    return products;
  }

  /**
   * Create a test customer in database
   */
  static async createTestCustomer(
    overrides: Partial<TestCustomer> = {}
  ): Promise<TestCustomer> {
    const defaultCustomer = {
      name: "Test Customer",
      email: "customer@example.com",
      phone: "1234567890",
      address: "Test Address",
    };

    const customerData = { ...defaultCustomer, ...overrides };
    const customer = await Customer.create(customerData);

    return {
      _id: customer._id.toString(),
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
    };
  }

  /**
   * Create multiple test customers
   */
  static async createTestCustomers(count: number): Promise<TestCustomer[]> {
    const customers: TestCustomer[] = [];

    for (let i = 0; i < count; i++) {
      const customer = await this.createTestCustomer({
        name: `Test Customer ${i}`,
        email: `customer${i}@example.com`,
        phone: `123456789${i}`,
      });
      customers.push(customer);
    }

    return customers;
  }

  /**
   * Generate auth headers for requests
   */
  static getAuthHeaders(token: string): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Clean all test data from database
   */
  static async cleanupDatabase(): Promise<void> {
    const collections = mongoose.connection.collections;

    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }

  /**
   * Wait for a specified amount of time
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate random string
   */
  static randomString(length: number = 8): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate random email
   */
  static randomEmail(): string {
    return `${this.randomString()}@test.com`;
  }

  /**
   * Generate valid MongoDB ObjectId
   */
  static randomObjectId(): string {
    return new mongoose.Types.ObjectId().toString();
  }
}
