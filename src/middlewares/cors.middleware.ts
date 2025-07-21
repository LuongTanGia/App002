import { FastifyRequest, FastifyReply } from "fastify";
import { SecurityConfig } from "../config/security.config";
import HttpStatusCode from "../errors/HttpStatusCode";

interface CorsOptions {
  origin?: string | string[] | ((origin: string) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
}

export class CorsHandler {
  private options: CorsOptions;

  constructor(options: CorsOptions = {}) {
    this.options = {
      origin: "*",
      methods: [...SecurityConfig.CORS.ALLOWED_METHODS],
      allowedHeaders: [...SecurityConfig.CORS.ALLOWED_HEADERS],
      credentials: true,
      maxAge: SecurityConfig.CORS.MAX_AGE,
      preflightContinue: false,
      ...options,
    };
  }

  private isOriginAllowed(origin: string): boolean {
    if (!this.options.origin) return true;

    if (typeof this.options.origin === "string") {
      return this.options.origin === "*" || this.options.origin === origin;
    }

    if (Array.isArray(this.options.origin)) {
      return (
        this.options.origin.includes(origin) ||
        this.options.origin.includes("*")
      );
    }

    if (typeof this.options.origin === "function") {
      return this.options.origin(origin);
    }

    return false;
  }

  private setCorsHeaders(request: FastifyRequest, reply: FastifyReply): void {
    const origin = request.headers.origin as string;

    if (origin && this.isOriginAllowed(origin)) {
      reply.header("Access-Control-Allow-Origin", origin);
    } else if (this.options.origin === "*") {
      reply.header("Access-Control-Allow-Origin", "*");
    }

    if (this.options.credentials) {
      reply.header("Access-Control-Allow-Credentials", "true");
    }

    if (this.options.methods && this.options.methods.length > 0) {
      reply.header(
        "Access-Control-Allow-Methods",
        this.options.methods.join(", ")
      );
    }

    if (this.options.allowedHeaders && this.options.allowedHeaders.length > 0) {
      reply.header(
        "Access-Control-Allow-Headers",
        this.options.allowedHeaders.join(", ")
      );
    }

    if (this.options.maxAge) {
      reply.header("Access-Control-Max-Age", this.options.maxAge.toString());
    }

    // Expose common headers
    reply.header(
      "Access-Control-Expose-Headers",
      "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset"
    );
  }

  middleware() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      // Handle preflight requests (OPTIONS)
      if (request.method === "OPTIONS") {
        this.setCorsHeaders(request, reply);

        if (!this.options.preflightContinue) {
          reply.status(HttpStatusCode.NO_CONTENT).send();
          return;
        }
      } else {
        // Handle actual requests
        this.setCorsHeaders(request, reply);
      }
    };
  }
}

// Default CORS middleware
export const corsMiddleware = new CorsHandler().middleware();
