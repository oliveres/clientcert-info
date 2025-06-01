#!/bin/sh
set -e

echo "Starting Client SSL certificate test application Nginx..."

# Get domain name from environment variable
DOMAIN_NAME=${DOMAIN_NAME:-localhost}
echo "Domain: $DOMAIN_NAME"

# Create directories
mkdir -p /etc/nginx/certs
mkdir -p /var/www/certbot

# Function for checking Let's Encrypt certificates
check_letsencrypt_certs() {
    if [ -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ] && \
       [ -f "/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem" ]; then
        return 0
    else
        return 1
    fi
}

# Certificate setup
if [ "$DOMAIN_NAME" = "localhost" ]; then
    echo "Using localhost configuration..."
    ln -sf /etc/nginx/certs/localhost/server-cert.pem /etc/nginx/certs/cert.pem
    ln -sf /etc/nginx/certs/localhost/server-key.pem /etc/nginx/certs/key.pem
else
    echo "Production mode for domain: $DOMAIN_NAME"
    
    # Check if Let's Encrypt certificates exist
    if check_letsencrypt_certs; then
        echo "Found Let's Encrypt certificates, using them..."
        ln -sf /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem /etc/nginx/certs/cert.pem
        ln -sf /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem /etc/nginx/certs/key.pem
    else
        echo "Let's Encrypt certificates not found, using default certificates..."
        ln -sf /etc/nginx/default-certs/default.crt /etc/nginx/certs/cert.pem
        ln -sf /etc/nginx/default-certs/default.key /etc/nginx/certs/key.pem
        
        # Start process for obtaining Let's Encrypt certificates in background
        (
            sleep 30  # Wait for Nginx to start
            
            echo "Attempting to obtain Let's Encrypt certificate..."
            
            # Obtain certificate using webroot
            if certbot certonly --webroot \
                -w /var/www/certbot \
                --email "${LETSENCRYPT_EMAIL:-admin@$DOMAIN_NAME}" \
                --agree-tos \
                --no-eff-email \
                --non-interactive \
                --keep-until-expiring \
                -d "$DOMAIN_NAME"; then
                
                echo "Successfully obtained Let's Encrypt certificate!"
                
                # Switch to new certificates
                ln -sf /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem /etc/nginx/certs/cert.pem
                ln -sf /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem /etc/nginx/certs/key.pem
                
                # Reload Nginx
                nginx -s reload
                echo "Nginx reloaded with new certificates"
            else
                echo "Failed to obtain Let's Encrypt certificate"
            fi
        ) &
    fi
fi

# Generate Nginx configuration with replaced variables
envsubst '${DOMAIN_NAME}' < /etc/nginx/conf.d/nginx-prod.conf > /etc/nginx/conf.d/default.conf

# Start cron for automatic renewal (every 12 hours)
echo "0 */12 * * * certbot renew --quiet --deploy-hook 'nginx -s reload'" | crontab -
crond

# Start Nginx in foreground
exec nginx -g 'daemon off;' 