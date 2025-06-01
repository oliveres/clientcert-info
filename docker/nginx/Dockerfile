FROM nginx:alpine

# Install required packages
RUN apk add --no-cache \
    ca-certificates \
    curl \
    openssl \
    gettext \
    certbot \
    certbot-nginx \
    dcron

# Update system CA certificates
RUN update-ca-certificates

# Create symlink for compatibility
RUN ln -sf /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-bundle.crt

# Create directories
RUN mkdir -p /etc/nginx/snippets /etc/nginx/certs /var/www/certbot

# Copy files
COPY snippets/ /etc/nginx/snippets/
COPY default-certs/ /etc/nginx/default-certs/
COPY docker-entrypoint.sh /docker-entrypoint.sh
COPY nginx-prod.conf /etc/nginx/conf.d/nginx-prod.conf

# Set permissions
RUN chmod +x /docker-entrypoint.sh

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"] 