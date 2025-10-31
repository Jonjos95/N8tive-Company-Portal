#!/bin/bash
# Quick deployment script for Project Manager frontend to EC2
# Usage: ./deploy-project-manager.sh

set -e

EC2_HOST="${EC2_HOST:-YOUR_EC2_IP}"
SSH_USER="${SSH_USER:-ec2-user}"
PEM_PATH="${PEM_PATH:-$HOME/.ssh/your-key.pem}"

if [ "$EC2_HOST" = "YOUR_EC2_IP" ] || [ -z "$EC2_HOST" ]; then
  echo "❌ EC2_HOST is not set. Set EC2_HOST env var or edit this script to your IP/hostname."
  echo "   Example: EC2_HOST=your.ec2.ip ./deploy-project-manager.sh"
  exit 1
fi

echo "🚀 Deploying Project Manager to EC2..."
echo "📡 Target: $SSH_USER@$EC2_HOST"

# Files to deploy from Project Manager repo
FRONTEND_FILES=(
    "index.html"
    "script.js"
    "config.js"
    "style.css"
    "mobile.css"
    "components/"
)

# Check if we're in the Project Manager directory or need to specify path
PROJECT_MANAGER_PATH="${1:-/Users/jon/dev/N8tive-Project-Manager}"

if [ ! -d "$PROJECT_MANAGER_PATH" ]; then
    echo "❌ Error: Project Manager directory not found at $PROJECT_MANAGER_PATH"
    echo "Usage: ./deploy-project-manager.sh [path-to-Project-Manager-repo]"
    exit 1
fi

cd "$PROJECT_MANAGER_PATH"

echo "📦 Preparing files from: $(pwd)"

# Create temp directory
TEMP_DIR=$(mktemp -d)
DEPLOY_DIR="$TEMP_DIR/project-manager"

mkdir -p "$DEPLOY_DIR"

# Copy files
for item in "${FRONTEND_FILES[@]}"; do
    if [ -e "$item" ]; then
        echo "  ✓ Copying $item"
        cp -r "$item" "$DEPLOY_DIR/"
    else
        echo "  ⚠ Warning: $item not found, skipping"
    fi
done

echo ""
echo "📤 Uploading to EC2..."

# Upload files
scp -i "$PEM_PATH" -r "$DEPLOY_DIR"/* "$SSH_USER@$EC2_HOST:/tmp/project-manager-frontend/"

echo ""
echo "🔧 Setting permissions and moving files..."

# Move files to final location and set permissions
ssh -i "$PEM_PATH" "$SSH_USER@$EC2_HOST" << 'REMOTE_SCRIPT'
    sudo rm -rf /var/www/html/Project-Manager/*
    sudo mv /tmp/project-manager-frontend/* /var/www/html/Project-Manager/
    sudo chown -R nginx:nginx /var/www/html/Project-Manager
    sudo chmod -R 755 /var/www/html/Project-Manager
    echo "✅ Files deployed and permissions set"
REMOTE_SCRIPT

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Project Manager deployment complete!"
echo "🌐 Frontend: https://n8tiveio.app/projectmanager"
echo ""
echo "💡 Hard refresh your browser (Ctrl+Shift+R / Cmd+Shift+R) to see changes"

