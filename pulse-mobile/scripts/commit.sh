#!/bin/bash

# Conventional Commit Helper Script
# Usage: ./scripts/commit.sh <type> <message>

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we have the required arguments
if [ $# -lt 2 ]; then
    print_error "Usage: $0 <type> <message>"
    echo ""
    echo "Types:"
    echo "  feat     - A new feature"
    echo "  fix      - A bug fix"
    echo "  chore    - Maintenance tasks, dependencies, etc."
    echo "  docs     - Documentation changes"
    echo "  style    - Code style changes"
    echo "  refactor - Code refactoring"
    echo "  test     - Adding or updating tests"
    echo "  perf     - Performance improvements"
    echo ""
    echo "Examples:"
    echo "  $0 feat \"add user authentication\""
    echo "  $0 fix \"resolve mobile layout issues\""
    echo "  $0 chore \"update dependencies\""
    exit 1
fi

TYPE=$1
MESSAGE=$2

# Validate commit type
VALID_TYPES=("feat" "fix" "chore" "docs" "style" "refactor" "test" "perf")

if [[ ! " ${VALID_TYPES[@]} " =~ " ${TYPE} " ]]; then
    print_error "Invalid commit type: $TYPE"
    echo "Valid types: ${VALID_TYPES[*]}"
    exit 1
fi

# Check message length
if [ ${#MESSAGE} -gt 50 ]; then
    print_warning "Message is longer than 50 characters (${#MESSAGE} chars)"
    print_warning "Consider making it shorter for better readability"
fi

# Create the commit message
COMMIT_MESSAGE="$TYPE: $MESSAGE"

print_status "Creating commit: $COMMIT_MESSAGE"

# Stage all changes and commit
git add .
git commit -m "$COMMIT_MESSAGE"

print_status "Commit created successfully!"
print_status "Message: $COMMIT_MESSAGE" 