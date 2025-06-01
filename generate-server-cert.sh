#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 Generating self-signed server certificate for HTTPS${NC}"
echo -e "${GREEN}=================================================${NC}"

# Create certificates directory
mkdir -p certificates

# Generate self-signed certificate for server (combines key and certificate in one command)
echo -e "\n${YELLOW}Generating server certificate...${NC}"
openssl req -x509 -newkey rsa:4096 -keyout certificates/server-key.pem -out certificates/server-cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Test Server/CN=localhost"

echo -e "\n${GREEN}✅ Server certificate successfully created!${NC}"
echo -e "\nCreated files:"
echo -e "  - ${YELLOW}certificates/server-cert.pem${NC} (certificate)"
echo -e "  - ${YELLOW}certificates/server-key.pem${NC} (private key)"
echo -e "\n${YELLOW}⚠️  This certificate is for testing only!${NC}" 