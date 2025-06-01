# SSL Client Test - Testing Client Certificates

This Next.js application is used to test client SSL/TLS certificates with three possible states:

1. **No Certificate** - Browser didn't send any certificate
2. **Invalid Certificate** - Certificate was sent but cannot be verified  
3. **Valid Certificate** - Certificate was sent and successfully verified

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate Certificates

For basic testing:
```bash
./generate-server-cert.sh
```

For testing certificate validation with complete chain:
```bash
./generate-test-certificates.sh
```

This creates a complete certificate chain including CA, server cert, valid and invalid client certificates.

### 3. Run the Application

For development:
```bash
npm run dev
```

For production with Nginx proxy (RECOMMENDED):
```bash
# Build and run with Docker
npm run docker:build
npm run docker:up
```

The server will run at:
- Direct Node.js: `https://localhost:3000`
- With Docker/Nginx: `https://localhost` (port 443)

### 4. Access the Application

On first access:
1. The browser will warn you about the self-signed server certificate
2. In Chrome: click "Advanced" → "Proceed to localhost"
3. The browser will prompt you to select a client certificate
4. Select your certificate that you want to test

## 📋 What the Application Displays

After successful handshake, the application displays:

### Subject Information
- Common Name (CN)
- Organization (O)
- Organizational Unit (OU)
- Email
- Country (C)
- State/Province (ST)
- Locality (L)

### Issuer Information
- All the same fields as the subject

### Certificate Validity
- Valid From
- Valid To
- Serial Number

### Technical Information
- SHA-1 Fingerprint
- SHA-256 Fingerprint
- Subject Alternative Names (SAN)
- Extended Key Usage

## 🔐 How It Works

1. **HTTPS Server**: Express server runs on HTTPS with self-signed certificate
2. **Certificate Request**: Server is configured with `requestCert: true` to ask for client certificates
3. **Certificate Validation**: 
   - By default: Accepts any certificate without validation
   - **Manual Validation**: Users can upload CA certificates and validate manually
4. **Status Detection**: The app detects certificate presence and allows manual validation

## 🆕 Manual Certificate Validation

The application supports manual certificate validation where users can:

1. **Upload CA certificates** (intermediate and/or root) directly in the browser
2. **Click "Verify Certificate"** to validate their client certificate
3. **See immediate results** with detailed error messages if validation fails

This approach:
- Works with ANY certificate authority
- Doesn't have the 150+ CA limitation
- Gives users full control over which CAs to trust

For detailed instructions, see [MANUAL_VALIDATION.md](MANUAL_VALIDATION.md)

## 🐳 Docker Deployment

### Development (localhost)

```bash
# Build and start services
docker-compose up -d

# Stop services
docker-compose down
```

### Production with Let's Encrypt

Simply run with your domain:

```bash
DOMAIN_NAME=yourdomain.com docker-compose up -d
```

That's it! The application will:
- Start with temporary certificates
- Automatically obtain Let's Encrypt certificates
- Switch to the new certificates
- Auto-renew certificates every 12 hours

Docker setup includes:
- Automatic Let's Encrypt certificate provisioning
- Certificate auto-renewal every 12 hours
- Custom Nginx with SSL/TLS optimizations
- Client certificate support with manual validation
- Production-ready security headers

See [DOCKER_README.md](DOCKER_README.md) for detailed Docker setup.

## 📁 Project Structure

```
sslclient-test/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── layout.tsx         # Main layout
│   └── page.tsx           # Main page with UI
├── certificates/          # Server certificates (generated)
├── docker/                # Docker configuration
│   ├── nginx/            # Nginx configuration and Dockerfile
│   └── docker-compose.yml # Docker Compose setup
├── public/               # Static assets
├── server.js             # Express server for development
├── server-nginx.js       # Express server for Nginx proxy
├── generate-*.sh         # Certificate generation scripts
└── README.md             # This file
```

## 🧪 Testing Different Certificate States

### 1. Testing "No Certificate" State
Simply access the application without selecting any certificate when prompted.

### 2. Testing "Invalid Certificate" State
- Use any self-signed certificate
- Use `client-invalid.p12` from `generate-test-certificates.sh`
- Use a certificate from an untrusted CA

### 3. Testing "Valid Certificate" State
For manual validation:
1. Upload the CA certificate(s) that signed your certificate
2. Click "Verify Certificate"
3. The application will show if validation succeeded or failed

### Real-World Certificates
You can test with:
- Personal certificates (e.g., ID card with chip)
- Corporate certificates
- Certificates from commercial CAs

## ⚠️ Known Limitations

### SSL/TLS Protocol Issue
When a server configures too many CA certificates (150+), browsers stop sending client certificates during the SSL handshake. This is a known limitation affecting both Node.js and Nginx.

**Solution**: Use the manual validation feature where users upload only the relevant CA certificates.

## 🔧 Troubleshooting

### "NET::ERR_CERT_AUTHORITY_INVALID"
- This is normal for self-signed server certificate
- Click on "Advanced" and proceed

### Browser Doesn't Offer Any Certificate
- Make sure you have at least one client certificate installed
- On Windows: certificates are in Certificate Store
- On macOS: certificates are in Keychain Access
- On Linux: depends on browser and system

### Server Won't Start
- Check that files `certificates/server-cert.pem` and `certificates/server-key.pem` exist
- Make sure port 3000 is not occupied

## 🔍 Developer Information

Server logs to console:
- When client provides certificate
- When client doesn't provide certificate
- Basic certificate information (CN)

For debugging, you can watch the output in the terminal where the server is running. 