import { FastifyReply, FastifyRequest } from "fastify";
import Customer from "./customer.model";
import HttpStatusCode from "../../errors/HttpStatusCode";
import { ErrorResponse } from "../../types/common.types";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  DatabaseError,
} from "../../errors/AppError";
import { validateAsync } from "../../validators/validator";
import {
  createCustomerSchema,
  updateCustomerDebtSchema,
  customerParamsSchema,
} from "../../validators/schemas";
import {
  CreateCustomerBody,
  UpdateCustomerDebtBody,
  CustomerParams,
  CustomerSummary,
} from "./customer.types";

/**
 * Get all customers with complete information
 */
export const getAllCustomers = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const customers = await Customer.find().select("-__v").lean();
    reply.status(HttpStatusCode.OK).send(customers);
  } catch (error) {
    throw new DatabaseError("Failed to fetch customers");
  }
};
/**
 * Get customers summary (id and name only) for dropdowns/selection
 */
export const getCustomersSummary = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const customers = await Customer.find().select("name").lean();
    const customersSummary: CustomerSummary[] = customers.map((customer) => ({
      id: customer._id.toString(),
      name: customer.name,
    }));

    reply.status(HttpStatusCode.OK).send(customersSummary);
  } catch (error) {
    throw new DatabaseError("Failed to fetch customers summary");
  }
};
/**
 * Get customer by ID
 */
export const getCustomerById = async (
  req: FastifyRequest<{ Params: CustomerParams }>,
  reply: FastifyReply
): Promise<void> => {
  // Validate params
  const validatedParams = await validateAsync(customerParamsSchema, req.params);
  const { id } = validatedParams;

  try {
    const customer = await Customer.findById(id).select("-__v").lean();

    if (!customer) {
      throw new NotFoundError("Customer not found");
    }

    reply.status(HttpStatusCode.OK).send(customer);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to fetch customer");
  }
};
/**
 * Create a new customer
 */
export const createCustomer = async (
  req: FastifyRequest<{ Body: CreateCustomerBody }>,
  reply: FastifyReply
): Promise<void> => {
  // Validate request body
  const validatedBody = await validateAsync(createCustomerSchema, req.body);
  const { name, email, phone, address } = validatedBody;

  try {
    // Check for existing customer with same email
    const existingCustomer = await Customer.findOne({
      email: email.toLowerCase(),
    });

    if (existingCustomer) {
      throw new ConflictError("Customer with this email already exists");
    }

    const customer = new Customer({
      name,
      email: email.toLowerCase(),
      phone,
      address,
    });

    await customer.save();

    // Return clean response
    const customerResponse = customer.toObject();
    const { __v, ...cleanCustomerResponse } = customerResponse;

    reply.status(HttpStatusCode.CREATED).send(cleanCustomerResponse);
  } catch (error) {
    if (error instanceof ConflictError) {
      throw error;
    }
    throw new DatabaseError("Failed to create customer");
  }
};
/**
 * Update customer debt and add transaction record
 */
export const updateCustomerDebt = async (
  req: FastifyRequest<{ Body: UpdateCustomerDebtBody }>,
  reply: FastifyReply
): Promise<void> => {
  // Validate request body
  const validatedBody = await validateAsync(updateCustomerDebtSchema, req.body);
  const { total, customerId, note } = validatedBody;

  try {
    const customer = await Customer.findById(customerId);

    if (!customer) {
      throw new NotFoundError("Customer not found");
    }

    // Update debt and add transaction
    customer.debt = (customer.debt || 0) + total;
    customer.transactions.push({
      amount: total,
      date: new Date(),
      note: note?.trim() || "",
      performedBy: req.user?.userName || "System",
    });

    await customer.save();

    // Return clean response
    const customerResponse = customer.toObject();
    const { __v, ...cleanCustomerResponse } = customerResponse;

    reply.status(HttpStatusCode.OK).send(cleanCustomerResponse);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError("Failed to update customer debt");
  }
};
