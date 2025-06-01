#!/bin/bash

# Create default certificates directory
mkdir -p default-certs

# Generate private key
openssl genrsa -out default-certs/default.key 2048

# Generate self-signed certificate
openssl req -new -x509 -key default-certs/default.key -out default-certs/default.crt -days 365 -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

echo "Default certificates generated in default-certs/" 