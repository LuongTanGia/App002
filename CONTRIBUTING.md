# Contributing to Inventory Management API

Thank you for your interest in contributing to this project! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js >= 16.x
- MongoDB >= 5.x
- Git

### Setup Development Environment

1. **Fork and Clone**

   ```bash
   git clone https://github.com/your-username/App002.git
   cd App002
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Setup Environment**

   ```bash
   cp .env.example .env
   # Configure your environment variables
   ```

4. **Run Migrations**

   ```bash
   npm run migrate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## 📋 Development Workflow

### Branch Naming

- **Feature**: `feature/description-of-feature`
- **Bug Fix**: `fix/description-of-bug`
- **Hotfix**: `hotfix/description-of-hotfix`
- **Documentation**: `docs/description-of-changes`

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(auth): add JWT token refresh functionality
fix(products): resolve stock calculation bug
docs(readme): update API documentation
test(auth): add integration tests for login endpoint
```

### Pull Request Process

1. **Create Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow code style guidelines
   - Write/update tests
   - Update documentation if needed

3. **Quality Checks**

   ```bash
   npm run lint          # Check linting
   npm run type-check    # TypeScript validation
   npm run test:all      # Run all tests
   npm run format        # Format code
   ```

4. **Commit Changes**

   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 🧪 Testing Guidelines

### Test Structure

```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
└── utils/          # Test utilities
```

### Writing Tests

**Unit Tests:**

- Test individual functions/methods
- Mock external dependencies
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

```typescript
describe("UserService", () => {
  describe("createUser", () => {
    it("should create user with valid data", async () => {
      // Arrange
      const userData = { name: "John", email: "john@example.com" };

      // Act
      const result = await UserService.createUser(userData);

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
    });
  });
});
```

**Integration Tests:**

- Test complete API workflows
- Use clean database state
- Test authentication/authorization
- Verify input validation

### Test Requirements

- All new features must include tests
- Maintain coverage thresholds (70%)
- Tests must pass in CI/CD pipeline

## 📝 Code Style Guidelines

### TypeScript Best Practices

- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use explicit return types for public methods
- Avoid `any` type, use specific types

### Code Organization

- Follow existing folder structure
- One class/interface per file
- Use barrel exports (index.ts files)
- Group related functionality

### Error Handling

- Use custom error classes
- Provide meaningful error messages
- Handle errors at appropriate levels
- Log errors with context

### API Design

- Follow RESTful conventions
- Use appropriate HTTP status codes
- Implement proper validation
- Document all endpoints

## 🔒 Security Guidelines

### Input Validation

- Validate all inputs using Zod schemas
- Sanitize user inputs
- Use parameterized queries
- Implement rate limiting

### Authentication & Authorization

- Use JWT tokens securely
- Implement proper session management
- Follow principle of least privilege
- Validate permissions on all endpoints

## 📚 Documentation Guidelines

### Code Documentation

- Use JSDoc comments for public methods
- Document complex algorithms
- Include examples in documentation
- Keep comments up-to-date

### API Documentation

- Update Swagger/OpenAPI specs
- Include request/response examples
- Document error responses
- Update README for new features

## 🐛 Bug Reports

### Before Submitting

1. Check existing issues
2. Test with latest version
3. Reproduce the bug consistently
4. Gather system information

### Bug Report Template

```markdown
## Bug Description

Brief description of the bug.

## Steps to Reproduce

1. Step one
2. Step two
3. Expected vs actual behavior

## Environment

- Node.js version:
- MongoDB version:
- OS:

## Additional Context

Any other relevant information.
```

## 💡 Feature Requests

### Feature Request Template

```markdown
## Feature Description

Brief description of the feature.

## Use Case

Why is this feature needed?

## Proposed Solution

How should this feature work?

## Alternatives

Other solutions considered.
```

## 📞 Getting Help

- **Issues**: Create GitHub issue
- **Discussions**: Use GitHub Discussions
- **Documentation**: Check README.md
- **API Docs**: Visit `/docs` endpoint

## 🎯 Code Review Process

### For Reviewers

- Check code quality and style
- Verify tests are included
- Test functionality locally
- Provide constructive feedback
- Approve when ready

### For Contributors

- Address review comments
- Update PR based on feedback
- Be responsive to reviewers
- Keep PR focused and small

## 🏆 Recognition

Contributors will be:

- Listed in project contributors
- Credited in release notes
- Recognized in project documentation

Thank you for contributing to make this project better! 🎉
