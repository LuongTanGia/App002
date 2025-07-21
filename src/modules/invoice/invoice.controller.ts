import { FastifyReply, FastifyRequest } from "fastify";
import Invoice from "./invoice.model";
import Product from "../product/product.model";
import Customer from "../customer/customer.model";
import HttpStatusCode from "../../errors/HttpStatusCode";
import { ErrorResponse } from "../../types/common.types";
import { CreateInvoiceBody } from "./invoice.types";

export const createInvoice = async (
  req: FastifyRequest<{ Body: CreateInvoiceBody }>,
  reply: FastifyReply
) => {
  try {
    const { customerId, items } = req.body;

    let totalAmount = 0;
    const invoiceItems = [];
    const userName = (req.user as any)?.userName;
    const customer = await Customer.findById(customerId);

    if (!customer) {
      return reply
        .status(HttpStatusCode.NOT_FOUND)
        .send({ error: `Customer with ID ${customerId} not found` });
    }
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return reply
          .status(HttpStatusCode.NOT_FOUND)
          .send({ error: `Product with ID ${item.productId} not found` });
      }

      if (product.stock < item.quantity) {
        return reply
          .status(HttpStatusCode.BAD_REQUEST)
          .send({ error: `Not enough stock for product ${product.name}` });
      }

      const total = product.price * item.quantity;
      totalAmount += total;
      product.transactions.push({
        type: "OUT",
        quantity: item.quantity,
        note: "",
        performedBy: userName,
        cusName: customer?.name,
      });
      invoiceItems.push({
        productId: product._id,
        productName: product.name,
        quantity: item.quantity,
        price: product.price,
        total,
      });

      // Deduct stock
      product.stock -= item.quantity;
      product.sold += item.quantity;
      await product.save();
    }

    const invoice = new Invoice({
      customerName: customer.name,
      items: invoiceItems,
      totalAmount,
      issuedBy: userName,
    });
    customer.debt = (customer.debt || 0) + totalAmount * -1;
    customer.transactions.push({
      amount: totalAmount * -1,
      performedBy: userName,
      note: "Mua hàng",
    });
    await customer.save();
    await invoice.save();

    return reply.status(HttpStatusCode.INSERT_OK).send(invoice);
  } catch (error: any) {
    return reply
      .status(HttpStatusCode.INTERNAL_SERVER_ERROR)
      .send({ error: "Error creating invoice", details: error.message });
  }
};
export const getInvoices = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const invoices = await Invoice.find();
    return reply.status(HttpStatusCode.OK).send(invoices);
  } catch (error: any) {
    return reply
      .status(HttpStatusCode.INTERNAL_SERVER_ERROR)
      .send({ error: "Error fetching invoices", details: error.message });
  }
};
