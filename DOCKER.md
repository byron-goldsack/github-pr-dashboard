# GitHub PR Dashboard - Docker Deployment Guide

## 🐳 Quick Start with Docker

This application is containerized using Docker and Docker Compose for easy deployment.

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

### Getting Started

#### Option 1: Automated Setup (Recommended)

**On Linux/Mac:**
```bash
chmod +x start-docker.sh
./start-docker.sh
```

**On Windows:**
```cmd
start-docker.bat
```

The script will:
- Check Docker installation
- Create `.env` from template
- Guide you through configuration
- Build and start containers
- Display access URL

#### Option 2: Manual Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd github-pr-dashboard
   ```

2. **Configure environment variables**
   ```bash
   cp env.example .env
   ```

3. **Edit `.env` file with your configuration:**
   ```env
   GITHUB_TOKEN=your_github_personal_access_token
   REPOSITORIES=owner/repo1,owner/repo2
   TEAM_MEMBERS=user1,user2  # Optional
   CLIENT_PORT=3000          # Optional, defaults to 3000
   ```

4. **Start the application**
   ```bash
   docker-compose up -d
   ```

5. **Access the dashboard**
   - Open your browser and navigate to: `http://localhost:3000`

#### Option 3: Using Makefile

```bash
# Start the application
make up

# View logs
make logs

# Check health
make health

# See all available commands
make help
```

### Docker Commands

#### Using Makefile (Easiest)
```bash
make help          # Show all available commands
make up            # Start services
make down          # Stop services
make logs          # View all logs
make logs-server   # View server logs only
make logs-client   # View client logs only
make restart       # Restart all services
make health        # Check container health
make rebuild       # Rebuild from scratch
make clean         # Stop and remove volumes
```

#### Using Docker Compose Directly
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f              # All services
docker-compose logs -f server       # Server only
docker-compose logs -f client       # Client only

# Rebuild images (after code changes)
docker-compose up -d --build

# Check service health
docker-compose ps

# Production mode with resource limits
docker-compose -f docker-compose.prod.yml up -d

# Development mode with hot-reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

#### Health Check Script
```bash
# Run comprehensive health check
chmod +x healthcheck.sh
./healthcheck.sh

# With custom URLs
CLIENT_URL=http://localhost:8080 SERVER_URL=http://localhost:3001 ./healthcheck.sh
```

## 🏗️ Architecture

The application consists of two containerized services:

### 1. **Server (Node.js + Express)**
- **Port:** 3001 (internal)
- **Base Image:** node:20-alpine
- **Features:**
  - Multi-stage build for optimized image size
  - Non-root user for security
  - Health checks
  - Read-only filesystem
  - Signal handling with dumb-init

### 2. **Client (React + Nginx)**
- **Port:** 3000 (configurable via CLIENT_PORT)
- **Base Image:** nginx:1.25-alpine
- **Features:**
  - Multi-stage build (build + serve)
  - Static asset caching
  - Gzip compression
  - Security headers
  - API proxy to backend

## 🔒 Security Features

- **Non-root users:** Both containers run as non-root users
- **Read-only filesystems:** Server runs with read-only root filesystem
- **No new privileges:** Containers cannot escalate privileges
- **Health checks:** Automatic container health monitoring
- **Isolated network:** Services communicate on a dedicated bridge network

## 📊 Production Optimizations

### Image Size Optimization
- Multi-stage builds reduce final image sizes
- Alpine Linux base images (~5MB vs ~900MB)
- Only production dependencies included
- npm cache cleaned after installs

### Performance
- Static assets cached for 1 year
- Gzip compression enabled
- Nginx serves static files efficiently
- Health checks prevent routing to unhealthy containers

### Deployment Best Practices
- Restart policy: `unless-stopped`
- Signal handling with dumb-init
- Proper dependency ordering with health checks
- Environment-based configuration

## 🛠️ Development Mode

For local development without Docker:

1. **Install dependencies**
   ```bash
   npm run install-all
   ```

2. **Create `.env` file in root directory**
   ```env
   GITHUB_TOKEN=your_token
   REPOSITORIES=owner/repo1,owner/repo2
   TEAM_MEMBERS=user1,user2
   ```

3. **Start development servers**
   ```bash
   npm run dev
   ```

This starts both the backend (port 3001) and frontend (port 3000) with hot-reloading.

## 🔧 Customization

### Change Client Port
Edit the `CLIENT_PORT` variable in `.env`:
```env
CLIENT_PORT=8080
```

### Add More Repositories
Edit the `REPOSITORIES` variable in `.env`:
```env
REPOSITORIES=facebook/react,microsoft/vscode,nodejs/node
```

### Configure Team Filtering
Edit the `TEAM_MEMBERS` variable in `.env`:
```env
TEAM_MEMBERS=johndoe,janedoe,bobsmith
```

### Development Mode with Hot Reload

For local development with hot-reloading:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

This will:
- Mount source code into containers
- Enable hot-reload for both frontend and backend
- Use nodemon for backend auto-restart
- Use React's development server for frontend

### Production Mode with Resource Limits

For production deployment with monitoring:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

This includes:
- Resource limits (CPU and memory)
- Structured logging with rotation
- Optional Watchtower for automatic updates
- Health checks with better intervals

