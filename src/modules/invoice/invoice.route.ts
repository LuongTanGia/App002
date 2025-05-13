import { FastifyInstance } from "fastify";
import { createInvoice, getInvoices } from "./invoice.controller";

const invoiceRoutes = async (app: FastifyInstance) => {
  app.post("/", createInvoice);
  app.get("/", getInvoices);
};

export default invoiceRoutes;
