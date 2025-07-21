#!/bin/bash

# Project Setup Script for Inventory Management API
# This script helps new developers set up the project quickly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${2}${1}${NC}"
}

print_status "🚀 Setting up Inventory Management API..." $BLUE
echo ""

# Check Node.js version
print_status "📋 Checking prerequisites..." $YELLOW
if ! command -v node &> /dev/null; then
    print_status "❌ Node.js is not installed. Please install Node.js 16+ first." $RED
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2)
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)

if [ "$MAJOR_VERSION" -lt 16 ]; then
    print_status "❌ Node.js version must be 16 or higher. Current: $NODE_VERSION" $RED
    exit 1
fi

print_status "✅ Node.js version: $NODE_VERSION" $GREEN

# Check MongoDB
if ! command -v mongod &> /dev/null; then
    print_status "⚠️  MongoDB is not installed or not in PATH." $YELLOW
    print_status "   Make sure MongoDB is installed and running." $YELLOW
fi

# Install dependencies
print_status "📦 Installing dependencies..." $YELLOW
npm install

if [ $? -ne 0 ]; then
    print_status "❌ Failed to install dependencies" $RED
    exit 1
fi

print_status "✅ Dependencies installed successfully" $GREEN

# Setup environment file
print_status "🔧 Setting up environment configuration..." $YELLOW
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_status "✅ Created .env from .env.example" $GREEN
        print_status "⚠️  Please edit .env file with your configuration" $YELLOW
    else
        print_status "❌ .env.example not found" $RED
    fi
else
    print_status "✅ .env file already exists" $GREEN
fi

# Run quality checks
print_status "🔍 Running code quality checks..." $YELLOW

print_status "   - TypeScript compilation..." $BLUE
npm run type-check
if [ $? -eq 0 ]; then
    print_status "✅ TypeScript compilation passed" $GREEN
else
    print_status "❌ TypeScript compilation failed" $RED
fi

print_status "   - ESLint checking..." $BLUE
npm run lint > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_status "✅ ESLint passed" $GREEN
else
    print_status "⚠️  ESLint found issues (run 'npm run lint' for details)" $YELLOW
fi

print_status "   - Prettier format checking..." $BLUE
npm run format:check > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_status "✅ Code formatting is correct" $GREEN
else
    print_status "⚠️  Code formatting issues found (run 'npm run format' to fix)" $YELLOW
fi

# Test database connection and migrations
print_status "🗃️  Checking database setup..." $YELLOW
if [ -f ".env" ]; then
    # Try to validate migrations (this will test DB connection)
    npm run migrate:status > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_status "✅ Database connection successful" $GREEN
        
        # Run migrations
        print_status "   - Running database migrations..." $BLUE
        npm run migrate
        if [ $? -eq 0 ]; then
            print_status "✅ Database migrations completed" $GREEN
        else
            print_status "⚠️  Migration issues (check your database configuration)" $YELLOW
        fi
    else
        print_status "⚠️  Database connection failed" $YELLOW
        print_status "   Make sure MongoDB is running and .env is configured correctly" $NC
    fi
fi

# Build project
print_status "🏗️  Building project..." $YELLOW
npm run build
if [ $? -eq 0 ]; then
    print_status "✅ Build successful" $GREEN
else
    print_status "❌ Build failed" $RED
fi

echo ""
print_status "🎉 Setup completed!" $GREEN
echo ""
print_status "📋 Next steps:" $BLUE
print_status "   1. Edit .env file with your configuration" $NC
print_status "   2. Make sure MongoDB is running" $NC
print_status "   3. Run 'npm run dev' to start development server" $NC
print_status "   4. Visit http://localhost:3000/docs for API documentation" $NC
echo ""
print_status "🛠️  Useful commands:" $BLUE
print_status "   npm run dev           - Start development server" $NC
print_status "   npm run build         - Build for production" $NC
print_status "   npm run test:all      - Run all tests" $NC
print_status "   npm run lint:fix      - Fix linting issues" $NC
print_status "   npm run format        - Format code" $NC
print_status "   npm run migrate       - Run database migrations" $NC
echo ""
print_status "📚 Documentation:" $BLUE
print_status "   - README.md           - Project documentation" $NC
print_status "   - CONTRIBUTING.md     - Contribution guidelines" $NC
print_status "   - http://localhost:3000/docs - API documentation" $NC
echo ""
print_status "🚀 Happy coding!" $GREEN
