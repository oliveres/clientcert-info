#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 Generating complete certificate set for testing${NC}"
echo -e "${GREEN}=================================================${NC}"

# Create certificates directory
mkdir -p certificates

# 1. Generate CA (Certificate Authority)
echo -e "\n${BLUE}1. Generating Certificate Authority (CA)...${NC}"
openssl genrsa -out certificates/ca-key.pem 4096
openssl req -new -x509 -days 365 -key certificates/ca-key.pem -out certificates/ca-cert.pem \
  -subj "/C=US/ST=State/L=City/O=Test CA/CN=Test Certificate Authority"
echo -e "${GREEN}✓ CA certificate created${NC}"

# 2. Generate Server Certificate signed by CA
echo -e "\n${BLUE}2. Generating server certificate...${NC}"
openssl genrsa -out certificates/server-key.pem 4096
openssl req -new -key certificates/server-key.pem -out certificates/server-csr.pem \
  -subj "/C=US/ST=State/L=City/O=Test Server/CN=localhost"
openssl x509 -req -days 365 -in certificates/server-csr.pem \
  -CA certificates/ca-cert.pem -CAkey certificates/ca-key.pem \
  -CAcreateserial -out certificates/server-cert.pem
rm certificates/server-csr.pem
echo -e "${GREEN}✓ Server certificate created${NC}"

# 3. Generate Client Certificate signed by CA
echo -e "\n${BLUE}3. Generating client certificate (valid)...${NC}"
openssl genrsa -out certificates/client-key.pem 4096
openssl req -new -key certificates/client-key.pem -out certificates/client-csr.pem \
  -subj "/C=US/ST=State/L=City/O=Test Client/CN=Test User/emailAddress=test@example.com"
openssl x509 -req -days 365 -in certificates/client-csr.pem \
  -CA certificates/ca-cert.pem -CAkey certificates/ca-key.pem \
  -CAcreateserial -out certificates/client-cert.pem
rm certificates/client-csr.pem

# Export to PKCS12 for browser import
openssl pkcs12 -export -out certificates/client-valid.p12 \
  -inkey certificates/client-key.pem -in certificates/client-cert.pem \
  -certfile certificates/ca-cert.pem -passout pass:test123
echo -e "${GREEN}✓ Valid client certificate created${NC}"

# 4. Generate Self-Signed Client Certificate (invalid)
echo -e "\n${BLUE}4. Generating self-signed client certificate (invalid)...${NC}"
openssl req -x509 -newkey rsa:4096 -keyout certificates/client-invalid-key.pem \
  -out certificates/client-invalid-cert.pem -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=Invalid Client/CN=Invalid User/emailAddress=invalid@example.com"

# Export to PKCS12 for browser import
openssl pkcs12 -export -out certificates/client-invalid.p12 \
  -inkey certificates/client-invalid-key.pem -in certificates/client-invalid-cert.pem \
  -passout pass:test123
echo -e "${GREEN}✓ Invalid (self-signed) client certificate created${NC}"

# Clean up
rm -f certificates/*.srl

# Summary
echo -e "\n${GREEN}=================================================${NC}"
echo -e "${GREEN}✅ All certificates have been generated!${NC}"
echo -e "${GREEN}=================================================${NC}"
echo -e "\n${YELLOW}Created files:${NC}"
echo -e "  ${BLUE}CA Certificate:${NC}"
echo -e "    - certificates/ca-cert.pem"
echo -e "  ${BLUE}Server Certificate:${NC}"
echo -e "    - certificates/server-cert.pem"
echo -e "    - certificates/server-key.pem"
echo -e "  ${BLUE}Valid Client Certificate:${NC}"
echo -e "    - certificates/client-valid.p12 (password: test123)"
echo -e "  ${BLUE}Invalid Client Certificate:${NC}"
echo -e "    - certificates/client-invalid.p12 (password: test123)"

echo -e "\n${YELLOW}To enable certificate validation:${NC}"
echo -e "1. Edit server.js and uncomment the 'ca' line in httpsOptions"
echo -e "2. Import client-valid.p12 to test with a valid certificate"
echo -e "3. Import client-invalid.p12 to test with an invalid certificate"

echo -e "\n${YELLOW}⚠️  These certificates are for testing only!${NC}" 