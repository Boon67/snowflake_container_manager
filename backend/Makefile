# Backend Test Suite Makefile

.PHONY: help test test-unit test-integration test-auth test-database test-api test-performance
.PHONY: test-coverage test-parallel install-test-deps clean lint format
.PHONY: run-server setup-dev check-deps

# Default Python executable
PYTHON := python3
PIP := $(PYTHON) -m pip

# Test runner
TEST_RUNNER := $(PYTHON) run_tests.py

# Help target
help:
	@echo "Backend Test Suite Commands:"
	@echo ""
	@echo "Testing:"
	@echo "  test                 Run all tests"
	@echo "  test-unit           Run unit tests only"
	@echo "  test-integration    Run integration tests only"
	@echo "  test-auth           Run authentication tests only"
	@echo "  test-database       Run database tests only"
	@echo "  test-api            Run API tests only"
	@echo "  test-performance    Run performance tests only"
	@echo "  test-coverage       Run tests with coverage reporting"
	@echo "  test-parallel       Run tests in parallel"
	@echo "  test-verbose        Run tests with verbose output"
	@echo "  test-quiet          Run tests with minimal output"
	@echo ""
	@echo "Setup:"
	@echo "  install-test-deps   Install test dependencies"
	@echo "  setup-dev           Set up development environment"
	@echo "  check-deps          Check if dependencies are installed"
	@echo ""
	@echo "Code Quality:"
	@echo "  lint                Run linting checks"
	@echo "  format              Format code"
	@echo ""
	@echo "Utilities:"
	@echo "  clean               Clean up generated files"
	@echo "  run-server          Start the development server"

# Test targets
test:
	$(TEST_RUNNER) --verbose

test-unit:
	$(TEST_RUNNER) --unit --verbose

test-integration:
	$(TEST_RUNNER) --integration --verbose

test-auth:
	$(TEST_RUNNER) --auth --verbose

test-database:
	$(TEST_RUNNER) --database --verbose

test-api:
	$(TEST_RUNNER) --api --verbose

test-performance:
	$(TEST_RUNNER) --performance --verbose

test-coverage:
	$(TEST_RUNNER) --coverage --verbose

test-parallel:
	$(TEST_RUNNER) --parallel 4 --verbose

test-verbose:
	$(TEST_RUNNER) --verbose

test-quiet:
	$(TEST_RUNNER) --quiet

test-failfast:
	$(TEST_RUNNER) --failfast --verbose

test-lf:
	$(TEST_RUNNER) --lf --verbose

# Specific test files
test-main:
	$(TEST_RUNNER) test_main.py --verbose

test-auth-only:
	$(TEST_RUNNER) test_auth.py --verbose

test-db-only:
	$(TEST_RUNNER) test_database.py --verbose

# Setup and dependencies
install-test-deps:
	$(PIP) install -r test_requirements.txt

setup-dev: install-test-deps
	$(PIP) install -r requirements.txt
	@echo "✅ Development environment set up"

check-deps:
	@echo "Checking Python version..."
	@$(PYTHON) --version
	@echo "Checking pip..."
	@$(PIP) --version
	@echo "Checking pytest..."
	@$(PYTHON) -c "import pytest; print(f'pytest {pytest.__version__}')" 2>/dev/null || echo "❌ pytest not installed"
	@echo "Checking coverage..."
	@$(PYTHON) -c "import coverage; print(f'coverage {coverage.__version__}')" 2>/dev/null || echo "❌ coverage not installed"

# Code quality
lint:
	@echo "Running flake8..."
	@$(PYTHON) -m flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics || echo "Install flake8: pip install flake8"
	@echo "Running pylint..."
	@$(PYTHON) -m pylint *.py || echo "Install pylint: pip install pylint"

format:
	@echo "Running black..."
	@$(PYTHON) -m black . || echo "Install black: pip install black"
	@echo "Running isort..."
	@$(PYTHON) -m isort . || echo "Install isort: pip install isort"

# Utilities
clean:
	@echo "Cleaning up generated files..."
	@rm -rf __pycache__/
	@rm -rf .pytest_cache/
	@rm -rf .coverage
	@rm -rf htmlcov/
	@rm -rf coverage.xml
	@rm -rf *.pyc
	@rm -rf .pyc
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -name "*.pyc" -delete 2>/dev/null || true
	@echo "✅ Cleanup complete"

run-server:
	@echo "Starting development server..."
	$(PYTHON) main.py

# CI/CD style commands
ci-test: install-test-deps test-coverage

ci-lint: lint

ci-format-check:
	@echo "Checking code formatting..."
	@$(PYTHON) -m black --check . || (echo "❌ Code formatting issues found. Run 'make format' to fix." && exit 1)

# Docker-related (if needed)
docker-test:
	@echo "Running tests in Docker..."
	@docker run --rm -v $(PWD):/app -w /app python:3.11 make test

# Generate test reports
test-report: test-coverage
	@echo "📊 Test report generated in htmlcov/index.html"
	@echo "📊 Coverage XML report: coverage.xml"

# Continuous testing (watch for changes)
test-watch:
	@echo "Starting continuous testing (requires pytest-watch)..."
	@$(PYTHON) -m ptw -- --verbose || echo "Install pytest-watch: pip install pytest-watch"

# Database-specific commands
test-db-init:
	@echo "Testing database initialization..."
	$(TEST_RUNNER) --database --verbose -k "test_initialize"

test-db-migration:
	@echo "Testing database migrations..."
	$(TEST_RUNNER) --database --verbose -k "test_migration"

# Security testing
test-security:
	@echo "Running security tests..."
	$(TEST_RUNNER) --verbose -k "security or injection or auth"

# Performance benchmarks
benchmark:
	@echo "Running performance benchmarks..."
	$(TEST_RUNNER) --performance --verbose

# All quality checks
quality-check: lint test-coverage
	@echo "✅ All quality checks complete"

# Quick test for development
quick-test:
	$(TEST_RUNNER) --failfast --tb=line

# Test with specific Python version
test-py39:
	python3.9 run_tests.py --verbose

test-py310:
	python3.10 run_tests.py --verbose

test-py311:
	python3.11 run_tests.py --verbose 