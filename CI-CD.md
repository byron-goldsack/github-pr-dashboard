# CI/CD and Automation Guide

## GitHub Actions Workflows

This project includes automated CI/CD pipelines using GitHub Actions.

### Docker Build and Push (`docker-build.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Version tags (e.g., `v1.0.0`)
- Pull requests to `main`

**Actions:**
1. Builds both client and server Docker images
2. Pushes to GitHub Container Registry (ghcr.io)
3. Creates multi-architecture images (amd64, arm64)
4. Runs Trivy vulnerability scans
5. Uploads security results to GitHub Security

**Setup Required:**
1. Enable GitHub Actions in your repository
2. Grant workflow permissions:
   - Settings → Actions → General → Workflow permissions
   - Select "Read and write permissions"

**Usage:**
```bash
# Trigger on version tag
git tag v1.0.0
git push origin v1.0.0

# Images will be available at:
# ghcr.io/YOUR_USERNAME/github-pr-dashboard-client:v1.0.0
# ghcr.io/YOUR_USERNAME/github-pr-dashboard-server:v1.0.0
```

### Image Size Check (`docker-size-check.yml`)

**Triggers:**
- Pull requests that modify Dockerfiles or dependencies

**Actions:**
1. Builds Docker images
2. Reports image sizes in PR comments
3. Helps track size changes over time

## Using Pre-built Images

### Pull from GitHub Container Registry

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull images
docker pull ghcr.io/YOUR_USERNAME/github-pr-dashboard-client:latest
docker pull ghcr.io/YOUR_USERNAME/github-pr-dashboard-server:latest

# Update docker-compose.yml to use pre-built images
version: '3.9'
services:
  server:
    image: ghcr.io/YOUR_USERNAME/github-pr-dashboard-server:latest
    # ... rest of config
  
  client:
    image: ghcr.io/YOUR_USERNAME/github-pr-dashboard-client:latest
    # ... rest of config
```

## Automated Deployment

### Deploy with Watchtower

Watchtower automatically updates running containers when new images are available.

**Enable in docker-compose.prod.yml:**
```bash
docker-compose -f docker-compose.prod.yml --profile auto-update up -d
```

**Configuration:**
- Checks for updates every 24 hours
- Automatically pulls new images
- Restarts containers with new versions
- Cleans up old images

### Deploy to Cloud Platforms

#### AWS ECS

1. **Push images to ECR:**
```bash
# Authenticate
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

# Tag and push
docker tag ghcr.io/YOUR_USERNAME/github-pr-dashboard-client:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/pr-dashboard-client:latest
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/pr-dashboard-client:latest
```

2. **Create ECS Task Definition:**
```json
{
  "family": "github-pr-dashboard",
  "containerDefinitions": [
    {
      "name": "server",
      "image": "YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/pr-dashboard-server:latest",
      "memory": 512,
      "cpu": 256,
      "essential": true,
      "environment": [
        {"name": "GITHUB_TOKEN", "value": "your-token"},
        {"name": "REPOSITORIES", "value": "owner/repo"}
      ],
      "portMappings": [{"containerPort": 3001}]
    },
    {
      "name": "client",
      "image": "YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/pr-dashboard-client:latest",
      "memory": 256,
      "cpu": 128,
      "essential": true,
      "portMappings": [{"containerPort": 80}],
      "dependsOn": [{"containerName": "server", "condition": "HEALTHY"}]
    }
  ]
}
```

#### Google Cloud Run

```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT_ID/pr-dashboard-client ./client
gcloud builds submit --tag gcr.io/PROJECT_ID/pr-dashboard-server ./server

# Deploy server
gcloud run deploy pr-dashboard-server \
  --image gcr.io/PROJECT_ID/pr-dashboard-server \
  --platform managed \
  --region us-central1 \
  --set-env-vars GITHUB_TOKEN=your-token,REPOSITORIES=owner/repo

# Deploy client
gcloud run deploy pr-dashboard-client \
  --image gcr.io/PROJECT_ID/pr-dashboard-client \
  --platform managed \
  --region us-central1
```

#### Azure Container Instances

```bash
# Create resource group
az group create --name pr-dashboard-rg --location eastus

# Create container registry
az acr create --resource-group pr-dashboard-rg --name prdashboardacr --sku Basic

# Push images
az acr login --name prdashboardacr
docker tag github-pr-dashboard-client:latest prdashboardacr.azurecr.io/client:latest
docker push prdashboardacr.azurecr.io/client:latest

# Deploy
az container create \
  --resource-group pr-dashboard-rg \
  --name pr-dashboard \
  --image prdashboardacr.azurecr.io/client:latest \
  --dns-name-label pr-dashboard \
  --ports 80
