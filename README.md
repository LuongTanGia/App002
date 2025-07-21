# 🏪 Inventory Management API

A comprehensive **REST API** for inventory management built with **Fastify**, **TypeScript**, and **MongoDB**. This project provides a robust backend solution for managing products, customers, invoices, and user authentication with enterprise-grade features.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white)

## ✨ Features

### 🔐 Authentication & Security

- JWT-based authentication with secure token management
- Bcrypt password hashing with configurable salt rounds
- Rate limiting (global and endpoint-specific)
- Input sanitization and XSS protection
- Security headers (CSP, X-Frame-Options, etc.)
- CORS configuration

### 📦 Product Management

- CRUD operations for products
- Bulk product operations
- Stock management with history tracking
- Product analytics and categorization
- Advanced search and filtering
- Performance optimized queries

### 👥 Customer Management

- Customer profile management
- Customer analytics and segmentation
- Debt tracking and payment history
- Customer lifecycle management
- VIP customer identification

### 📄 Invoice System

- Invoice creation and management
- Product-customer relationship tracking
- Financial reporting capabilities

### 🛠 Developer Experience

- **API Documentation**: Auto-generated Swagger/OpenAPI docs
- **Testing**: Comprehensive unit and integration tests
- **Migration System**: Database schema versioning
- **Performance Monitoring**: Real-time metrics and health checks
- **Type Safety**: Full TypeScript implementation
- **Code Quality**: ESLint + Prettier configuration

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 16.x
- **MongoDB** >= 5.x
- **npm** or **yarn**

### Automated Setup (Recommended)

We provide setup scripts for easy project initialization:

**For Linux/macOS:**

```bash
git clone https://github.com/LuongTanGia/App002.git
cd App002
npm run setup
```

**For Windows:**

```bash
git clone https://github.com/LuongTanGia/App002.git
cd App002
npm run setup:windows
```

### Manual Installation

1. **Clone the repository**

```bash
git clone https://github.com/LuongTanGia/App002.git
cd App002
```

2. **Install dependencies**

```bash
npm install
```

3. **Environment Setup**

```bash
cp .env.example .env
```

