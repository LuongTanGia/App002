import { FastifyInstance } from "fastify";
import { validate } from "../validators/validator";
import {
  createCustomerSchema,
  updateCustomerDebtSchema,
  customerParamsSchema,
  registerUserSchema,
  loginUserSchema,
  createProductSchema,
  createProductListSchema,
  stockTransactionSchema,
  deleteProductSchema,
  productParamsSchema,
  createInvoiceSchema,
} from "../validators/schemas";

// Customer route validations
export const validateCreateCustomer = validate({ body: createCustomerSchema });
export const validateUpdateCustomerDebt = validate({
  body: updateCustomerDebtSchema,
});
export const validateCustomerParams = validate({
  params: customerParamsSchema,
});

// Auth route validations
export const validateRegisterUser = validate({ body: registerUserSchema });
export const validateLoginUser = validate({ body: loginUserSchema });

// Product route validations
export const validateCreateProduct = validate({ body: createProductSchema });
export const validateCreateProductList = validate({
  body: createProductListSchema,
});
export const validateStockTransaction = validate({
  body: stockTransactionSchema,
});
export const validateDeleteProduct = validate({ body: deleteProductSchema });
export const validateProductParams = validate({ params: productParamsSchema });

// Invoice route validations
export const validateCreateInvoice = validate({ body: createInvoiceSchema });
