const express = require('express');
const next = require('next');
const http = require('http');
const crypto = require('crypto');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = 3001; // Different port than Nginx (3001 instead of 3000)

// Mapping of known CA issuers to files
const CA_MAPPING = {
  'PostSignum Qualified CA 4': 'postsignum-qualified-ca4-chain.pem',
  'PostSignum Public CA 4': 'postsignum-public-ca4-chain.pem',
  'PostSignum Root QCA 4': 'postsignum-root-qca4.pem',
  'DigiCert Global Root CA': 'digicert-global-root-ca.pem',
  'DigiCert Global Root G2': 'digicert-global-root-g2.pem',
  'Let\'s Encrypt Authority X3': 'lets-encrypt-x3.pem',
  'ISRG Root X1': 'isrg-root-x1.pem',
  'GlobalSign Root CA': 'globalsign-root-ca.pem',
  'GeoTrust Global CA': 'geotrust-global-ca.pem',
  'Symantec Class 3 Secure Server CA': 'symantec-class3-ca.pem',
  'VeriSign Class 3 Public Primary Certification Authority': 'verisign-class3-ca.pem',
  // Add more as needed
};

// Cache for validation results
const validationCache = new Map();

// Function for validating certificate against CA
async function validateCertificate(certPem, issuerCN) {
  try {
    // Check cache
    const cacheKey = crypto.createHash('sha256').update(certPem).digest('hex');
    if (validationCache.has(cacheKey)) {
      return validationCache.get(cacheKey);
    }

    // Find matching CA file
    let caFile = null;
    for (const [issuerName, fileName] of Object.entries(CA_MAPPING)) {
      if (issuerCN.includes(issuerName)) {
        caFile = path.join(__dirname, 'docker/nginx/ca-certificates', fileName);
        break;
      }
    }

    if (!caFile || !fs.existsSync(caFile)) {
      // Try to find CA in system certificates
      const possibleLocations = [
        '/etc/ssl/certs',
        '/usr/local/share/ca-certificates',
        '/etc/pki/tls/certs'
      ];
      
      for (const location of possibleLocations) {
        const systemCaPath = path.join(location, 'ca-certificates.crt');
        if (fs.existsSync(systemCaPath)) {
          caFile = systemCaPath;
          break;
        }
      }
    }

    if (!caFile) {
      // For testing purposes, return that CA was not found but certificate may be valid
      return { 
        valid: false, 
        error: 'CA certificate not found for issuer: ' + issuerCN,
        message: 'CA certificate needs to be added to the system for validation'
      };
    }

    // Create temporary file with certificate
    const tempCertFile = `/tmp/cert-${Date.now()}.pem`;
    
    // Make sure certificate has correct PEM format
    let pemCert = certPem;
    if (!pemCert.includes('-----BEGIN CERTIFICATE-----')) {
      pemCert = `-----BEGIN CERTIFICATE-----\n${pemCert}\n-----END CERTIFICATE-----`;
    }
    
    fs.writeFileSync(tempCertFile, pemCert);

    try {
      // Validate certificate using OpenSSL
      const result = execSync(
        `openssl verify -CAfile "${caFile}" "${tempCertFile}"`,
        { encoding: 'utf8' }
      );

      const isValid = result.includes('OK');
      const validationResult = {
        valid: isValid,
        message: isValid ? 'Certificate is valid' : 'Certificate is not valid',
        caFile: path.basename(caFile)
      };

      // Save to cache
      validationCache.set(cacheKey, validationResult);
      
      return validationResult;
    } catch (error) {
      return {
        valid: false,
        error: error.message || 'Validation error',
        details: error.stderr || error.stdout
      };
    } finally {
      // Delete temporary file
      if (fs.existsSync(tempCertFile)) {
        fs.unlinkSync(tempCertFile);
      }
    }
  } catch (error) {
    console.error('Certificate validation error:', error);
    return { valid: false, error: error.message };
  }
}

