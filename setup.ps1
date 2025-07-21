# Project Setup Script for Inventory Management API (PowerShell)
# This script helps new developers set up the project quickly on Windows

$ErrorActionPreference = "Stop"

# Function to print colored output
function Write-ColorOutput($Message, $Color = "White") {
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "🚀 Setting up Inventory Management API..." "Blue"
Write-Host ""

# Check Node.js version
Write-ColorOutput "📋 Checking prerequisites..." "Yellow"
try {
    $nodeVersion = node --version
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    
    if ($majorVersion -lt 16) {
        Write-ColorOutput "❌ Node.js version must be 16 or higher. Current: $nodeVersion" "Red"
        exit 1
    }
    
    Write-ColorOutput "✅ Node.js version: $nodeVersion" "Green"
}
catch {
    Write-ColorOutput "❌ Node.js is not installed. Please install Node.js 16+ first." "Red"
    exit 1
}

# Check MongoDB
try {
    mongod --version | Out-Null
    Write-ColorOutput "✅ MongoDB is available" "Green"
}
catch {
    Write-ColorOutput "⚠️  MongoDB is not installed or not in PATH." "Yellow"
    Write-ColorOutput "   Make sure MongoDB is installed and running." "Yellow"
}

# Install dependencies
Write-ColorOutput "📦 Installing dependencies..." "Yellow"
try {
    npm install
    Write-ColorOutput "✅ Dependencies installed successfully" "Green"
}
catch {
    Write-ColorOutput "❌ Failed to install dependencies" "Red"
    exit 1
}

# Setup environment file
Write-ColorOutput "🔧 Setting up environment configuration..." "Yellow"
if (-Not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-ColorOutput "✅ Created .env from .env.example" "Green"
        Write-ColorOutput "⚠️  Please edit .env file with your configuration" "Yellow"
    } else {
        Write-ColorOutput "❌ .env.example not found" "Red"
    }
} else {
    Write-ColorOutput "✅ .env file already exists" "Green"
}

# Run quality checks
Write-ColorOutput "🔍 Running code quality checks..." "Yellow"

Write-ColorOutput "   - TypeScript compilation..." "Blue"
try {
    npm run type-check
    Write-ColorOutput "✅ TypeScript compilation passed" "Green"
}
catch {
    Write-ColorOutput "❌ TypeScript compilation failed" "Red"
}

Write-ColorOutput "   - ESLint checking..." "Blue"
try {
    npm run lint 2>$null
    Write-ColorOutput "✅ ESLint passed" "Green"
}
catch {
    Write-ColorOutput "⚠️  ESLint found issues (run 'npm run lint' for details)" "Yellow"
}

Write-ColorOutput "   - Prettier format checking..." "Blue"
try {
    npm run format:check 2>$null
    Write-ColorOutput "✅ Code formatting is correct" "Green"
}
catch {
    Write-ColorOutput "⚠️  Code formatting issues found (run 'npm run format' to fix)" "Yellow"
}

# Test database connection and migrations
Write-ColorOutput "🗃️  Checking database setup..." "Yellow"
if (Test-Path ".env") {
    try {
        npm run migrate:status 2>$null
        Write-ColorOutput "✅ Database connection successful" "Green"
        
        Write-ColorOutput "   - Running database migrations..." "Blue"
        npm run migrate
        Write-ColorOutput "✅ Database migrations completed" "Green"
    }
    catch {
        Write-ColorOutput "⚠️  Database connection failed" "Yellow"
        Write-ColorOutput "   Make sure MongoDB is running and .env is configured correctly" "White"
    }
}

# Build project
Write-ColorOutput "🏗️  Building project..." "Yellow"
try {
    npm run build
    Write-ColorOutput "✅ Build successful" "Green"
}
catch {
    Write-ColorOutput "❌ Build failed" "Red"
}

Write-Host ""
Write-ColorOutput "🎉 Setup completed!" "Green"
Write-Host ""
Write-ColorOutput "📋 Next steps:" "Blue"
Write-ColorOutput "   1. Edit .env file with your configuration" "White"
Write-ColorOutput "   2. Make sure MongoDB is running" "White"
Write-ColorOutput "   3. Run 'npm run dev' to start development server" "White"
Write-ColorOutput "   4. Visit http://localhost:3000/docs for API documentation" "White"
Write-Host ""
Write-ColorOutput "🛠️  Useful commands:" "Blue"
Write-ColorOutput "   npm run dev           - Start development server" "White"
Write-ColorOutput "   npm run build         - Build for production" "White"
Write-ColorOutput "   npm run test:all      - Run all tests" "White"
Write-ColorOutput "   npm run lint:fix      - Fix linting issues" "White"
Write-ColorOutput "   npm run format        - Format code" "White"
Write-ColorOutput "   npm run migrate       - Run database migrations" "White"
Write-Host ""
Write-ColorOutput "📚 Documentation:" "Blue"
Write-ColorOutput "   - README.md           - Project documentation" "White"
Write-ColorOutput "   - CONTRIBUTING.md     - Contribution guidelines" "White"
Write-ColorOutput "   - http://localhost:3000/docs - API documentation" "White"
Write-Host ""
Write-ColorOutput "🚀 Happy coding!" "Green"
