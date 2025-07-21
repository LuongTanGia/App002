# Comprehensive Test Runner Script for Windows PowerShell

Write-Host "🚀 Starting Comprehensive Testing Suite..." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# Function to print colored output
function Write-Status {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Check if npm exists
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Status "❌ npm is not installed. Please install Node.js and npm first." "Red"
    exit 1
}

# Check if package.json exists
if (-not (Test-Path "package.json")) {
    Write-Status "❌ package.json not found. Are you in the project root?" "Red"
    exit 1
}

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path "node_modules")) {
    Write-Status "📦 Installing dependencies..." "Yellow"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Status "❌ Failed to install dependencies" "Red"
        exit 1
    }
}

# Run lint check (if available)
try {
    npm run lint --silent 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Status "🔍 Running linter..." "Cyan"
        npm run lint
        if ($LASTEXITCODE -ne 0) {
            Write-Status "⚠️ Linting issues found (continuing with tests)" "Yellow"
        }
    }
}
catch {
    Write-Status "ℹ️ Lint script not available, skipping..." "Gray"
}

# Run type check
Write-Status "🔧 Running TypeScript compilation check..." "Cyan"
& npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Status "❌ TypeScript compilation errors found" "Red"
    exit 1
}

Write-Status "✅ TypeScript compilation check passed" "Green"

# Create coverage directory
if (-not (Test-Path "coverage")) {
    New-Item -ItemType Directory -Path "coverage" -Force | Out-Null
}

# Run unit tests
Write-Status "🧪 Running Unit Tests..." "Cyan"
npm run test:unit
$unitExitCode = $LASTEXITCODE

if ($unitExitCode -eq 0) {
    Write-Status "✅ Unit tests passed" "Green"
} else {
    Write-Status "❌ Unit tests failed" "Red"
}

# Run integration tests
Write-Status "🔗 Running Integration Tests..." "Cyan"
npm run test:integration
$integrationExitCode = $LASTEXITCODE

if ($integrationExitCode -eq 0) {
    Write-Status "✅ Integration tests passed" "Green"
} else {
    Write-Status "❌ Integration tests failed" "Red"
}

# Run all tests with coverage
Write-Status "📊 Generating Test Coverage Report..." "Cyan"
npm run test:coverage
$coverageExitCode = $LASTEXITCODE

if ($coverageExitCode -eq 0) {
    Write-Status "✅ Coverage report generated successfully" "Green"
} else {
    Write-Status "❌ Coverage report generation failed" "Red"
}

# Summary
Write-Host ""
Write-Status "📈 TEST SUMMARY" "Cyan"
Write-Host "==============="

if ($unitExitCode -eq 0) {
    Write-Status "Unit Tests: ✅ PASSED" "Green"
} else {
    Write-Status "Unit Tests: ❌ FAILED" "Red"
}

if ($integrationExitCode -eq 0) {
    Write-Status "Integration Tests: ✅ PASSED" "Green"
} else {
    Write-Status "Integration Tests: ❌ FAILED" "Red"
}

if ($coverageExitCode -eq 0) {
    Write-Status "Coverage Report: ✅ GENERATED" "Green"
    if (Test-Path "coverage\lcov-report\index.html") {
        Write-Status "📄 Coverage report available at: coverage\lcov-report\index.html" "Cyan"
    }
} else {
    Write-Status "Coverage Report: ❌ FAILED" "Red"
}

# Overall result
$overallExitCode = $unitExitCode + $integrationExitCode + $coverageExitCode

if ($overallExitCode -eq 0) {
    Write-Status "🎉 ALL TESTS PASSED SUCCESSFULLY!" "Green"
    Write-Host ""
    Write-Status "Next steps:" "Cyan"
    Write-Status "- Review coverage report in coverage\lcov-report\index.html" "White"
    Write-Status "- Add more tests if coverage is below threshold" "White"
    Write-Status "- Commit your changes if all tests pass" "White"
} else {
    Write-Status "💥 SOME TESTS FAILED" "Red"
    Write-Host ""
    Write-Status "Please fix the failing tests before proceeding." "Yellow"
    Write-Status "Check the output above for details." "White"
}

Write-Host ""
Write-Status "Testing completed at $(Get-Date)" "Cyan"

exit $overallExitCode