// Parser for certificate from Nginx header
function parseCertificateFromNginx(headers) {
  const certHeader = headers['x-ssl-client-cert'];
  const verifyStatus = headers['x-ssl-client-verify'];
  
  if (!certHeader || certHeader === '') {
    return { status: 'missing' };
  }
  
  try {
    // Decode certificate from URL encoded format
    const certPem = decodeURIComponent(certHeader);
    
    // Parse information from certificate
    // When using optional_no_ca, verify status is typically "NONE"
    const certificate = {
      status: 'invalid', // With optional_no_ca we cannot validate against CA
      subject: headers['x-ssl-client-subject-dn'],
      issuer: headers['x-ssl-client-issuer-dn'],
      serialNumber: headers['x-ssl-client-serial'],
      fingerprint: headers['x-ssl-client-fingerprint'],
      valid_from: headers['x-ssl-client-start-date'],
      valid_to: headers['x-ssl-client-end-date'],
      days_remaining: headers['x-ssl-client-days-remaining'],
      raw: certPem
    };
    
    // Explain why certificate is invalid
    certificate.authorizationError = 'CA validation disabled due to browser compatibility issue';
    
    // Calculate SHA-256 fingerprint
    if (certPem) {
      const certBuffer = Buffer.from(certPem);
      certificate.fingerprint256 = crypto
        .createHash('sha256')
        .update(certBuffer)
        .digest('hex')
        .toUpperCase()
        .match(/.{2}/g)
        .join(':');
    }
    
    // Parse subject and issuer DN
    if (certificate.subject) {
      certificate.subjectParsed = parseDN(certificate.subject);
    }
    if (certificate.issuer) {
      certificate.issuerParsed = parseDN(certificate.issuer);
    }
    
    return certificate;
  } catch (error) {
    console.error('Error parsing certificate from Nginx:', error);
    return { status: 'error', error: error.message };
  }
}

