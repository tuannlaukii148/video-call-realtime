#!/bin/bash

# Quick verification script for Meeting Backend setup

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Meeting Backend - Setup Verification                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo "Checking prerequisites..."
if command -v node &> /dev/null; then
    echo -e "${GREEN}✓${NC} Node.js: $(node -v)"
else
    echo -e "${RED}✗${NC} Node.js not found"
    exit 1
fi

if command -v npm &> /dev/null; then
    echo -e "${GREEN}✓${NC} npm: $(npm -v)"
else
    echo -e "${RED}✗${NC} npm not found"
    exit 1
fi

echo ""
echo "Checking project files..."

# Check key files
FILES=(
    "package.json"
    "src/app.js"
    "src/server.js"
    "src/config/mongodb.js"
    "src/config/redis.js"
    "src/models/User.js"
    "src/models/Room.js"
    "src/models/RoomMember.js"
    "src/models/AttendanceLog.js"
    "src/models/Message.js"
    "src/models/MeetingEvent.js"
    "src/middlewares/auth.js"
    "src/routes/v1/index.js"
    ".env"
    "docker-compose.yml"
    "README.md"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file"
    fi
done

echo ""
echo "Checking dependencies..."

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules installed"
else
    echo -e "${YELLOW}⚠${NC} node_modules not found"
    echo "   Run: npm install"
fi

echo ""
echo "Checking Docker..."

if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker: $(docker --version | cut -d',' -f1)"
    
    # Check if services are running
    if docker ps | grep -q "meeting-mongodb"; then
        echo -e "${GREEN}✓${NC} MongoDB container running"
    else
        echo -e "${YELLOW}⚠${NC} MongoDB container not running"
        echo "   Run: docker-compose up -d"
    fi
    
    if docker ps | grep -q "meeting-redis"; then
        echo -e "${GREEN}✓${NC} Redis container running"
    else
        echo -e "${YELLOW}⚠${NC} Redis container not running"
        echo "   Run: docker-compose up -d"
    fi
else
    echo -e "${YELLOW}⚠${NC} Docker not installed (optional)"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              Verification Complete!                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Install dependencies: npm install"
echo "  2. Start Docker services: docker-compose up -d"
echo "  3. Run dev server: npm run dev"
echo "  4. Check API docs: http://localhost:3000/api-docs"
echo ""
