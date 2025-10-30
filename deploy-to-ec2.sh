#!/bin/bash
# Deployment script for N8tive Company Portal to EC2
# Usage: ./deploy-to-ec2.sh [EC2_IP_OR_DOMAIN] [SSH_USER] [PEM_PATH]

set -e

EC2_HOST="${1:-}"
SSH_USER="${2:-ubuntu}"
PEM_PATH="${3:-}"

if [ -z "$EC2_HOST" ]; then
    echo "❌ Error: EC2 host required"
    echo "Usage: ./deploy-to-ec2.sh [EC2_IP_OR_DOMAIN] [SSH_USER]"
    echo "Example: ./deploy-to-ec2.sh 54.123.45.67 ubuntu"
    exit 1
fi

echo "🚀 Deploying N8tive Company Portal to EC2..."
echo "📡 Target: $SSH_USER@$EC2_HOST"
if [ -n "$PEM_PATH" ]; then
  echo "🔑 Using key: $PEM_PATH"
fi

# Files to deploy (excluding deployment files)
FILES_TO_DEPLOY=(
    "index.html"
    "style.css"
    "script.js"
    "auth.js"
    "login.html"
    "pricing.html"
    "products.html"
    "components/"
    "assets/"
    "analytics-demo.html"
    "automation-demo.html"
)

echo "📦 Preparing files for deployment..."

# Create temp directory
TEMP_DIR=$(mktemp -d)
DEPLOY_DIR="$TEMP_DIR/n8tive-portal"

mkdir -p "$DEPLOY_DIR"

# Copy files
for item in "${FILES_TO_DEPLOY[@]}"; do
    if [ -e "$item" ]; then
        echo "  ✓ Copying $item"
        cp -r "$item" "$DEPLOY_DIR/"
    else
        echo "  ⚠ Warning: $item not found, skipping"
    fi
done

echo ""
echo "📤 Uploading to EC2..."

# Create remote directory
SSH_CMD=(ssh)
SCP_CMD=(scp)
if [ -n "$PEM_PATH" ]; then
  chmod 600 "$PEM_PATH" 2>/dev/null || true
  SSH_CMD+=( -i "$PEM_PATH" )
  SCP_CMD+=( -i "$PEM_PATH" )
fi

"${SSH_CMD[@]}" "$SSH_USER@$EC2_HOST" "sudo mkdir -p /var/www/n8tive && sudo chown -R \$USER:\$USER /var/www/n8tive"

# Upload files
"${SCP_CMD[@]}" -r "$DEPLOY_DIR"/* "$SSH_USER@$EC2_HOST:/var/www/n8tive/"

echo ""
echo "🔧 Configuring Nginx..."

# Nginx config
"${SSH_CMD[@]}" "$SSH_USER@$EC2_HOST" << 'EOF'
sudo tee /etc/nginx/sites-available/n8tive > /dev/null << 'NGINX'
server {
    listen 80;
    server_name _;

    root /var/www/n8tive;
    index index.html;

    # Single Page App routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static asset caching
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        try_files $uri =404;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
NGINX

# Enable site
sudo ln -sf /etc/nginx/sites-available/n8tive /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Nginx configured successfully"
EOF

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Point your GoDaddy DNS to: $EC2_HOST"
echo "  2. Set up HTTPS with: sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com"
echo "  3. Visit: http://$EC2_HOST"
echo ""