// Helper function for parsing DN (Distinguished Name)
function parseDN(dn) {
  const parts = {};
  if (!dn) return parts;
  
  // Function for decoding UTF-8 escape sequences
  function decodeUtf8Escapes(str) {
    // First try to decode \xHH format
    str = str.replace(/\\x([0-9A-Fa-f]{2})/g, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
    
    // Then decode \HH format (typical for UTF-8 in DN)
    const bytes = [];
    let i = 0;
    
    while (i < str.length) {
      if (str[i] === '\\' && i + 2 < str.length && 
          /[0-9A-Fa-f]{2}/.test(str.substring(i + 1, i + 3))) {
        // Found \HH sequence
        bytes.push(parseInt(str.substring(i + 1, i + 3), 16));
        i += 3;
      } else {
        // Normal character
        bytes.push(str.charCodeAt(i));
        i++;
      }
    }
    
    // Decode byte array as UTF-8
    try {
      return Buffer.from(bytes).toString('utf8');
    } catch (e) {
      console.error('UTF-8 decode error:', e);
      return str; // Return original string on error
    }
  }
  
  // Regex for parsing DN
  const regex = /([A-Za-z]+)=([^,]+)(?:,|$)/g;
  let match;
  
  while ((match = regex.exec(dn)) !== null) {
    const key = match[1];
    let value = match[2].trim();
    
    // Decode UTF-8 escape sequences
    value = decodeUtf8Escapes(value);
    
    parts[key] = value;
  }
  
  return parts;
}

app.prepare().then(() => {
  const server = express();

  // API endpoint for getting certificate information
  server.get('/api/certificate', (req, res) => {
    const certificateInfo = parseCertificateFromNginx(req.headers);
    
    console.log('Certificate status:', certificateInfo.status);
    if (certificateInfo.status !== 'missing') {
      console.log('Raw Subject DN:', req.headers['x-ssl-client-subject-dn']);
      console.log('Parsed Subject:', JSON.stringify(certificateInfo.certificate?.subject, null, 2));
      console.log('Valid:', certificateInfo.status === 'valid' ? 'YES' : 'NO');
    }
    
    // Transform response to format expected by frontend
    if (certificateInfo.status !== 'missing' && certificateInfo.status !== 'error') {
      const response = {
        status: certificateInfo.status,
        authorizationError: certificateInfo.authorizationError,
        certificate: {
          subject: certificateInfo.subjectParsed || {},
          issuer: certificateInfo.issuerParsed || {},
          valid_from: certificateInfo.valid_from,
          valid_to: certificateInfo.valid_to,
          serialNumber: certificateInfo.serialNumber,
          fingerprint: certificateInfo.fingerprint,
          fingerprint256: certificateInfo.fingerprint256,
          subjectaltname: certificateInfo.subjectaltname,
          ext_key_usage: certificateInfo.ext_key_usage,
          raw: certificateInfo.raw
        }
      };
      res.json(response);
    } else {
      res.json(certificateInfo);
    }
  });

  // API endpoint for server information
  server.get('/api/server-info', (req, res) => {
    res.json({
      mode: 'nginx-proxy',
      port: PORT,
      nginxHeaders: {
        'X-SSL-Client-Verify': req.headers['x-ssl-client-verify'] || 'not set',
        'X-SSL-Client-Subject-DN': req.headers['x-ssl-client-subject-dn'] || 'not set'
      }
    });
  });

  // API endpoint for asynchronous certificate validation
  server.post('/api/validate-certificate', express.json({ limit: '10mb' }), async (req, res) => {
    try {
      const { certificate, issuerCN } = req.body;
      
      if (!certificate || !issuerCN) {
        return res.status(400).json({ 
          error: 'Missing certificate or issuer information' 
        });
      }

      // Perform validation
      const validationResult = await validateCertificate(certificate, issuerCN);
      
      res.json(validationResult);
    } catch (error) {
      console.error('Validation error:', error);
      res.status(500).json({ 
        error: 'Internal server error during validation' 
      });
    }
  });

  // API endpoint for validation with uploaded CA certificates
  server.post('/api/validate-certificate-with-ca', express.json({ limit: '50mb' }), async (req, res) => {
    try {
      const { certificate, caCertificates } = req.body;
      
      if (!certificate || !caCertificates || caCertificates.length === 0) {
        return res.status(400).json({ 
          error: 'Missing certificate or CA certificates' 
        });
      }

      // Create temporary files
      const tempCertFile = `/tmp/cert-${Date.now()}.pem`;
      const tempCAFile = `/tmp/ca-bundle-${Date.now()}.pem`;
      
      try {
        // Make sure certificate has correct format
        let pemCert = certificate;
        if (!pemCert.includes('-----BEGIN CERTIFICATE-----')) {
          pemCert = `-----BEGIN CERTIFICATE-----\n${pemCert}\n-----END CERTIFICATE-----`;
        }
        
        // Save certificate
        fs.writeFileSync(tempCertFile, pemCert);
        
        // Create CA bundle from all uploaded CA certificates
        const caBundle = caCertificates.join('\n');
        fs.writeFileSync(tempCAFile, caBundle);
        
        // Validate certificate using OpenSSL
        const result = execSync(
          `openssl verify -CAfile "${tempCAFile}" "${tempCertFile}"`,
          { encoding: 'utf8' }
        );

        const isValid = result.includes('OK');
        res.json({
          valid: isValid,
          message: isValid 
            ? 'Certificate successfully verified against uploaded CA certificates' 
            : 'Certificate is not valid',
          details: result
        });
        
      } catch (error) {
        res.json({
          valid: false,
          error: error.message || 'Validation error',
          details: error.stderr || error.stdout || error.toString()
        });
      } finally {
        // Delete temporary files
        if (fs.existsSync(tempCertFile)) {
          fs.unlinkSync(tempCertFile);
        }
        if (fs.existsSync(tempCAFile)) {
          fs.unlinkSync(tempCAFile);
        }
      }
    } catch (error) {
      console.error('Validation error:', error);
      res.status(500).json({ 
        error: 'Internal server error during validation' 
      });
    }
  });
  
  // Test endpoint for UTF-8
  server.get('/api/test-utf8', (req, res) => {
    const testStrings = {
      czech: 'Oldřich Švéda',
      chinese: '你好世界',
      japanese: 'こんにちは',
      arabic: 'مرحبا بالعالم',
      emoji: '🎉 🔐 ✅'
    };
    
    // Test parsing
    const testDN = 'CN=Old\\C5\\99ich \\C5\\A0v\\C3\\A9da,O=\\C4\\8Cesk\\C3\\A1 po\\C5\\A1ta';
    const parsed = parseDN(testDN);
    
    res.json({
      testStrings,
      testDN,
      parsed,
      nodeVersion: process.version
    });
  });

  // All other requests are handled by Next.js
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  // HTTP server (not HTTPS - SSL handled by Nginx)
  http.createServer(server).listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Node.js server running at http://localhost:${PORT}`);
    console.log('> Mode: Nginx proxy (SSL handled by Nginx)');
    console.log('> Reading client certificates from Nginx headers');
    console.log('');
      console.log('📌 Make sure that:');
  console.log(`   1. Nginx is running on port 443 (HTTPS)`);
  console.log(`   2. Nginx forwards requests to http://localhost:${PORT}`);
  console.log(`   3. Nginx has SSL client certificates properly configured`);
  console.log('');
  console.log('🚀 Access the application at: https://localhost');
  });
}); 