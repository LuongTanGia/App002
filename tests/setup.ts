import dotenv from "dotenv";

// Load test environment variables
dotenv.config({ path: ".env.test" });

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_jwt_secret_key_for_testing_purposes_only";

// Global test timeout
jest.setTimeout(30000);
