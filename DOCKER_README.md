# 🐳 Docker Deployment - SSL Client Certificates

Containerized solution with support for ALL global CA certificates using Nginx reverse proxy.

## 🚀 Quick Start (Local Development)

```bash
# 1. Generate test certificates (if you don't have them yet)
./generate-server-cert.sh

# 2. Run Docker Compose
docker-compose up -d

# 3. Open in browser
https://localhost
```

## 📦 What's Included

- **Node.js application** - Next.js server running on port 3001
- **Custom Nginx image** - Alpine Linux with CA certificates for client certificate validation
- **Docker Compose** - Container orchestration
- **Certbot** (optional) - Automatic Let's Encrypt certificates for production
- **UTF-8 support** - Proper display of all languages including Czech, Chinese, etc.

## 🌐 Production Deployment

### 1. Digital Ocean Droplet (RECOMMENDED)

```bash
# On Droplet (Ubuntu 20.04+)
# 1. Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt-get install docker-compose-plugin

# 2. Clone the project
git clone <your-repo>
cd sslclient-test

# 3. Edit nginx-prod.conf - change example.com to your domain
nano docker/nginx/nginx-prod.conf

# 4. Run Docker stack
docker-compose up -d
```

### 2. Other Cloud Platforms

#### AWS ECS / Fargate
- Use Application Load Balancer (ALB) for SSL termination
- ALB supports client certificates natively

#### Google Cloud Run
- Use Cloud Load Balancer
- Set up SSL policies for client certificates

#### Azure Container Instances
- Use Application Gateway
- Supports mutual TLS authentication

### ⚠️ Digital Ocean App Platform
**DOES NOT SUPPORT** client SSL certificates! Use instead:
- Digital Ocean Droplet with Docker
- Digital Ocean Kubernetes (DOKS)

## 🔧 Configuration

### Changing Ports
In `docker-compose.yml`:
```yaml
nginx:
  ports:
    - "8080:80"    # HTTP
    - "8443:443"   # HTTPS
```

### Custom CA Certificates
Add to `docker-compose.yml`:
```yaml
nginx:
  volumes:
    - ./my-custom-ca.pem:/etc/ssl/certs/my-custom-ca.pem:ro
```

### Environment Variables
In `docker-compose.yml`:
```yaml
app:
  environment:
    - NODE_ENV=production
    - CUSTOM_VAR=value
```

## 🛠️ Commands

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Logs
docker-compose logs -f

# Rebuild after changes
docker-compose up -d --build
```

## 📊 Monitoring

```bash
# Container status
docker-compose ps

# Resource usage
docker stats

# Nginx logs
docker-compose logs -f nginx

# App logs
docker-compose logs -f app
```

## 🐛 Troubleshooting

### Browser doesn't send certificate
- Check that you have a certificate installed
- Clear browser cache
- Try a different browser

### "502 Bad Gateway"
```bash
# Check that app is running
docker-compose ps
docker-compose logs app
```

### SSL errors
```bash
# Check Nginx configuration
docker-compose exec nginx nginx -t
```

### Permission denied
```bash
# On Linux you may need
sudo docker-compose up -d
```

## 🔒 Security

1. **Production**: Always use Let's Encrypt or other trusted certificates
2. **Firewall**: Allow only ports 80 and 443
3. **Updates**: Regularly update Docker images
4. **Secrets**: Never commit private keys to Git

## 📝 Structure

```
sslclient-test/
├── docker/
│   └── nginx/
│       ├── nginx.conf         # Development configuration
│       └── nginx-prod.conf    # Production configuration
├── certificates/              # Certificates
├── docker-compose.yml         # Docker stack configuration
└── Dockerfile                 # Node.js app image
``` 