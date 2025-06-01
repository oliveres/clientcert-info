# 🚀 Production Deployment - Fully Automatic

The application automatically obtains and renews SSL certificates from Let's Encrypt. Just set the domain and run!

## 📋 Requirements

- Docker and Docker Compose
- Publicly accessible domain
- Ports 80 and 443 open
- DNS A record pointing to the server

## 🚀 Quick Start

### 1. Download the Application

```bash
git clone https://github.com/yourusername/sslclient-test.git
cd sslclient-test
```

### 2. Run with Your Domain

```bash
# Set domain and run
DOMAIN_NAME=yourdomain.com docker-compose up -d

# Or use .env file
echo "DOMAIN_NAME=yourdomain.com" > .env
docker-compose up -d
```

**That's it!** 🎉

## 🔄 What Happens Automatically

1. **First Start** (30-60 seconds):
   - Nginx starts with temporary certificates
   - Let's Encrypt verifies the domain
   - Real certificates are obtained
   - Nginx automatically switches to new certificates

2. **Automatic Renewal**:
   - Certificates are checked every 12 hours
   - Automatically renewed 30 days before expiration
   - No maintenance required

## 🔧 Advanced Configuration

### Environment Variables

```bash
# Required
DOMAIN_NAME=yourdomain.com

# Optional
LETSENCRYPT_EMAIL=admin@yourdomain.com  # Default: admin@DOMAIN_NAME
NODE_ENV=production                      # Default: production
```

### Using .env File

```bash
# Copy example
cp env.example .env

# Edit values
nano .env

# Run
docker-compose up -d
```

## 📊 Monitoring

### Status Check

```bash
# Container status
docker-compose ps

# Logs
docker-compose logs -f

# Nginx logs only
docker-compose logs -f nginx
```

### Certificate Check

```bash
# Certificate information
docker-compose exec nginx openssl x509 -in /etc/nginx/certs/cert.pem -text -noout

# Check Let's Encrypt certificates
docker-compose exec nginx ls -la /etc/letsencrypt/live/
```

## 🚨 Troubleshooting

### Certificate Not Obtained

1. **Check DNS**:
   ```bash
   nslookup yourdomain.com
   ```

2. **Check Availability**:
   ```bash
   curl http://yourdomain.com
   ```

3. **Check Logs**:
   ```bash
   docker-compose logs nginx | grep -i certbot
   ```

### Nginx Won't Start

```bash
# Check configuration
docker-compose exec nginx nginx -t

# Restart
docker-compose restart nginx
```

## 🐳 Cloud Deployment

### DigitalOcean / AWS / GCP

1. Create VM with Docker
2. Open ports 80, 443
3. Clone repo and run:

```bash
DOMAIN_NAME=yourdomain.com docker-compose up -d
```

### Docker Swarm / Kubernetes

The application is ready for orchestration. Just set environment variables.

## 📝 Notes

- Certificates are in `./certbot/conf/`
- First certificate acquisition takes 30-60 seconds
- Let's Encrypt limit: 50 certificates/domain/week
- For testing use staging: add `--staging` to certbot command 