4. **Configure environment variables** (see [Environment Variables](#environment-variables))

5. **Run database migrations**

```bash
npm run migrate
```

6. **Start development server**

```bash
npm run dev
```

The API will be available at `http://localhost:3000`
API Documentation: `http://localhost:3000/docs`

## 📋 Environment Variables

Create a `.env` file in the root directory:

```env
# Environment
NODE_ENV=development
PORT=3000

# Database
DB_CONNECTION_STRING=mongodb://localhost:27017/inventory_management
DB_MAX_POOL_SIZE=10
DB_MIN_POOL_SIZE=5

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_at_least_32_characters_long

# Security
BCRYPT_ROUNDS=12

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Rate Limiting
GLOBAL_RATE_LIMIT=100
AUTH_RATE_LIMIT=10

# Swagger
SWAGGER_HOST=localhost:3000
```

### Security Note

- Generate a strong JWT secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- Use strong database credentials in production
- Configure CORS origins appropriately

## 🏗 Project Structure

```
src/
├── app.ts                 # Fastify app configuration
├── server.ts             # Server entry point
├── config/               # Configuration files
│   └── security.config.ts
├── database/             # Database connection
│   └── db.ts
├── errors/               # Error handling
│   ├── AppError.ts
│   ├── errorHandler.ts
│   └── HttpStatusCode.ts
├── middlewares/          # Custom middlewares
│   ├── cors.middleware.ts
│   ├── rateLimit.middleware.ts
│   └── validation.middleware.ts
├── migrations/           # Database migrations
│   ├── cli.ts
│   ├── migrationManager.ts
│   └── scripts/
├── modules/              # Feature modules
│   ├── auth/             # Authentication
│   ├── customer/         # Customer management
│   ├── invoice/          # Invoice system
│   └── product/          # Product management
├── types/                # TypeScript types
├── utils/                # Utility functions
│   ├── cache.utils.ts
│   ├── performance.utils.ts
│   └── security.utils.ts
└── validators/           # Input validation
    ├── schemas.ts
    └── validator.ts

tests/
├── integration/          # Integration tests
├── unit/                # Unit tests
└── utils/               # Test utilities
```

## 📚 API Documentation

### Base URL

```
http://localhost:3000/api
```

### Authentication Endpoints

| Method | Endpoint         | Description       |
| ------ | ---------------- | ----------------- |
| POST   | `/auth/register` | Register new user |
| POST   | `/auth/login`    | User login        |

### Product Endpoints

| Method | Endpoint        | Description        |
| ------ | --------------- | ------------------ |
| GET    | `/products`     | Get all products   |
| GET    | `/products/:id` | Get product by ID  |
| POST   | `/products`     | Create new product |
| PUT    | `/products/:id` | Update product     |
| DELETE | `/products/:id` | Delete product     |

### Customer Endpoints

| Method | Endpoint         | Description         |
| ------ | ---------------- | ------------------- |
| GET    | `/customers`     | Get all customers   |
| GET    | `/customers/:id` | Get customer by ID  |
| POST   | `/customers`     | Create new customer |
| PUT    | `/customers/:id` | Update customer     |

### Interactive Documentation

Visit `http://localhost:3000/docs` for complete interactive API documentation powered by Swagger UI.

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm run test:all

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Structure

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test complete API workflows
- **Test Utilities**: Shared testing helpers and mocks

### Coverage Requirements

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## 🗃 Database Migrations

### Migration Commands

```bash
# Run pending migrations
npm run migrate

# Check migration status
npm run migrate:status

# Create new migration
npm run migrate:create <migration_name>

# Rollback migration
npm run migrate:down <migration_name>

# Validate migrations
npm run migrate:validate
```

### Migration Features

- **Version Control**: Track schema changes
- **Rollback Support**: Safe database rollbacks
- **Validation**: Migration file validation
- **Health Checks**: Migration status monitoring

## 🔧 Development

### Code Quality Tools

```bash
# Linting
npm run lint              # Check for lint errors
npm run lint:fix          # Fix lint errors

# Code Formatting
npm run format            # Format code with Prettier
npm run format:check      # Check code formatting

# Type Checking
npm run type-check        # TypeScript type checking
```

### Development Workflow

1. **Create feature branch**: `git checkout -b feature/your-feature`
2. **Write tests**: Add unit/integration tests
3. **Implement feature**: Follow TypeScript best practices
4. **Run quality checks**: `npm run lint && npm run type-check`
5. **Run tests**: `npm run test:all`
6. **Create pull request**

## 📊 Performance Monitoring

### Health Check Endpoints

```bash
# Basic health check
GET /health

# Detailed metrics
GET /metrics
```

### Performance Features

- Request/response time monitoring
- Memory usage tracking
- Database connection monitoring
- Error rate tracking
- Performance alerting

## 🚢 Deployment

### Production Build

```bash
npm run build
npm start
```

### Docker Support

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Considerations

- Set `NODE_ENV=production`
- Use strong JWT secrets
- Configure proper CORS origins
- Set up database connection pooling
- Enable request logging
- Configure reverse proxy (nginx/Apache)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Follow conventional commit messages
- Update documentation as needed
- Ensure all tests pass
- Follow code style guidelines

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**LuongTanGia**

- GitHub: [@LuongTanGia](https://github.com/LuongTanGia)
- Email: luongtangia@example.com

## 🙏 Acknowledgments

- [Fastify](https://fastify.io/) - Fast and low overhead web framework
- [MongoDB](https://mongodb.com/) - Document database
- [TypeScript](https://typescriptlang.org/) - Typed JavaScript
- [Jest](https://jestjs.io/) - Testing framework

---

**⭐ If this project helped you, please give it a star!**
