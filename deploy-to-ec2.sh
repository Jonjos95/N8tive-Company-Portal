#!/bin/bash
# Deployment script for N8tive Company Portal to EC2
# Usage: n8tive-deploy [PROJECT_DIR] [EC2_IP_OR_DOMAIN] [SSH_USER] [PEM_PATH]
# 
# Can be run from anywhere:
#   n8tive-deploy                              # Uses current directory
#   n8tive-deploy /path/to/project             # Specify project directory
#   n8tive-deploy . 54.158.1.37 ec2-user      # Override with args
# 
# Configuration priority:
# 1. Command line arguments (override)
# 2. Local ec2-config.sh file (in project directory)
# 3. ~/.n8tive-ec2-config (global config)

set -e

# Get project directory (first arg or current directory)
PROJECT_DIR="${1:-$PWD}"
# If first arg looks like an IP/domain, treat it as EC2_HOST instead
if [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || [[ "$1" == *.* ]]; then
    PROJECT_DIR="$PWD"
else
    PROJECT_DIR="${1:-$PWD}"
    shift
fi

cd "$PROJECT_DIR" || { echo "❌ Error: Cannot access directory: $PROJECT_DIR"; exit 1; }

# Load config from local file if exists
if [ -f "ec2-config.sh" ]; then
    source ec2-config.sh
fi

# Load config from global location if exists
if [ -f "$HOME/.n8tive-ec2-config" ]; then
    source "$HOME/.n8tive-ec2-config"
fi

# Override with command line arguments (shifted if PROJECT_DIR was provided)
EC2_HOST="${1:-$EC2_HOST}"
SSH_USER="${2:-${EC2_USER:-ubuntu}}"
PEM_PATH="${3:-$EC2_KEY_PATH}"
DEPLOY_DIR="${EC2_DEPLOY_DIR:-/var/www/n8tive}"

if [ -z "$EC2_HOST" ]; then
    echo "❌ Error: EC2 host required"
    echo ""
    echo "Usage: ./deploy-to-ec2.sh [EC2_IP_OR_DOMAIN] [SSH_USER] [PEM_PATH]"
    echo "Example: ./deploy-to-ec2.sh 54.123.45.67 ubuntu"
    echo ""
    echo "Or configure in one of these files:"
    echo "  - Local: ./ec2-config.sh"
    echo "  - Global: ~/.n8tive-ec2-config"
    exit 1
fi

echo "🚀 Deploying N8tive Company Portal to EC2..."
echo "📡 Target: $SSH_USER@$EC2_HOST"
if [ -n "$PEM_PATH" ]; then
  echo "🔑 Using key: $PEM_PATH"
fi

# Files to deploy (excluding deployment files and documentation)
FILES_TO_DEPLOY=(
    "index.html"
    "style.css"
    "script.js"
    "auth.js"
    "login.html"
    "pricing.html"
    "products.html"
    "team.html"
    "components/"
    "assets/"
    "analytics-demo.html"
    "automation-demo.html"
    "cognito-config.js"
    "create-dev-account.js"
    "backend/"
)

# Exclude markdown documentation files
EXCLUDE_PATTERNS=(
    "*.md"
    "COGNITO_SETUP.md"
    "DEV_ACCOUNT_*.md"
    "SSO_*.md"
    "STRIPE_SETUP.md"
    "README.md"
)

echo "📦 Preparing files for deployment..."

# Create temp directory
TEMP_DIR=$(mktemp -d)
DEPLOY_DIR="$TEMP_DIR/n8tive-portal"

mkdir -p "$DEPLOY_DIR"

# Copy files (excluding markdown documentation)
for item in "${FILES_TO_DEPLOY[@]}"; do
    if [ -e "$item" ]; then
        # Skip markdown files
        if [[ "$item" == *.md ]]; then
            echo "  ⊘ Skipping documentation: $item"
            continue
        fi
        
        # For directories, exclude markdown files
        if [ -d "$item" ]; then
            echo "  ✓ Copying $item (excluding .md files)"
            rsync -av --exclude='*.md' "$item" "$DEPLOY_DIR/"
        else
            echo "  ✓ Copying $item"
            cp "$item" "$DEPLOY_DIR/"
        fi
    else
        echo "  ⚠ Warning: $item not found, skipping"
    fi
done

# Explicitly exclude any markdown files that might have been copied
find "$DEPLOY_DIR" -name "*.md" -type f -delete 2>/dev/null || true

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

"${SSH_CMD[@]}" "$SSH_USER@$EC2_HOST" "sudo mkdir -p $DEPLOY_DIR && sudo chown -R \$USER:\$USER $DEPLOY_DIR"

# Upload files
"${SCP_CMD[@]}" -r "$DEPLOY_DIR"/* "$SSH_USER@$EC2_HOST:$DEPLOY_DIR/"

echo ""
echo "🔧 Configuring Nginx..."

# Nginx config
"${SSH_CMD[@]}" "$SSH_USER@$EC2_HOST" << EOF
sudo tee /etc/nginx/sites-available/n8tive > /dev/null << NGINX
server {
    listen 80;
    server_name _;

    root $DEPLOY_DIR;
    index index.html;

    # API proxy for waitlist
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_redirect off;
    }
    
    # Stripe webhook needs raw body (no modification)
    location /api/subscription/webhook {
        proxy_pass http://127.0.0.1:5000/api/subscription/webhook;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Content-Type application/json;
        proxy_pass_request_body on;
        proxy_pass_request_headers on;
        proxy_redirect off;
        client_max_body_size 100k;
    }

    # Single Page App routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Static asset caching
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        try_files \$uri =404;
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

# Setup backend if not already done
if [ -d "$DEPLOY_DIR/backend" ]; then
    echo "🔧 Setting up backend API..."
    cd $DEPLOY_DIR/backend
    chmod +x setup_backend.sh start_server.sh 2>/dev/null || true
    
    # Run setup if requirements.txt exists
    if [ -f "requirements.txt" ]; then
        bash setup_backend.sh || echo "⚠️  Backend setup may need manual intervention"
    fi
fi
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

