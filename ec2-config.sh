#!/bin/bash
# EC2 Deployment Configuration
# This file stores your EC2 deployment settings
# Edit this file with your EC2 details

# EC2 Host (IP address or domain name)
export EC2_HOST=""

# SSH User (usually 'ubuntu' for Ubuntu instances, 'ec2-user' for Amazon Linux)
export EC2_USER="ubuntu"

# SSH Key Path (optional - leave empty if using password auth or default SSH key)
export EC2_KEY_PATH=""

# Remote deployment directory
export EC2_DEPLOY_DIR="/var/www/n8tive"

# Example configuration:
# export EC2_HOST="n8tiveio.app"
# export EC2_USER="ubuntu"
# export EC2_KEY_PATH="$HOME/.ssh/n8tive-key.pem"

