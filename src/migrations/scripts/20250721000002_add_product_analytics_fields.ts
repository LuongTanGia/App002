import mongoose from "mongoose";
import { IMigration } from "../types";

/**
 * Migration: Add Product Analytics Fields
 * Version: 20250721000002
 * Description: Add analytics tracking fields to products for better inventory management
 * Created: 2025-01-21T00:00:02.000Z
 */
const migration: IMigration = {
  name: "Add Product Analytics Fields",
  version: "20250721000002",
  description:
    "Add analytics tracking fields to products for better inventory management",

  /**
   * Apply migration
   */
  async up(): Promise<void> {
    try {
      console.log("Running migration: Add Product Analytics Fields");

      // Add new analytics fields to all existing products
      await mongoose.connection.collection("products").updateMany(
        {},
        {
          $set: {
            // Analytics fields
            viewCount: 0,
            lastViewedAt: null,
            averageOrderQuantity: 0,
            reorderPoint: 10, // Default reorder point
            leadTimedays: 7, // Default lead time in days

            // Status fields
            isActive: true,
            isDiscontinued: false,

            // Additional tracking
            lastStockUpdate: new Date(),
            totalRevenue: 0,
            profitMargin: 0,

            // Supplier information
            supplierId: null,
            supplierName: null,
            supplierContactInfo: null,

            // Additional product metadata
            barcode: null,
            sku: null,
            weight: null,
            dimensions: {
              length: null,
              width: null,
              height: null,
            },

            // SEO and marketing
            tags: [],
            searchKeywords: [],
            metaDescription: null,
          },
        }
      );

      // Create new indexes for the analytics fields
      await mongoose.connection
        .collection("products")
        .createIndex(
          { viewCount: -1 },
          { name: "products_view_count_desc_index" }
        );

      await mongoose.connection
        .collection("products")
        .createIndex(
          { reorderPoint: 1, stock: 1 },
          { name: "products_reorder_analysis_index" }
        );

      await mongoose.connection
        .collection("products")
        .createIndex(
          { isActive: 1, isDiscontinued: 1 },
          { name: "products_status_index" }
        );

      await mongoose.connection
        .collection("products")
        .createIndex({ tags: 1 }, { name: "products_tags_index" });

      await mongoose.connection
        .collection("products")
        .createIndex(
          { lastStockUpdate: -1 },
          { name: "products_last_stock_update_desc_index" }
        );

      // Update profit margin for existing products (price - cost) / price * 100
      const products = await mongoose.connection
        .collection("products")
        .find({})
        .toArray();

      for (const product of products) {
        if (product.price && product.cost && product.price > 0) {
          const profitMargin =
            ((product.price - product.cost) / product.price) * 100;
          const totalRevenue = (product.sold || 0) * product.price;

          await mongoose.connection.collection("products").updateOne(
            { _id: product._id },
            {
              $set: {
                profitMargin: Math.round(profitMargin * 100) / 100, // Round to 2 decimal places
                totalRevenue: totalRevenue,
                // Set SKU as uppercase version of code if not exists
                sku: product.code ? product.code.toUpperCase() : null,
              },
            }
          );
        }
      }

      console.log(
        "Migration Add Product Analytics Fields completed successfully"
      );
    } catch (error: any) {
      console.error(
        "Migration Add Product Analytics Fields failed:",
        error.message
      );
      throw error;
    }
  },

  /**
   * Rollback migration
   */
  async down(): Promise<void> {
    try {
      console.log("Rolling back migration: Add Product Analytics Fields");

      // Remove the analytics fields from all products
      await mongoose.connection.collection("products").updateMany(
        {},
        {
          $unset: {
            viewCount: 1,
            lastViewedAt: 1,
            averageOrderQuantity: 1,
            reorderPoint: 1,
            leadTimedays: 1,
            isActive: 1,
            isDiscontinued: 1,
            lastStockUpdate: 1,
            totalRevenue: 1,
            profitMargin: 1,
            supplierId: 1,
            supplierName: 1,
            supplierContactInfo: 1,
            barcode: 1,
            sku: 1,
            weight: 1,
            dimensions: 1,
            tags: 1,
            searchKeywords: 1,
            metaDescription: 1,
          },
        }
      );

      // Drop the indexes created for analytics fields
      const indexesToDrop = [
        "products_view_count_desc_index",
        "products_reorder_analysis_index",
        "products_status_index",
        "products_tags_index",
        "products_last_stock_update_desc_index",
      ];

      for (const indexName of indexesToDrop) {
        try {
          await mongoose.connection.collection("products").dropIndex(indexName);
          console.log(`Dropped index: ${indexName}`);
        } catch (error: any) {
          console.warn(`Failed to drop index ${indexName}: ${error.message}`);
        }
      }

      console.log(
        "Rollback Add Product Analytics Fields completed successfully"
      );
    } catch (error: any) {
      console.error(
        "Rollback Add Product Analytics Fields failed:",
        error.message
      );
      throw error;
    }
  },
};

export default migration;
