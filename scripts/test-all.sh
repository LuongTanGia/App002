#!/bin/bash

# Comprehensive Test Runner Script for Node.js TypeScript Project

echo "🚀 Starting Comprehensive Testing Suite..."
echo "=========================================="

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
print_status "📋 Checking dependencies..." $BLUE
if ! command_exists npm; then
    print_status "❌ npm is not installed. Please install Node.js and npm first." $RED
    exit 1
fi

if [ ! -f "package.json" ]; then
    print_status "❌ package.json not found. Are you in the project root?" $RED
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "📦 Installing dependencies..." $YELLOW
    npm install
    if [ $? -ne 0 ]; then
        print_status "❌ Failed to install dependencies" $RED
        exit 1
    fi
fi

# Run lint check (if available)
if npm run lint --silent >/dev/null 2>&1; then
    print_status "🔍 Running linter..." $BLUE
    npm run lint
    if [ $? -ne 0 ]; then
        print_status "⚠️ Linting issues found (continuing with tests)" $YELLOW
    fi
fi

# Run type check
print_status "🔧 Running TypeScript compilation check..." $BLUE
npx tsc --noEmit
if [ $? -ne 0 ]; then
    print_status "❌ TypeScript compilation errors found" $RED
    exit 1
fi

print_status "✅ TypeScript compilation check passed" $GREEN

# Create coverage directory
mkdir -p coverage

# Run unit tests
print_status "🧪 Running Unit Tests..." $BLUE
npm run test:unit
UNIT_EXIT_CODE=$?

if [ $UNIT_EXIT_CODE -eq 0 ]; then
    print_status "✅ Unit tests passed" $GREEN
else
    print_status "❌ Unit tests failed" $RED
fi

# Run integration tests
print_status "🔗 Running Integration Tests..." $BLUE
npm run test:integration
INTEGRATION_EXIT_CODE=$?

if [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
    print_status "✅ Integration tests passed" $GREEN
else
    print_status "❌ Integration tests failed" $RED
fi

# Run all tests with coverage
print_status "📊 Generating Test Coverage Report..." $BLUE
npm run test:coverage
COVERAGE_EXIT_CODE=$?

if [ $COVERAGE_EXIT_CODE -eq 0 ]; then
    print_status "✅ Coverage report generated successfully" $GREEN
else
    print_status "❌ Coverage report generation failed" $RED
fi

# Summary
echo ""
print_status "📈 TEST SUMMARY" $BLUE
echo "==============="

if [ $UNIT_EXIT_CODE -eq 0 ]; then
    print_status "Unit Tests: ✅ PASSED" $GREEN
else
    print_status "Unit Tests: ❌ FAILED" $RED
fi

if [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
    print_status "Integration Tests: ✅ PASSED" $GREEN
else
    print_status "Integration Tests: ❌ FAILED" $RED
fi

if [ $COVERAGE_EXIT_CODE -eq 0 ]; then
    print_status "Coverage Report: ✅ GENERATED" $GREEN
    if [ -f "coverage/lcov-report/index.html" ]; then
        print_status "📄 Coverage report available at: coverage/lcov-report/index.html" $BLUE
    fi
else
    print_status "Coverage Report: ❌ FAILED" $RED
fi

# Overall result
OVERALL_EXIT_CODE=$((UNIT_EXIT_CODE + INTEGRATION_EXIT_CODE + COVERAGE_EXIT_CODE))

if [ $OVERALL_EXIT_CODE -eq 0 ]; then
    print_status "🎉 ALL TESTS PASSED SUCCESSFULLY!" $GREEN
    echo ""
    print_status "Next steps:" $BLUE
    print_status "- Review coverage report in coverage/lcov-report/index.html" $NC
    print_status "- Add more tests if coverage is below threshold" $NC
    print_status "- Commit your changes if all tests pass" $NC
else
    print_status "💥 SOME TESTS FAILED" $RED
    echo ""
    print_status "Please fix the failing tests before proceeding." $YELLOW
    print_status "Check the output above for details." $NC
fi

echo ""
print_status "Testing completed at $(date)" $BLUE

exit $OVERALL_EXIT_CODE
