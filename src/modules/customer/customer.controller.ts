import { FastifyReply, FastifyRequest } from "fastify";
import Customer from "./customer.model";
import HttpStatusCode from "../../errors/HttpStatusCode";

export const getCustomers = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const customers = await Customer.find();
    return reply.status(HttpStatusCode.OK).send(customers);
  } catch (error: any) {
    return reply
      .status(HttpStatusCode.INTERNAL_SERVER_ERROR)
      .send({ error: "Error fetching customers", details: error.message });
  }
};
export const getCustomers_Small = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const customers = await Customer.find();
    return reply.status(HttpStatusCode.OK).send(
      customers.map((customer) => ({
        id: customer._id,
        name: customer.name,
      }))
    );
  } catch (error: any) {
    return reply
      .status(HttpStatusCode.INTERNAL_SERVER_ERROR)
      .send({ error: "Error fetching customers", details: error.message });
  }
};
export const getCustomerById = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return reply
        .status(HttpStatusCode.NOT_FOUND)
        .send({ error: "Customer not found" });
    }
    return reply.status(HttpStatusCode.OK).send(customer);
  } catch (error: any) {
    return reply
      .status(HttpStatusCode.INTERNAL_SERVER_ERROR)
      .send({ error: "Error fetching customer", details: error.message });
  }
};
export const createCustomer = async (
  req: FastifyRequest<{
    Body: { name: string; email: string; phone: string; address: string };
  }>,
  reply: FastifyReply
) => {
  try {
    const { name, email, phone, address } = req.body;

    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return reply
        .status(HttpStatusCode.BAD_REQUEST)
        .send({ error: "Customer with the same email already exists" });
    }
    const customer = new Customer({
      name,
      email,
      phone,
      address,
    });
    await customer.save();
    return reply.status(HttpStatusCode.INSERT_OK).send(customer);
  } catch (error: any) {
    return reply
      .status(HttpStatusCode.INTERNAL_SERVER_ERROR)
      .send({ error: "Error creating customer", details: error.message });
  }
};
export const updateCustomerDebt = async (
  req: FastifyRequest<{
    Body: { total: number; customerId: string; note: string };
  }>,
  reply: FastifyReply
) => {
  try {
    const { total, customerId, note } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return reply
        .status(HttpStatusCode.NOT_FOUND)
        .send({ error: "Customer not found" });
    }
    customer.debt = (customer.debt || 0) + total;
    customer.transactions.push({
      amount: total,
      date: new Date(),
      note: note || "",
      performedBy: req.user?.name || "System",
    });
    await customer.save();
    return reply.status(HttpStatusCode.OK).send(customer);
  } catch (error: any) {
    return reply
      .status(HttpStatusCode.INTERNAL_SERVER_ERROR)
      .send({ error: "Error updating customer debt", details: error.message });
  }
};
