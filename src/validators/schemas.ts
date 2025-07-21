import { z } from "zod";

// Common validation schemas
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format");

export const emailSchema = z.string().email("Invalid email format");

export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters long");

export const positiveNumberSchema = z
  .number()
  .positive("Must be a positive number");

export const nonNegativeNumberSchema = z
  .number()
  .min(0, "Must be a non-negative number");

export const requiredStringSchema = z
  .string()
  .min(1, "This field is required")
  .trim();

// Customer validation schemas
export const createCustomerSchema = z.object({
  name: requiredStringSchema,
  email: emailSchema,
  phone: requiredStringSchema,
  address: requiredStringSchema,
});

export const updateCustomerDebtSchema = z.object({
  total: z.number().refine((val) => val !== 0, "Total amount cannot be zero"),
  customerId: objectIdSchema,
  note: z.string().optional(),
});

export const customerParamsSchema = z.object({
  id: objectIdSchema,
});

// Auth validation schemas
export const registerUserSchema = z.object({
  username: requiredStringSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginUserSchema = z.object({
  email: emailSchema,
  password: requiredStringSchema,
});

// Product validation schemas
export const createProductSchema = z.object({
  name: requiredStringSchema,
  description: requiredStringSchema,
  price: nonNegativeNumberSchema,
  cost: nonNegativeNumberSchema,
  stock: nonNegativeNumberSchema,
  category: requiredStringSchema,
  code: requiredStringSchema,
  ordered: nonNegativeNumberSchema.optional().default(0),
});

export const createProductListItemSchema = z.object({
  TenHang: requiredStringSchema,
  GiaVon: nonNegativeNumberSchema,
  GiaBan: nonNegativeNumberSchema,
  TonKho: nonNegativeNumberSchema,
  KhachDat: nonNegativeNumberSchema,
  MaHang: requiredStringSchema,
});

export const createProductListSchema = z
  .array(createProductListItemSchema)
  .min(1, "At least one product is required");

export const stockTransactionSchema = z.object({
  productId: objectIdSchema,
  quantity: positiveNumberSchema,
  note: z.string().optional(),
});

export const deleteProductSchema = z.object({
  productId: objectIdSchema,
});

export const productParamsSchema = z.object({
  id: objectIdSchema,
});

// Invoice validation schemas
export const invoiceItemSchema = z.object({
  productId: objectIdSchema,
  quantity: positiveNumberSchema,
});

export const createInvoiceSchema = z.object({
  customerId: objectIdSchema,
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});
