#!/bin/bash

# Meeting Backend Setup Script
# This script automates the initial setup

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Meeting Backend - Quick Setup Script                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js >= 18"
    exit 1
fi
echo "✓ Node.js version: $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi
echo "✓ npm version: $(npm -v)"

# Check Docker (optional)
if command -v docker &> /dev/null; then
    echo "✓ Docker is installed: $(docker --version)"
else
    echo "⚠ Docker not found (optional, but recommended)"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "📄 Setting up environment file..."
if [ -f ".env" ]; then
    echo "⚠ .env file already exists, skipping..."
else
    cp .env.example .env
    echo "✓ Created .env file (please update with your configuration)"
fi

echo ""
echo "🐳 Starting Docker services..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d
    sleep 3
    echo "✓ Docker services started"
    echo ""
    echo "📊 Container status:"
    docker-compose ps
else
    echo "⚠ Docker Compose not found - please ensure MongoDB and Redis are running"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              Setup Complete! ✓                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🚀 To start the development server, run:"
echo "   npm run dev"
echo ""
echo "📖 Documentation:"
echo "   - API Docs: http://localhost:3000/api-docs"
echo "   - Health Check: http://localhost:3000/health"
echo "   - README: ./README.md"
echo ""
