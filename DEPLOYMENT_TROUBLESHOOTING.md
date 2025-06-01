# 🔧 Deployment Troubleshooting

## Common Deployment Issues and Solutions

### 1. Portainer: "snippets not found" Error

**Problem**: Docker build fails with `"/snippets": not found`

**Solution**: Ensure all required files exist in nginx directory:

```bash
# Check if files exist
ls -la docker/nginx/snippets/
ls -la docker/nginx/default-certs/

# If missing, run:
cd docker/nginx
./generate-default-certs.sh
```

**Required Files**:
- `docker/nginx/snippets/ssl-params.conf`
- `docker/nginx/snippets/security-headers.conf`
- `docker/nginx/default-certs/default.crt`
- `docker/nginx/default-certs/default.key`

### 2. Digital Ocean App Platform: NPM Permission Denied

**Problem**: EACCES error during npm install

**Solution**: Use the simplified Dockerfile:

1. Use `Dockerfile.do` instead of `Dockerfile`
2. Configure deployment in Digital Ocean App Platform:
   - Source: Your GitHub repository
   - Branch: main
   - Dockerfile Path: `Dockerfile.do`
   - HTTP Port: 3001

**Alternative**: Use buildpack instead of Dockerfile:
- Remove Dockerfile specification
- Let Digital Ocean auto-detect Node.js app
- Set Environment Variables:
  - `NODE_ENV=production`
  - `PORT=3001`

### 3. Heroku: Missing Build Dependencies

**Problem**: Build fails due to missing dependencies

**Solution**: Add Heroku-specific configuration:

```json
// package.json
{
  "engines": {
    "node": "18.x",
    "npm": "9.x"
  },
  "scripts": {
    "heroku-postbuild": "npm run build"
  }
}
```

### 4. SSL Certificate Issues

**Problem**: Application works locally but not in production

**Solutions**:

1. **For Docker Deployment**: Use the full docker-compose setup with automatic Let's Encrypt
2. **For PaaS Platforms**: The platform provides SSL termination, so disable client certificates in production:

```javascript
// server-nginx.js - Add environment check
const isProduction = process.env.NODE_ENV === 'production';
const isPlatformDeployment = process.env.PLATFORM_DEPLOYMENT === 'true';

const httpsOptions = {
  key: fs.readFileSync('certificates/server-key.pem'),
  cert: fs.readFileSync('certificates/server-cert.pem'),
  requestCert: !isPlatformDeployment, // Disable client certs on platforms
  rejectUnauthorized: false
};
```

### 5. Port Issues

**Problem**: Application doesn't start or isn't accessible

**Solutions**:

1. **Check port configuration**:
   ```javascript
   const PORT = process.env.PORT || 3001;
   ```

2. **For different platforms**:
   - **Digital Ocean**: Use port 3001 (or platform-assigned port)
   - **Heroku**: Use `process.env.PORT`
   - **Docker**: Use 3001 internally, map externally

### 6. Build Optimization for Cloud Platforms

**For faster builds on cloud platforms**:

```dockerfile
# Use .dockerignore
node_modules
.git
.next
certificates
*.log
```

```bash
# .dockerignore content
node_modules
.git
.gitignore
README.md
.env.local
.env.*.local
certificates
docker
.next
```

## Platform-Specific Deployment

### Digital Ocean App Platform

1. **Repository Setup**:
   - Push code to GitHub
   - Connect GitHub repo to Digital Ocean

2. **App Configuration**:
   - Runtime: Node.js
   - Build Command: `npm run build`
   - Run Command: `node server-nginx.js`
   - Port: 3001

3. **Environment Variables**:
   ```
   NODE_ENV=production
   PLATFORM_DEPLOYMENT=true
   ```

### Heroku

1. **Deploy**:
   ```bash
   heroku create your-app-name
   git push heroku main
   ```

2. **Config**:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set PLATFORM_DEPLOYMENT=true
   ```

### Vercel

**Note**: Vercel doesn't support client certificates due to platform limitations. Consider alternative deployment for SSL client testing.

## Testing Deployment

After deployment, test the application:

1. **Access the application**: `https://your-domain.com`
2. **Check console logs**: Look for any JavaScript errors
3. **Test certificate functionality**: 
   - Should show "No Certificate" status on platforms without client cert support
   - Should work normally on Docker deployments

## Getting Help

If you continue experiencing issues:

1. Check platform-specific logs
2. Verify all environment variables are set
3. Test locally with the same configuration
4. Check platform documentation for Node.js deployment requirements 