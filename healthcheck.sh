#!/bin/bash

# Health check script for GitHub PR Dashboard
# Can be used for external monitoring (Nagios, Prometheus, etc.)

set -e

# Configuration
CLIENT_URL="${CLIENT_URL:-http://localhost:3000}"
SERVER_URL="${SERVER_URL:-http://localhost:3001}"
TIMEOUT=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Exit codes
EXIT_OK=0
EXIT_WARNING=1
EXIT_CRITICAL=2

# Check if curl is available
if ! command -v curl &> /dev/null; then
    echo -e "${RED}CRITICAL: curl is not installed${NC}"
    exit $EXIT_CRITICAL
fi

# Function to check HTTP endpoint
check_endpoint() {
    local name=$1
    local url=$2
    local response
    local http_code
    
    response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "$url" 2>&1) || {
        echo -e "${RED}CRITICAL: $name is unreachable${NC}"
        return $EXIT_CRITICAL
    }
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}OK: $name is healthy (HTTP $http_code)${NC}"
        return $EXIT_OK
    elif [ "$http_code" -ge 500 ]; then
        echo -e "${RED}CRITICAL: $name returned HTTP $http_code${NC}"
        echo "Response: $body"
        return $EXIT_CRITICAL
    else
        echo -e "${YELLOW}WARNING: $name returned HTTP $http_code${NC}"
        echo "Response: $body"
        return $EXIT_WARNING
    fi
}

# Main health checks
echo "Checking GitHub PR Dashboard health..."
echo ""

exit_code=$EXIT_OK

# Check backend health endpoint
echo "1. Backend API Health Check:"
check_endpoint "Backend API" "$SERVER_URL/api/health"
result=$?
if [ $result -gt $exit_code ]; then
    exit_code=$result
fi
echo ""

# Check frontend availability
echo "2. Frontend Availability Check:"
check_endpoint "Frontend" "$CLIENT_URL/"
result=$?
if [ $result -gt $exit_code ]; then
    exit_code=$result
fi
echo ""

# Check Docker containers if running in Docker
if command -v docker &> /dev/null; then
    echo "3. Docker Container Status:"
    
    # Check if containers are running
    if docker ps --format '{{.Names}}' | grep -q "github-pr-dashboard"; then
        containers=$(docker ps --filter "name=github-pr-dashboard" --format "table {{.Names}}\t{{.Status}}\t{{.State}}")
        echo "$containers"
        
        # Check for unhealthy containers
        unhealthy=$(docker ps --filter "name=github-pr-dashboard" --filter "health=unhealthy" --format '{{.Names}}')
        if [ -n "$unhealthy" ]; then
            echo -e "${RED}CRITICAL: Unhealthy containers: $unhealthy${NC}"
            exit_code=$EXIT_CRITICAL
        else
            echo -e "${GREEN}OK: All containers are running${NC}"
        fi
    else
        echo -e "${YELLOW}WARNING: No GitHub PR Dashboard containers found${NC}"
        exit_code=$EXIT_WARNING
    fi
    echo ""
fi

# Summary
echo "========================================="
case $exit_code in
    $EXIT_OK)
        echo -e "${GREEN}OVERALL STATUS: HEALTHY${NC}"
        ;;
    $EXIT_WARNING)
        echo -e "${YELLOW}OVERALL STATUS: WARNING${NC}"
        ;;
    $EXIT_CRITICAL)
        echo -e "${RED}OVERALL STATUS: CRITICAL${NC}"
        ;;
esac
echo "========================================="

exit $exit_code