```

#### Kubernetes

Generate manifests:
```bash
# Install kompose
curl -L https://github.com/kubernetes/kompose/releases/download/v1.31.2/kompose-linux-amd64 -o kompose
chmod +x kompose
sudo mv kompose /usr/local/bin/

# Convert docker-compose to k8s
kompose convert -f docker-compose.yml

# Apply to cluster
kubectl apply -f .
```

Or use Helm:
```bash
# Install with helm
helm install pr-dashboard ./helm-chart \
  --set env.GITHUB_TOKEN=your-token \
  --set env.REPOSITORIES=owner/repo
```

## Monitoring and Observability

### Health Check Monitoring

**Manual checks:**
```bash
./healthcheck.sh
```

**With Prometheus:**
```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
  
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    ports:
      - "8080:8080"
```

**Prometheus config:**
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
```

### Log Aggregation

**With ELK Stack:**
```yaml
# docker-compose.logging.yml
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"
  
  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
  
  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
```

## Backup and Recovery

### Backup Strategy

```bash
#!/bin/bash
# backup.sh - Backup Docker volumes and configs

BACKUP_DIR="./backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup environment config
cp .env "$BACKUP_DIR/"

# Backup Docker volumes (if any)
docker run --rm -v github-pr-dashboard_data:/data -v "$BACKUP_DIR":/backup alpine tar czf /backup/volumes.tar.gz /data

# Backup logs
docker-compose logs > "$BACKUP_DIR/logs.txt"

echo "Backup completed: $BACKUP_DIR"
```

### Restore

```bash
#!/bin/bash
# restore.sh - Restore from backup

BACKUP_DIR=$1

if [ -z "$BACKUP_DIR" ]; then
    echo "Usage: ./restore.sh <backup-directory>"
    exit 1
fi

# Restore environment
cp "$BACKUP_DIR/.env" .env

# Restore volumes
docker run --rm -v github-pr-dashboard_data:/data -v "$BACKUP_DIR":/backup alpine tar xzf /backup/volumes.tar.gz -C /

echo "Restore completed from: $BACKUP_DIR"
```

## Security Best Practices

### Image Scanning

**Scan with Trivy:**
```bash
# Install Trivy
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# Scan images
trivy image github-pr-dashboard-client:latest
trivy image github-pr-dashboard-server:latest

# Fail on HIGH/CRITICAL vulnerabilities
trivy image --exit-code 1 --severity HIGH,CRITICAL github-pr-dashboard-server:latest
```

### Secrets Management

**Using Docker Secrets:**
```yaml
# docker-compose.secrets.yml
version: '3.9'

services:
  server:
    secrets:
      - github_token
    environment:
      - GITHUB_TOKEN_FILE=/run/secrets/github_token

secrets:
  github_token:
    file: ./secrets/github_token.txt
```

**Using HashiCorp Vault:**
```bash
# Inject secrets from Vault
docker run -d \
  -e VAULT_ADDR=https://vault.example.com \
  -e VAULT_TOKEN=$VAULT_TOKEN \
  ghcr.io/YOUR_USERNAME/github-pr-dashboard-server:latest
```

## Performance Tuning

### Build Cache Optimization

```yaml
# docker-compose.build.yml
services:
  client:
    build:
      cache_from:
        - ghcr.io/YOUR_USERNAME/github-pr-dashboard-client:latest
      args:
        BUILDKIT_INLINE_CACHE: 1
```

### Multi-stage Build Optimization

The Dockerfiles already use multi-stage builds, but you can further optimize:

1. **Order dependencies by change frequency**
2. **Use .dockerignore aggressively**
3. **Leverage BuildKit:**
   ```bash
   DOCKER_BUILDKIT=1 docker-compose build
   ```

## Troubleshooting

### Build Issues

```bash
# Clear build cache
docker builder prune -a

# Build with no cache
docker-compose build --no-cache

# Check build logs
docker-compose build --progress=plain
```

### Runtime Issues

```bash
# Check container logs
docker-compose logs -f --tail=100

# Inspect container
docker inspect github-pr-dashboard-server

# Enter container for debugging
docker-compose exec server sh

# Check health status
docker-compose ps
./healthcheck.sh
```

## Maintenance

### Regular Updates

```bash
# Update base images
docker-compose pull
docker-compose up -d --build

# Clean up unused resources
docker system prune -a --volumes

# Update dependencies
cd client && npm update
cd ../server && npm update
```

### Monitoring Disk Usage

```bash
# Check Docker disk usage
docker system df

# Clean up
docker system prune -a --volumes -f
```

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)

