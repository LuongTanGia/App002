# Testing Guide

## Overview

This project includes a comprehensive testing suite with unit tests, integration tests, and proper test coverage reporting.

## Test Structure

```
tests/
├── setup.ts                    # Global test setup
├── setup.unit.ts              # Unit test setup
├── setup.integration.ts       # Integration test setup
├── utils/
│   ├── testUtils.ts           # Test utilities and helpers
│   └── mockUtils.ts           # Mock utilities
├── unit/                      # Unit tests
│   ├── auth/
│   ├── product/
│   ├── customer/
│   └── utils/
└── integration/               # Integration tests
    ├── auth/
    ├── product/
    └── customer/
```

## Test Types

### Unit Tests

- Test individual functions and methods in isolation
- Use mocks for external dependencies
- Fast execution
- Located in `tests/unit/`

### Integration Tests

- Test complete API endpoints
- Use in-memory MongoDB for database operations
- Test middleware, validation, and error handling
- Located in `tests/integration/`

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Unit Tests Only

```bash
npm run test:unit
```

### Run Integration Tests Only

```bash
npm run test:integration
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Watch Mode (for development)

```bash
npm run test:watch
```

## Test Configuration

### Jest Configuration

- **jest.config.js**: Main Jest configuration
- **jest.unit.config.js**: Unit test specific configuration
- **jest.integration.config.js**: Integration test specific configuration

### Coverage Thresholds

Current coverage thresholds are set to:

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Test Environment

### Environment Variables

Tests use `.env.test` file for configuration:

- `NODE_ENV=test`
- `JWT_SECRET`: Test JWT secret
- `MONGO_URI`: MongoDB connection (overridden by in-memory DB in integration tests)

### In-Memory Database

Integration tests use MongoDB Memory Server for:

- Isolated test environment
- Fast test execution
- Automatic cleanup between tests

## Writing Tests

### Unit Test Example

```typescript
import { SecurityUtils } from "../../../src/utils/security.utils";

describe("SecurityUtils", () => {
  describe("validatePassword", () => {
    it("should validate a strong password", () => {
      const strongPassword = "Test123456!";

      expect(() =>
        SecurityUtils.validatePassword(strongPassword)
      ).not.toThrow();
    });

    it("should reject weak password", () => {
      const weakPassword = "123";

      expect(() => SecurityUtils.validatePassword(weakPassword)).toThrow(
        "Password must be at least 8 characters long"
      );
    });
  });
});
```

### Integration Test Example

```typescript
import request from "supertest";
import { TestUtils } from "../../utils/testUtils";

describe("Auth Routes", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await TestUtils.createTestApp();
  });

  it("should register user successfully", async () => {
    const userData = {
      username: "testuser",
      email: "test@example.com",
      password: "Test123456",
    };

    const response = await request(app.server)
      .post("/api/auth/register")
      .send(userData)
      .expect(201);

    expect(response.body.message).toBe("User registered successfully");
  });
});
```

## Test Utilities

### TestUtils

Helper class providing:

- `createTestUser()`: Create test users
- `createTestProduct()`: Create test products
- `createTestCustomer()`: Create test customers
- `cleanupDatabase()`: Clean test data
- `getAuthHeaders()`: Generate auth headers

### MockUtils

Helper class providing:

- `createMockRequest()`: Mock Fastify request
- `createMockReply()`: Mock Fastify reply
- `mockJWT()`: Mock JWT functions
- `mockBcrypt()`: Mock bcrypt functions

## Best Practices

### Unit Tests

1. **Test one thing at a time**: Each test should focus on a single behavior
2. **Use descriptive test names**: Test names should clearly describe what is being tested
3. **Mock external dependencies**: Isolate the code under test
4. **Test edge cases**: Include tests for error conditions and boundary values

### Integration Tests

1. **Test complete user journeys**: Test real API workflows
2. **Use clean database state**: Each test should start with a clean slate
3. **Test authentication and authorization**: Verify security measures
4. **Test validation**: Verify input validation works correctly

### General Guidelines

1. **Follow AAA pattern**: Arrange, Act, Assert
2. **Keep tests independent**: Tests should not depend on each other
3. **Use meaningful assertions**: Verify the specific behavior you care about
4. **Clean up resources**: Ensure proper cleanup in afterEach/afterAll hooks

## Coverage Reports

After running `npm run test:coverage`, coverage reports are generated in:

- `coverage/lcov-report/index.html`: HTML coverage report
- `coverage/lcov.info`: LCOV format for CI/CD integration
- Console output with coverage summary

## CI/CD Integration

The test suite is designed to work with CI/CD pipelines:

- All tests use in-memory databases (no external dependencies)
- Environment variables are properly configured
- Coverage reports can be uploaded to services like Codecov
- Tests provide proper exit codes for CI/CD integration

## Troubleshooting

### Common Issues

1. **MongoDB Memory Server fails to start**

   - Ensure you have sufficient memory available
   - Check if port is already in use
   - Try restarting the test suite

2. **JWT Secret missing**

   - Ensure `.env.test` file exists
   - Check if `JWT_SECRET` is properly set

3. **Tests timeout**

   - Check if async operations are properly awaited
   - Increase timeout in Jest configuration if needed

4. **Coverage too low**
   - Add more unit tests for uncovered code paths
   - Focus on critical business logic first
   - Use coverage reports to identify gaps

## Contributing

When adding new features:

1. Write unit tests for new utility functions
2. Write integration tests for new API endpoints
3. Ensure coverage thresholds are met
4. Update this README if test patterns change
