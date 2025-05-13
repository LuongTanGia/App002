import mongoose from "mongoose";

const { Schema } = mongoose;

const transactionSchema = new Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
    },
    performedBy: {
      type: String,
      required: false,
    },
  },
  {
    _id: false, // Không cần tạo _id riêng cho mỗi giao dịch
  }
);

const customerSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    debt: {
      type: Number,
      required: true,
      default: 0, // Công nợ ban đầu là 0
    },
    transactions: {
      type: [transactionSchema], // Mảng các giao dịch
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Customer = mongoose.model("Customer", customerSchema);

export default Customer;
