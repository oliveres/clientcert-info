# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build Next.js application
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app

# Copy built application
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/app ./app
COPY --from=builder /app/server-nginx.js ./
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/tailwind.config.js ./
COPY --from=builder /app/postcss.config.js ./
COPY --from=builder /app/next-env.d.ts ./
COPY --from=builder /app/docker/nginx/ca-certificates ./docker/nginx/ca-certificates

# Install only production dependencies
RUN npm ci --only=production

# Install OpenSSL for certificate validation
RUN apk add --no-cache openssl

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "server-nginx.js"] 