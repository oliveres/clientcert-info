# Manual Certificate Validation

## Overview

The application now supports manual validation of client certificates using user-uploaded CA certificates. This solution is more flexible than the previous automatic validation and allows verification of certificates from any CA.

## How It Works

### 1. Certificate Loading
- Nginx accepts the client certificate (without validation)
- The application displays certificate information

### 2. CA Certificate Upload
- User uploads one or more CA certificates (intermediate and/or root)
- Supported formats: `.pem`, `.crt`, `.cer`
- You can upload multiple files at once

### 3. Manual Validation
- Clicking the "Verify Certificate" button starts validation
- OpenSSL verifies whether the client certificate was issued by any of the uploaded CAs
- Results are displayed immediately

## Usage

1. **Open the application** at https://localhost
2. **Select a client certificate** when prompted by the browser
3. **Upload CA certificates**:
   - Click on "Choose Files"
   - Select CA certificates (intermediate and/or root)
   - You can select multiple files at once
4. **Click "Verify Certificate"**
5. **Results are displayed**:
   - ✅ Green - certificate was successfully verified
   - ❌ Red - certificate was not verified (with error details)

## Example Certificate Structure

```
Your client certificate
    ↓ (issued by)
Intermediate CA (upload this)
    ↓ (issued by)
Root CA (and/or this)
```

## Advantages of This Approach

1. **Universal** - works with any CA
2. **Flexible** - user determines which CAs to trust
3. **Transparent** - you see exactly what is being validated
4. **No limitations** - not limited by the number of CA certificates

## Technical Details

- Validation uses OpenSSL command: `openssl verify -CAfile <ca-bundle> <certificate>`
- CA certificates are combined into one bundle file
- All operations occur on the server, files are immediately deleted

## Troubleshooting

### "Certificate could not be verified"
- Make sure you uploaded the correct CA certificates
- You may need to upload the complete chain (intermediate + root)
- Check that CA certificates are in PEM format

### "unable to get issuer certificate"
- Missing intermediate or root certificate
- Upload all certificates in the trust chain

### Where to find CA certificates?
- On the certificate authority's website
- In documentation from the certificate issuer
- Using: `openssl s_client -showcerts -connect server:443` 