Enable automatic updates:
```bash
docker-compose -f docker-compose.prod.yml --profile auto-update up -d
```

## 🚀 Deployment

### Production Deployment

#### Using docker-compose.prod.yml

The production compose file includes:
- CPU and memory resource limits
- Log rotation (10MB max, 3 files)
- Optional Watchtower for auto-updates
- Enhanced security settings

```bash
# Start in production mode
docker-compose -f docker-compose.prod.yml up -d

# With automatic container updates
docker-compose -f docker-compose.prod.yml --profile auto-update up -d
```

Resource allocation:
- **Server**: 256MB-512MB RAM, 0.25-1 CPU
- **Client**: 64MB-256MB RAM, 0.1-0.5 CPU

#### Advanced Production Considerations

For production deployments, consider:

1. **Use a reverse proxy (e.g., Traefik, Nginx)**
   ```yaml
   # Example with Traefik labels
   labels:
     - "traefik.enable=true"
     - "traefik.http.routers.pr-dashboard.rule=Host(`prs.example.com`)"
     - "traefik.http.routers.pr-dashboard.tls.certresolver=letsencrypt"
   ```

2. **Add resource limits**
   ```yaml
   services:
     server:
       deploy:
         resources:
           limits:
             cpus: '0.5'
             memory: 512M
           reservations:
             cpus: '0.25'
             memory: 256M
   ```

3. **Use Docker secrets for sensitive data**
   ```yaml
   services:
     server:
       secrets:
         - github_token
   secrets:
     github_token:
       external: true
   ```

4. **Enable automatic updates with Watchtower**
   ```bash
   docker run -d \
     --name watchtower \
     -v /var/run/docker.sock:/var/run/docker.sock \
     containrrr/watchtower
   ```

### Cloud Deployment

#### Docker Swarm
```bash
docker stack deploy -c docker-compose.yml pr-dashboard
```

#### Kubernetes
Generate Kubernetes manifests:
```bash
kompose convert -f docker-compose.yml
```

#### AWS ECS, Azure Container Instances, Google Cloud Run
The Docker images can be deployed to any container orchestration platform.

## 📝 Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs server
docker-compose logs client

# Check health status
docker-compose ps
```

### Connection issues
```bash
# Verify network
docker network inspect github-pr-dashboard-network

# Test API directly
docker exec -it github-pr-dashboard-server wget -O- http://localhost:3001/api/health
```

### Rebuild from scratch
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## 📦 What's Included

```
github-pr-dashboard/
├── client/
│   ├── Dockerfile              # Multi-stage React build + Nginx
│   ├── Dockerfile.dev          # Development build with hot-reload
│   ├── nginx.conf              # Nginx configuration
│   ├── .dockerignore          # Client Docker ignore rules
│   └── ...                     # React application files
├── server/
│   ├── Dockerfile              # Optimized Node.js server
│   ├── .dockerignore          # Server Docker ignore rules
│   └── index.js                # Express API server
├── .github/
│   └── workflows/
│       ├── docker-build.yml        # CI/CD pipeline
│       └── docker-size-check.yml   # Image size monitoring
├── docker-compose.yml          # Base service orchestration
├── docker-compose.dev.yml      # Development overrides
├── docker-compose.prod.yml     # Production with monitoring
├── .dockerignore              # Root Docker ignore rules
├── .containerrc.yml           # Container metadata
├── Makefile                   # Convenient command shortcuts
├── start-docker.sh            # Automated setup script (Linux/Mac)
├── start-docker.bat           # Automated setup script (Windows)
├── healthcheck.sh             # Health monitoring script
├── env.example                # Environment template
└── DOCKER.md                  # This file
```

## 🎯 Key Features

✅ **Multi-stage builds** for minimal image sizes  
✅ **Health checks** for both services  
✅ **Non-root user** execution  
✅ **Read-only filesystems** where possible  
✅ **Automatic container restart** on failure  
✅ **Network isolation** between services  
✅ **Security hardening** (no privilege escalation)  
✅ **Production-ready Nginx** configuration  
✅ **Gzip compression** for assets  
✅ **Static asset caching** (1 year)  
✅ **Environment-based** configuration  
✅ **Development mode** with hot-reload  
✅ **Resource limits** for production  
✅ **Log rotation** and management  
✅ **Automated setup scripts** for all platforms  
✅ **CI/CD pipelines** with GitHub Actions  
✅ **Multi-architecture support** (amd64, arm64)  
✅ **Vulnerability scanning** with Trivy  
✅ **Comprehensive health** monitoring script  

## 📊 Performance Metrics

### Image Sizes (Alpine-based)
- **Client Image**: ~25-30 MB (multi-stage build)
- **Server Image**: ~80-90 MB (with Node.js)
- **Combined**: ~110-120 MB (vs 1GB+ with standard images)

### Startup Times
- **Server**: ~2-3 seconds to healthy
- **Client**: ~1-2 seconds to healthy
- **Total**: ~5-10 seconds for full stack

### Resource Usage (Idle)
- **Server**: ~30-50 MB RAM, <1% CPU
- **Client**: ~10-15 MB RAM, <1% CPU
- **Total**: ~40-65 MB RAM footprint  

## 📄 License

MIT

