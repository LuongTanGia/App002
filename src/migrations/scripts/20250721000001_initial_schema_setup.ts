import mongoose from "mongoose";
import { IMigration } from "../types";

/**
 * Migration: Initial Schema Setup
 * Version: 20250721000001
 * Description: Create initial indexes and constraints for all collections
 * Created: 2025-01-21T00:00:01.000Z
 */
const migration: IMigration = {
  name: "Initial Schema Setup",
  version: "20250721000001",
  description: "Create initial indexes and constraints for all collections",

  /**
   * Apply migration
   */
  async up(): Promise<void> {
    try {
      console.log("Running migration: Initial Schema Setup");

      // Users collection indexes
      await mongoose.connection
        .collection("users")
        .createIndex(
          { email: 1 },
          { unique: true, name: "users_email_unique" }
        );

      await mongoose.connection
        .collection("users")
        .createIndex(
          { username: 1 },
          { unique: true, name: "users_username_unique" }
        );

      // Products collection indexes
      await mongoose.connection
        .collection("products")
        .createIndex(
          { code: 1 },
          { unique: true, name: "products_code_unique" }
        );

      await mongoose.connection
        .collection("products")
        .createIndex({ name: 1 }, { name: "products_name_index" });

      await mongoose.connection
        .collection("products")
        .createIndex({ category: 1 }, { name: "products_category_index" });

      await mongoose.connection
        .collection("products")
        .createIndex({ stock: 1 }, { name: "products_stock_index" });

      // Customers collection indexes
      await mongoose.connection
        .collection("customers")
        .createIndex(
          { email: 1 },
          { unique: true, name: "customers_email_unique" }
        );

      await mongoose.connection
        .collection("customers")
        .createIndex({ phone: 1 }, { name: "customers_phone_index" });

      await mongoose.connection
        .collection("customers")
        .createIndex({ name: 1 }, { name: "customers_name_index" });

      // Invoices collection indexes
      await mongoose.connection
        .collection("invoices")
        .createIndex(
          { customerName: 1 },
          { name: "invoices_customer_name_index" }
        );

      await mongoose.connection
        .collection("invoices")
        .createIndex(
          { issuedAt: -1 },
          { name: "invoices_issued_at_desc_index" }
        );

      await mongoose.connection
        .collection("invoices")
        .createIndex(
          { createdAt: -1 },
          { name: "invoices_created_at_desc_index" }
        );

      // Stock history collection indexes
      await mongoose.connection
        .collection("stockhistories")
        .createIndex(
          { productId: 1 },
          { name: "stockhistories_product_id_index" }
        );

      await mongoose.connection
        .collection("stockhistories")
        .createIndex(
          { timestamp: -1 },
          { name: "stockhistories_timestamp_desc_index" }
        );

      await mongoose.connection
        .collection("stockhistories")
        .createIndex(
          { productId: 1, timestamp: -1 },
          { name: "stockhistories_product_timestamp_index" }
        );

      console.log("Migration Initial Schema Setup completed successfully");
    } catch (error: any) {
      console.error("Migration Initial Schema Setup failed:", error.message);
      throw error;
    }
  },

  /**
   * Rollback migration
   */
  async down(): Promise<void> {
    try {
      console.log("Rolling back migration: Initial Schema Setup");

      // Drop all indexes created in up()
      const collections = [
        "users",
        "products",
        "customers",
        "invoices",
        "stockhistories",
      ];

      for (const collectionName of collections) {
        try {
          const collection = mongoose.connection.collection(collectionName);
          const indexes = await collection.indexes();

          for (const index of indexes) {
            // Skip the default _id index and ensure index name exists
            if (index.name && index.name !== "_id_") {
              try {
                await collection.dropIndex(index.name);
                console.log(
                  `Dropped index: ${index.name} from ${collectionName}`
                );
              } catch (dropError: any) {
                console.warn(
                  `Failed to drop index ${index.name}: ${dropError.message}`
                );
              }
            }
          }
        } catch (collectionError: any) {
          console.warn(
            `Failed to process collection ${collectionName}: ${collectionError.message}`
          );
        }
      }

      console.log("Rollback Initial Schema Setup completed successfully");
    } catch (error: any) {
      console.error("Rollback Initial Schema Setup failed:", error.message);
      throw error;
    }
  },
};

export default migration;
