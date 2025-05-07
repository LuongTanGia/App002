// src/modules/inventory/product.service.ts
import Product from "./product.model";
import StockHistory from "./stock-history.model";

export const adjustStock = async (
  productId: string,
  type: "IN" | "OUT",
  quantity: number,
  userName?: string,
  note?: string
) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error("Product not found");

  // Cập nhật stock
  if (type === "IN") {
    product.stock += quantity;
  } else {
    if (product.stock < quantity) throw new Error("Not enough stock to remove");
    product.stock -= quantity;
  }
  await StockHistory.create({
    productId,
    type,
    quantity,
    note,
    performedBy: userName ?? null, // gán userId nếu có
    timestamp: new Date(), // có thể bỏ vì timestamps đã tự gen
  });
  await product.save();

  // Ghi vào lịch sử

  return product;
};
