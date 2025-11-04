#!/bin/bash
# Setup script to create a global EC2 configuration
# This creates ~/.n8tive-ec2-config for universal EC2 deployment access

CONFIG_FILE="$HOME/.n8tive-ec2-config"

echo "🔧 Setting up universal EC2 deployment configuration..."
echo ""

# Check if config already exists
if [ -f "$CONFIG_FILE" ]; then
    echo "⚠️  Configuration file already exists: $CONFIG_FILE"
    read -p "Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
fi

# Prompt for configuration
echo "Enter your EC2 deployment details:"
echo ""

read -p "EC2 Host (IP or domain, e.g., n8tiveio.app): " EC2_HOST
read -p "SSH User [ubuntu]: " EC2_USER
EC2_USER="${EC2_USER:-ubuntu}"

read -p "SSH Key Path (optional, press Enter to skip): " EC2_KEY_PATH
read -p "Deployment Directory [/var/www/n8tive]: " DEPLOY_DIR
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/n8tive}"

# Create config file
cat > "$CONFIG_FILE" << EOF
# N8tive EC2 Deployment Configuration
# Created: $(date)
# This file is automatically loaded by deploy-to-ec2.sh

export EC2_HOST="$EC2_HOST"
export EC2_USER="$EC2_USER"
export EC2_KEY_PATH="$EC2_KEY_PATH"
export EC2_DEPLOY_DIR="$DEPLOY_DIR"
EOF

chmod 600 "$CONFIG_FILE"

echo ""
echo "✅ Configuration saved to: $CONFIG_FILE"
echo ""
echo "📋 Configuration:"
echo "   Host: $EC2_HOST"
echo "   User: $EC2_USER"
echo "   Key: ${EC2_KEY_PATH:-<none>}"
echo "   Directory: $DEPLOY_DIR"
echo ""
echo "🚀 You can now deploy from anywhere using:"
echo "   ./deploy-to-ec2.sh"
echo ""

