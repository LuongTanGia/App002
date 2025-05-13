import { FastifyInstance } from "fastify";
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomerDebt,
  getCustomers_Small,
} from "./customer.controller";

const customerRoutes = async (app: FastifyInstance) => {
  app.get("/", getCustomers);
  app.get("/:id", getCustomerById);
  app.post("/", createCustomer);
  app.get("/list", getCustomers_Small);

  app.post("/update-debt", updateCustomerDebt);
};

export default customerRoutes;
