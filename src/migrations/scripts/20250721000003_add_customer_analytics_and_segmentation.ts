import mongoose from "mongoose";
import { IMigration } from "../types";

/**
 * Migration: Add Customer Analytics And Segmentation
 * Version: 20250721000003
 * Description: Add customer analytics, segmentation, and behavior tracking fields
 * Created: 2025-01-21T00:00:03.000Z
 */
const migration: IMigration = {
  name: "Add Customer Analytics And Segmentation",
  version: "20250721000003",
  description:
    "Add customer analytics, segmentation, and behavior tracking fields",

  /**
   * Apply migration
   */
  async up(): Promise<void> {
    try {
      console.log("Running migration: Add Customer Analytics And Segmentation");

      // Add new analytics and segmentation fields to all existing customers
      await mongoose.connection.collection("customers").updateMany(
        {},
        {
          $set: {
            // Customer analytics
            totalOrders: 0,
            totalSpent: 0,
            averageOrderValue: 0,
            lastOrderDate: null,
            firstOrderDate: null,

            // Customer lifecycle
            customerSince: new Date(),
            lastContactDate: null,
            lifecycleStage: "new", // new, active, at-risk, churned, vip

            // Behavioral data
            preferredOrderDays: [], // Array of day names
            averageTimeBetweenOrders: 0, // days
            seasonalityPattern: null,

            // Segmentation
            segment: "standard", // standard, premium, vip, wholesale
            riskScore: 0, // 0-100, higher = more risk
            loyaltyPoints: 0,
            creditLimit: 0,
            paymentTerms: "immediate", // immediate, net_7, net_15, net_30

            // Contact preferences
            preferredContactMethod: "email", // email, phone, sms
            marketingOptIn: true,
            notifications: {
              orderUpdates: true,
              promotions: true,
              newProducts: false,
              paymentReminders: true,
            },

            // Additional customer data
            company: null,
            taxId: null,
            website: null,
            industry: null,
            source: "direct", // direct, referral, online, advertising

            // Geographic and delivery
            deliveryInstructions: null,
            preferredDeliveryTime: null,

            // Status flags
            isActive: true,
            isBlocked: false,
            isVip: false,

            // Notes and tags
            tags: [],
            internalNotes: null,
          },
        }
      );

      // Calculate analytics for existing customers based on existing transaction data
      const customers = await mongoose.connection
        .collection("customers")
        .find({})
        .toArray();

      for (const customer of customers) {
        let analytics = {
          totalOrders: 0,
          totalSpent: 0,
          averageOrderValue: 0,
          lastOrderDate: null as Date | null,
          firstOrderDate: null as Date | null,
          riskScore: 0,
        };

        // Calculate from existing transactions if they exist
        if (customer.transactions && customer.transactions.length > 0) {
          const validTransactions = customer.transactions.filter(
            (t: any) => t.amount !== undefined
          );

          if (validTransactions.length > 0) {
            // Count positive transactions as orders (purchases)
            const orderTransactions = validTransactions.filter(
              (t: any) => t.amount > 0
            );
            analytics.totalOrders = orderTransactions.length;

            // Calculate total spent (sum of positive amounts)
            analytics.totalSpent = orderTransactions.reduce(
              (sum: number, t: any) => sum + Math.abs(t.amount),
              0
            );

            // Calculate average order value
            if (analytics.totalOrders > 0) {
              analytics.averageOrderValue =
                analytics.totalSpent / analytics.totalOrders;
            }

            // Get date range
            const dates = validTransactions
              .map((t: any) => (t.date ? new Date(t.date) : new Date()))
              .sort((a: Date, b: Date) => a.getTime() - b.getTime());

            if (dates.length > 0) {
              analytics.firstOrderDate = dates[0];
              analytics.lastOrderDate = dates[dates.length - 1];
            }
          }

          // Calculate risk score based on debt and payment history
          const currentDebt = customer.debt || 0;
          if (currentDebt < -1000) {
            // High debt
            analytics.riskScore = Math.min(80, Math.abs(currentDebt) / 100);
          } else if (currentDebt < -500) {
            // Medium debt
            analytics.riskScore = Math.min(50, Math.abs(currentDebt) / 50);
          } else {
            analytics.riskScore = Math.max(0, Math.abs(currentDebt) / 10);
          }
        }

        // Determine segment based on analytics
        let segment = "standard";
        let lifecycleStage = "new";
        let isVip = false;

        if (analytics.totalSpent > 10000) {
          segment = "vip";
          isVip = true;
          lifecycleStage = "active";
        } else if (analytics.totalSpent > 5000) {
          segment = "premium";
          lifecycleStage = "active";
        } else if (analytics.totalOrders > 5) {
          lifecycleStage = "active";
        }

        // Check if customer is at risk (no orders in last 90 days)
        if (analytics.lastOrderDate) {
          const daysSinceLastOrder =
            (Date.now() - analytics.lastOrderDate.getTime()) /
            (1000 * 60 * 60 * 24);
          if (daysSinceLastOrder > 90) {
            lifecycleStage = "at-risk";
          }
          if (daysSinceLastOrder > 365) {
            lifecycleStage = "churned";
          }
        }

        // Update customer with calculated analytics
        await mongoose.connection.collection("customers").updateOne(
          { _id: customer._id },
          {
            $set: {
              ...analytics,
              segment,
              lifecycleStage,
              isVip,
              customerSince: customer.createdAt || new Date(),
            },
          }
        );
      }

      // Create indexes for analytics and segmentation queries
      await mongoose.connection
        .collection("customers")
        .createIndex({ segment: 1 }, { name: "customers_segment_index" });

      await mongoose.connection
        .collection("customers")
        .createIndex(
          { lifecycleStage: 1 },
          { name: "customers_lifecycle_stage_index" }
        );

      await mongoose.connection
        .collection("customers")
        .createIndex(
          { totalSpent: -1 },
          { name: "customers_total_spent_desc_index" }
        );

      await mongoose.connection
        .collection("customers")
        .createIndex(
          { lastOrderDate: -1 },
          { name: "customers_last_order_date_desc_index" }
        );

      await mongoose.connection
        .collection("customers")
        .createIndex(
          { riskScore: -1 },
          { name: "customers_risk_score_desc_index" }
        );

      await mongoose.connection
        .collection("customers")
        .createIndex(
          { isVip: 1, totalSpent: -1 },
          { name: "customers_vip_spending_index" }
        );

      await mongoose.connection
        .collection("customers")
        .createIndex({ tags: 1 }, { name: "customers_tags_index" });

      await mongoose.connection
        .collection("customers")
        .createIndex(
          { isActive: 1, isBlocked: 1 },
          { name: "customers_status_index" }
        );

      console.log(
        "Migration Add Customer Analytics And Segmentation completed successfully"
      );
    } catch (error: any) {
      console.error(
        "Migration Add Customer Analytics And Segmentation failed:",
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
      console.log(
        "Rolling back migration: Add Customer Analytics And Segmentation"
      );

      // Remove all analytics and segmentation fields
      await mongoose.connection.collection("customers").updateMany(
        {},
        {
          $unset: {
            totalOrders: 1,
            totalSpent: 1,
            averageOrderValue: 1,
            lastOrderDate: 1,
            firstOrderDate: 1,
            customerSince: 1,
            lastContactDate: 1,
            lifecycleStage: 1,
            preferredOrderDays: 1,
            averageTimeBetweenOrders: 1,
            seasonalityPattern: 1,
            segment: 1,
            riskScore: 1,
            loyaltyPoints: 1,
            creditLimit: 1,
            paymentTerms: 1,
            preferredContactMethod: 1,
            marketingOptIn: 1,
            notifications: 1,
            company: 1,
            taxId: 1,
            website: 1,
            industry: 1,
            source: 1,
            deliveryInstructions: 1,
            preferredDeliveryTime: 1,
            isActive: 1,
            isBlocked: 1,
            isVip: 1,
            tags: 1,
            internalNotes: 1,
          },
        }
      );

      // Drop all indexes created for analytics
      const indexesToDrop = [
        "customers_segment_index",
        "customers_lifecycle_stage_index",
        "customers_total_spent_desc_index",
        "customers_last_order_date_desc_index",
        "customers_risk_score_desc_index",
        "customers_vip_spending_index",
        "customers_tags_index",
        "customers_status_index",
      ];

      for (const indexName of indexesToDrop) {
        try {
          await mongoose.connection
            .collection("customers")
            .dropIndex(indexName);
          console.log(`Dropped index: ${indexName}`);
        } catch (error: any) {
          console.warn(`Failed to drop index ${indexName}: ${error.message}`);
        }
      }

      console.log(
        "Rollback Add Customer Analytics And Segmentation completed successfully"
      );
    } catch (error: any) {
      console.error(
        "Rollback Add Customer Analytics And Segmentation failed:",
        error.message
      );
      throw error;
    }
  },
};

export default migration;
