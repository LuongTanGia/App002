import { FastifyInstance } from "fastify";
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomerDebt,
  getCustomersSummary,
} from "./customer.controller";
import {
  validateCreateCustomer,
  validateUpdateCustomerDebt,
  validateCustomerParams,
} from "../../middlewares/validation.middleware";

const customerRoutes = async (app: FastifyInstance) => {
  // Get routes
  app.get("/", getAllCustomers);
  app.get("/summary", getCustomersSummary);

  // Routes with validation
  app.route({
    method: "GET",
    url: "/:id",
    preHandler: validateCustomerParams,
    handler: getCustomerById as any,
  });

  app.route({
    method: "POST",
    url: "/",
    preHandler: validateCreateCustomer,
    handler: createCustomer as any,
  });

  app.route({
    method: "POST",
    url: "/update-debt",
    preHandler: validateUpdateCustomerDebt,
    handler: updateCustomerDebt as any,
  });
};

export default customerRoutes;
