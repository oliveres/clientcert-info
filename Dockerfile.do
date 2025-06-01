# Simple Dockerfile for Digital Ocean App Platform
FROM node:18-alpine

WORKDIR /app

# Install OpenSSL for certificate validation
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build Next.js application
RUN npm run build

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "server-nginx.js"] 