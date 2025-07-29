#!/usr/bin/env python3
"""
Test runner script for the backend test suite.
Handles environment setup and test execution with different options.
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path

def setup_test_environment():
    """Set up test environment variables"""
    test_env = {
        'SNOWFLAKE_USER': 'test_user',
        'SNOWFLAKE_PASSWORD': 'test_password',
        'SNOWFLAKE_ACCOUNT': 'test_account',
        'SNOWFLAKE_WAREHOUSE': 'test_warehouse',
        'SNOWFLAKE_DATABASE': 'test_database',
        'SNOWFLAKE_SCHEMA': 'test_schema',
        'SECRET_KEY': 'test_secret_key_for_jwt_tokens_123456789',
        'ALGORITHM': 'HS256',
        'ACCESS_TOKEN_EXPIRE_MINUTES': '30',
        'DEFAULT_USERNAME': 'admin',
        'DEFAULT_PASSWORD': 'password123',
        'TESTING': 'true'
    }
    
    # Update environment
    os.environ.update(test_env)
    print("✅ Test environment configured")

def install_test_dependencies():
    """Install test dependencies"""
    try:
        subprocess.run([
            sys.executable, '-m', 'pip', 'install', '-r', 'test_requirements.txt'
        ], check=True)
        print("✅ Test dependencies installed")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install test dependencies: {e}")
        sys.exit(1)

def run_tests(test_args):
    """Run the test suite"""
    setup_test_environment()
    
    # Base pytest command
    cmd = [sys.executable, '-m', 'pytest']
    
    # Add custom arguments
    cmd.extend(test_args)
    
    try:
        result = subprocess.run(cmd, check=False)
        return result.returncode
    except Exception as e:
        print(f"❌ Failed to run tests: {e}")
        return 1

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Run backend test suite')
    parser.add_argument('--install-deps', action='store_true', 
                       help='Install test dependencies before running tests')
    parser.add_argument('--coverage', action='store_true',
                       help='Run tests with coverage reporting')
    parser.add_argument('--unit', action='store_true',
                       help='Run only unit tests')
    parser.add_argument('--integration', action='store_true',
                       help='Run only integration tests')
    parser.add_argument('--auth', action='store_true',
                       help='Run only authentication tests')
    parser.add_argument('--database', action='store_true',
                       help='Run only database tests')
    parser.add_argument('--api', action='store_true',
                       help='Run only API tests')
    parser.add_argument('--performance', action='store_true',
                       help='Run only performance tests')
    parser.add_argument('--parallel', '-n', type=int, default=1,
                       help='Run tests in parallel (requires pytest-xdist)')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Verbose output')
    parser.add_argument('--quiet', '-q', action='store_true',
                       help='Quiet output')
    parser.add_argument('--failfast', '-x', action='store_true',
                       help='Stop on first failure')
    parser.add_argument('--lf', action='store_true',
                       help='Run last failed tests only')
    parser.add_argument('--tb', choices=['short', 'long', 'line', 'native', 'no'],
                       default='short', help='Traceback print mode')
    parser.add_argument('files', nargs='*', 
                       help='Specific test files to run')
    
    args = parser.parse_args()
    
    # Install dependencies if requested
    if args.install_deps:
        install_test_dependencies()
    
    # Build pytest arguments
    pytest_args = []
    
    # Add verbosity
    if args.verbose:
        pytest_args.append('-v')
    elif args.quiet:
        pytest_args.append('-q')
    
    # Add traceback style
    pytest_args.extend(['--tb', args.tb])
    
    # Add fail fast
    if args.failfast:
        pytest_args.append('-x')
    
    # Add last failed
    if args.lf:
        pytest_args.append('--lf')
    
    # Add parallel execution
    if args.parallel > 1:
        pytest_args.extend(['-n', str(args.parallel)])
    
    # Add coverage
    if args.coverage:
        pytest_args.extend([
            '--cov=.',
            '--cov-report=html',
            '--cov-report=term-missing',
            '--cov-report=xml'
        ])
    
    # Add markers for specific test types
    markers = []
    if args.unit:
        markers.append('unit')
    if args.integration:
        markers.append('integration')
    if args.auth:
        markers.append('auth')
    if args.database:
        markers.append('database')
    if args.api:
        markers.append('api')
    if args.performance:
        markers.append('performance')
    
    if markers:
        pytest_args.extend(['-m', ' or '.join(markers)])
    
    # Add specific files or default to all test files
    if args.files:
        pytest_args.extend(args.files)
    else:
        pytest_args.extend(['test_*.py'])
    
    print("🚀 Starting test execution...")
    print(f"Command: pytest {' '.join(pytest_args)}")
    print("-" * 60)
    
    # Run tests
    exit_code = run_tests(pytest_args)
    
    if exit_code == 0:
        print("\n" + "=" * 60)
        print("✅ All tests passed!")
    else:
        print("\n" + "=" * 60)
        print("❌ Some tests failed!")
    
    return exit_code

if __name__ == '__main__':
    sys.exit(main()) 