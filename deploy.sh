#!/bin/bash
# CivicFix Deployment Script
# ==========================
# Script for deploying CivicFix to production

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              CivicFix - Deployment Script                    ║"
echo "║         Smart Public Issue Reporting Platform                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_warning "Running as root. This is not recommended for production."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check Python version
echo "Checking Python version..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
required_version="3.8"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    print_error "Python 3.8+ required. Found: $python_version"
    exit 1
fi
print_status "Python version: $python_version"

# Check if virtual environment exists
echo
echo "Setting up virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    print_status "Virtual environment created"
else
    print_status "Virtual environment already exists"
fi

# Activate virtual environment
echo
echo "Activating virtual environment..."
source venv/bin/activate
print_status "Virtual environment activated"

# Install dependencies
echo
echo "Installing dependencies..."
pip install -q -r backend/requirements.txt
print_status "Dependencies installed"

# Create upload directories
echo
echo "Creating upload directories..."
mkdir -p uploads/complaints uploads/resolutions
print_status "Upload directories ready"

# Check environment file
echo
echo "Checking environment configuration..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_warning ".env file created from example. Please update it with your settings."
    else
        print_error ".env file not found and no example available"
        exit 1
    fi
else
    print_status ".env file exists"
fi

# Check MongoDB
echo
echo "Checking MongoDB connection..."
if python3 -c "from pymongo import MongoClient; client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=2000); client.server_info()" 2>/dev/null; then
    print_status "MongoDB is running"
else
    print_error "MongoDB is not running"
    echo
    echo "Please start MongoDB:"
    echo "  - systemd: sudo systemctl start mongod"
    echo "  - macOS: brew services start mongodb-community"
    exit 1
fi

# Set environment to production
echo
print_warning "Setting FLASK_ENV to production"
export FLASK_ENV=production

# Generate secure keys if not set
echo
echo "Checking secret keys..."
if ! grep -q "SECRET_KEY=change" .env && ! grep -q "JWT_SECRET_KEY=change" .env; then
    print_status "Secret keys are configured"
else
    print_warning "Please update SECRET_KEY and JWT_SECRET_KEY in .env file"
    echo "Generate secure keys with: python3 -c 'import secrets; print(secrets.token_hex(32))'"
fi

echo
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                  Deployment Ready!                           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo
echo "To start the application:"
echo
echo "  Development mode:"
echo "    python3 run.py"
echo
echo "  Production mode (with Gunicorn):"
echo "    gunicorn -w 4 -b 0.0.0.0:5000 backend.app:app"
echo
echo "  Using systemd:"
echo "    sudo systemctl start civicfix"
echo
echo "The application will be available at:"
echo "  http://localhost:5000"
echo

# Deactivate virtual environment
deactivate
