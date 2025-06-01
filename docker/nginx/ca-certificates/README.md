# CA Certificates for Validation

This directory contains CA certificates used for asynchronous validation of client certificates.

## Adding a New CA Certificate

1. **Obtain CA certificate in PEM format**
   - Must start with `-----BEGIN CERTIFICATE-----`
   - Must end with `-----END CERTIFICATE-----`

2. **Save certificate to this directory**
   ```bash
   # Example for PostSignum CA
   wget -O postsignum-ca.pem "https://example.com/path/to/ca.pem"
   ```

3. **Add mapping to server-nginx.js**
   ```javascript
   const CA_MAPPING = {
     'PostSignum Public CA 4': 'postsignum-ca.pem',
     // Add new line here
   };
   ```

## Example of Correct CA Certificate Format

```
-----BEGIN CERTIFICATE-----
MIIFgTCCA2mgAwIBAgIIcvGLaW+ER2QwDQYJKoZIhvcNAQELBQAwfTELMAkGA1UE
... (base64 encoded certificate data) ...
hvcNAQELBQADggIBADdJnL3N0KtmLLJb7b6pYvsAfpFhNBQxL8SaHVwrJ5Y7mqLX
-----END CERTIFICATE-----
```

## Certificate Verification

After adding, you can verify that the certificate is in the correct format:

```bash
openssl x509 -in certificate-name.pem -text -noout
```

## Supported CAs

The application currently supports these CAs (add certificates as needed):

- PostSignum Public CA 4
- PostSignum Root QCA 4
- DigiCert Global Root CA
- Let's Encrypt ISRG Root X1
- GlobalSign Root CA
- And others... 