#!/bin/bash
# Start script for waitlist API server

cd "$(dirname "$0")"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Start the Flask server
python3 waitlist_api.py
