#!/bin/bash
set -e

# GitHub PR Dashboard - Docker Startup Script
# This script helps you quickly get the application up and running

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BOLD}GitHub PR Dashboard - Docker Setup${NC}\n"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    echo "Please install Docker from: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed.${NC}"
    echo "Please install Docker Compose from: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}\n"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    
    if [ -f env.example ]; then
        echo -e "Copying env.example to .env..."
        cp env.example .env
        echo -e "${GREEN}✓ Created .env file${NC}"
        echo -e "${YELLOW}⚠ Please edit .env file with your GitHub token and repositories${NC}"
        echo ""
        echo "Required configuration:"
        echo "  - GITHUB_TOKEN: Your GitHub personal access token"
        echo "  - REPOSITORIES: Comma-separated list of repos (owner/repo)"
        echo ""
        echo "After editing .env, run this script again."
        exit 0
    else
        echo -e "${RED}Error: env.example not found${NC}"
        exit 1
    fi
fi

# Check if .env has required variables
if ! grep -q "GITHUB_TOKEN=.*[^[:space:]]" .env; then
    echo -e "${RED}Error: GITHUB_TOKEN is not set in .env${NC}"
    echo "Please edit .env and add your GitHub personal access token"
    exit 1
fi

if ! grep -q "REPOSITORIES=.*[^[:space:]]" .env; then
    echo -e "${RED}Error: REPOSITORIES is not set in .env${NC}"
    echo "Please edit .env and add your repositories (owner/repo format)"
    exit 1
fi

echo -e "${GREEN}✓ Configuration file (.env) is present${NC}\n"

# Ask user if they want to rebuild
echo -e "${BOLD}Build Options:${NC}"
echo "1. Start with existing images (fast)"
echo "2. Rebuild images (recommended for first run or after updates)"
echo ""
read -p "Select option (1 or 2): " BUILD_OPTION

if [ "$BUILD_OPTION" = "2" ]; then
    echo -e "\n${BOLD}Building Docker images...${NC}"
    docker-compose build --no-cache
    echo -e "${GREEN}✓ Images built successfully${NC}\n"
fi

# Start containers
echo -e "${BOLD}Starting containers...${NC}"
docker-compose up -d

# Wait for services to be healthy
echo -e "\n${BOLD}Waiting for services to be ready...${NC}"
sleep 5

# Check health
RETRY_COUNT=0
MAX_RETRIES=30

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker-compose ps | grep -q "healthy"; then
        echo -e "${GREEN}✓ Services are healthy!${NC}\n"
        break
    fi
    
    echo -n "."
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "\n${YELLOW}⚠ Services are taking longer than expected to start${NC}"
    echo "Check logs with: docker-compose logs"
fi

# Display status
echo -e "${BOLD}Container Status:${NC}"
docker-compose ps
echo ""

# Get port from .env or use default
CLIENT_PORT=$(grep "^CLIENT_PORT=" .env | cut -d '=' -f2)
CLIENT_PORT=${CLIENT_PORT:-3000}

echo -e "${GREEN}${BOLD}✓ GitHub PR Dashboard is running!${NC}"
echo ""
echo -e "Access the dashboard at: ${BOLD}http://localhost:${CLIENT_PORT}${NC}"
echo ""
echo -e "${BOLD}Useful Commands:${NC}"
echo "  View logs:       docker-compose logs -f"
echo "  Stop services:   docker-compose down"
echo "  Restart:         docker-compose restart"
echo "  Check health:    docker-compose ps"
echo ""
echo "Or use the Makefile:"
echo "  make logs"
echo "  make down"
echo "  make restart"
echo "  make health"

