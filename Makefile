.PHONY: help build up down restart logs clean rebuild health

# Default target
help:
	@echo "GitHub PR Dashboard - Docker Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  help      - Show this help message"
	@echo "  build     - Build Docker images"
	@echo "  up        - Start containers in detached mode"
	@echo "  down      - Stop and remove containers"
	@echo "  restart   - Restart all containers"
	@echo "  logs      - View logs from all containers"
	@echo "  logs-server - View server logs"
	@echo "  logs-client - View client logs"
	@echo "  health    - Check health status of containers"
	@echo "  clean     - Stop containers and remove volumes"
	@echo "  rebuild   - Rebuild images from scratch and restart"
	@echo "  shell-server - Open shell in server container"
	@echo "  shell-client - Open shell in client container"
	@echo ""

# Build images
build:
	docker-compose build

# Start containers
up:
	docker-compose up -d

# Stop containers
down:
	docker-compose down

# Restart containers
restart:
	docker-compose restart

# View all logs
logs:
	docker-compose logs -f

# View server logs
logs-server:
	docker-compose logs -f server

# View client logs
logs-client:
	docker-compose logs -f client

# Check health status
health:
	docker-compose ps

# Clean up containers and volumes
clean:
	docker-compose down -v

# Rebuild from scratch
rebuild:
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d

# Shell access to server
shell-server:
	docker-compose exec server sh

# Shell access to client
shell-client:
	docker-compose exec client sh

