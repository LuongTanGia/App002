import { FastifyReply, FastifyRequest } from "fastify";
import { z, ZodSchema } from "zod";
import { ValidationError } from "../errors/AppError";

export interface ValidationOptions {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

export const validate = (schemas: ValidationOptions) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate request body
      if (schemas.body && request.body) {
        const validatedBody = schemas.body.parse(request.body);
        request.body = validatedBody;
      }

      // Validate request params
      if (schemas.params && request.params) {
        const validatedParams = schemas.params.parse(request.params);
        request.params = validatedParams;
      }

      // Validate request query
      if (schemas.query && request.query) {
        const validatedQuery = schemas.query.parse(request.query);
        request.query = validatedQuery;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorDetails = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        throw new ValidationError("Validation failed", errorDetails);
      }
      throw error;
    }
  };
};

// Helper function for async validation
export const validateAsync = async <T>(
  schema: ZodSchema<T>,
  data: unknown
): Promise<T> => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorDetails = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code,
      }));

      throw new ValidationError("Validation failed", errorDetails);
    }
    throw error;
  }
};
