const express = require('express');
const next = require('next');
const https = require('https');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = process.env.PORT || 3000;

// Middleware for processing client certificate
const processClientCertificate = (req, res, next) => {
  const cert = req.socket.getPeerCertificate(true);
  
  // Check if certificate was provided
  if (!cert || Object.keys(cert).length === 0) {
    console.log('Client did not provide certificate');
    req.certificateStatus = 'missing';
    next();
    return;
  }

  // Certificate was provided
  console.log(`Client provided certificate: ${cert.subject?.CN || 'Unknown'}`);
  req.clientCertificate = cert;
  
  // Check if certificate is authorized/valid
  if (req.client.authorized) {
    console.log('Certificate is authorized/valid');
    req.certificateStatus = 'valid';
  } else {
    console.log('Certificate is not authorized/invalid');
    req.certificateStatus = 'invalid';
    // Get the authorization error if available
    const authError = req.client.authorizationError;
    if (authError) {
      console.log(`Authorization error: ${authError}`);
      req.authorizationError = authError;
    }
  }
  
  next();
};

app.prepare().then(() => {
  const server = express();

  // API endpoint for getting certificate information
  server.get('/api/certificate', processClientCertificate, (req, res) => {
    const response = {
      status: req.certificateStatus,
      authorizationError: req.authorizationError
    };

    if (req.clientCertificate) {
      const cert = req.clientCertificate;
      response.certificate = {
        subject: cert.subject,
        issuer: cert.issuer,
        valid_from: cert.valid_from,
        valid_to: cert.valid_to,
        serialNumber: cert.serialNumber,
        fingerprint: cert.fingerprint,
        fingerprint256: cert.fingerprint256,
        subjectaltname: cert.subjectaltname,
        ext_key_usage: cert.ext_key_usage,
        raw: cert.raw ? cert.raw.toString('base64') : null
      };
    }
    
    res.json(response);
  });

  // All other requests are handled by Next.js  
  server.all('*', processClientCertificate, (req, res) => {
    // Block access if no certificate is provided for non-API routes
    if (req.certificateStatus === 'missing' && !req.path.startsWith('/api/')) {
      return res.status(401).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Client Certificate Required</title>
          <style>
            body {
              margin: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: rgba(255, 255, 255, 0.05);
              border-radius: 1rem;
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.1);
              max-width: 500px;
            }
            h1 { color: #ff6b6b; margin-bottom: 1rem; }
            p { color: #cccccc; line-height: 1.6; }
            .code { 
              background: rgba(0, 0, 0, 0.3); 
              padding: 1rem; 
              border-radius: 0.5rem; 
              font-family: monospace;
              margin-top: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔐 Client Certificate Required</h1>
            <p>This application requires a client certificate for authentication.</p>
            <p>Please ensure you have a certificate installed in your browser and try again.</p>
            <div class="code">Error: No client certificate provided</div>
          </div>
        </body>
        </html>
      `);
    }
    return handle(req, res);
  });

  // HTTPS configuration
  const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, 'certificates', 'server-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'certificates', 'server-cert.pem')),
    requestCert: true,        // Request certificate from client
    rejectUnauthorized: false, // Don't reject connection, just mark as unauthorized
    // Optional: Add CA certificate to verify against specific CA
    // ca: fs.readFileSync(path.join(__dirname, 'certificates', 'ca-cert.pem'))
  };

  https.createServer(httpsOptions, server).listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Server running at https://localhost:${PORT}`);
    console.log('> Client certificate authentication enabled');
    console.log('> Certificate validation: ON (will check if certificate is trusted)');
  });
}); 