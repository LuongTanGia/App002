// src/modules/inventory/stock-history.model.ts
import mongoose from "mongoose";

const { Schema } = mongoose;

const stockHistorySchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    type: {
      type: String,
      enum: ["IN", "OUT"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    note: {
      type: String,
    },
    performedBy: {
      type: String,

      required: false,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // sẽ tự sinh `createdAt`, `updatedAt`
  }
);

const StockHistory = mongoose.model("StockHistory", stockHistorySchema);

export default StockHistory;
