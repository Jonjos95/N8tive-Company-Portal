#!/bin/bash
# Setup script for waitlist API backend on EC2

set -e

BACKEND_DIR="/var/www/n8tive/backend"
VENV_DIR="$BACKEND_DIR/venv"

echo "🔧 Setting up waitlist API backend..."

# Create virtual environment
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Install dependencies
echo "📥 Installing Python dependencies..."
pip install --upgrade pip
pip install -r "$BACKEND_DIR/requirements.txt"

# Initialize database
echo "🗄️  Initializing database..."
python3 "$BACKEND_DIR/waitlist_api.py" &
sleep 2
pkill -f waitlist_api.py || true

# Set up systemd service
echo "⚙️  Setting up systemd service..."
sudo cp "$BACKEND_DIR/waitlist.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable waitlist.service
sudo systemctl restart waitlist.service

echo "✅ Backend setup complete!"
echo "📊 Check status with: sudo systemctl status waitlist"
echo "📋 View logs with: sudo journalctl -u waitlist -f"
