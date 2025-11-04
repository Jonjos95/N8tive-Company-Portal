# n8tive.io Company Portal

A modern software studio portal showcasing our products and services.

## Features

- **Modern UI** - Dark theme with animated backgrounds
- **Responsive Design** - Works on all devices
- **Waitlist System** - Collect user interest with backend API
- **Automated Deployment** - GitHub Actions deployment to EC2

## Project Structure

```
├── index.html          # Homepage
├── products.html       # Services page
├── pricing.html        # Pricing information
├── login.html          # Authentication page
├── team.html           # Team page
├── style.css           # Main stylesheet
├── script.js           # Main JavaScript
├── auth.js             # Authentication handler
├── components/         # Web components (navbar, footer)
├── assets/             # Images and static assets
├── backend/            # Flask API for waitlist
└── .github/workflows/  # CI/CD automation
```

## Quick Start

The site is automatically deployed to EC2 via GitHub Actions when you push to `main`.

### Manual Deployment

```bash
./deploy-to-ec2.sh EC2_IP EC2_USER /path/to/key.pem
```

## Backend API

The waitlist API runs on Flask and uses SQLite:

- **POST** `/api/waitlist` - Submit waitlist entry
- **GET** `/api/waitlist` - Retrieve all entries (admin)

Database location: `/var/www/n8tive/backend/waitlist.db`

## Development

1. Clone the repository
2. Open `index.html` in a browser (or use a local server)
3. For backend development, see `backend/` directory

## Configuration

- AWS deployment: Configured via GitHub Actions secrets
- EC2 deployment: Uses `deploy-to-ec2.sh` script
- Backend service: Managed via systemd (`waitlist.service`)

## License

Copyright © 2024 n8tive.io
