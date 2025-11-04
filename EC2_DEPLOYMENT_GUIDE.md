# EC2 Universal Deployment Setup

## ✅ What's Been Set Up

You now have a **universal EC2 deployment system** that works from anywhere on your machine, similar to AWS CLI.

## 📁 Files Created

1. **`ec2-config.sh`** - Local project configuration (optional)
2. **`~/.n8tive-ec2-config`** - Global configuration (works from anywhere)
3. **`setup-ec2-config.sh`** - Interactive setup script
4. **`deploy-to-ec2.sh`** - Updated deployment script (uses config automatically)

## 🚀 Quick Start

### Step 1: Configure EC2 Settings

Run the setup script:
```bash
./setup-ec2-config.sh
```

Or manually edit the global config:
```bash
nano ~/.n8tive-ec2-config
```

Enter your:
- **EC2 Host**: Your EC2 IP or domain (e.g., `n8tiveio.app` or `54.123.45.67`)
- **SSH User**: Usually `ubuntu` or `ec2-user`
- **SSH Key Path**: Path to your `.pem` file (optional)
- **Deployment Directory**: Default is `/var/www/n8tive`

### Step 2: Deploy

From **any directory** in your project:
```bash
./deploy-to-ec2.sh
```

Or override config with command line:
```bash
./deploy-to-ec2.sh n8tiveio.app ubuntu ~/.ssh/my-key.pem
```

## 🔧 Configuration Priority

The script uses settings in this order:
1. **Command line arguments** (highest priority)
2. **Local `ec2-config.sh`** (project-specific)
3. **`~/.n8tive-ec2-config`** (global, universal)

## ✨ Universal Access

Once configured, you can deploy from:
- ✅ Any directory in your project
- ✅ Any terminal window
- ✅ Any project folder
- ✅ Works just like AWS CLI - configuration is global

## 📝 Example Global Config

```bash
# ~/.n8tive-ec2-config
export EC2_HOST="n8tiveio.app"
export EC2_USER="ubuntu"
export EC2_KEY_PATH="$HOME/.ssh/n8tive-key.pem"
export EC2_DEPLOY_DIR="/var/www/n8tive"
```

## 🎯 What Gets Deployed

- All HTML files (including `team.html`)
- Updated `navbar.js` with Team link
- CSS, JavaScript, assets
- Components directory

## 🔒 Security

The global config file (`~/.n8tive-ec2-config`) is set to `600` permissions (read/write for owner only).

## 📚 Next Steps

1. Run `./setup-ec2-config.sh` to configure
2. Run `./deploy-to-ec2.sh` to deploy
3. Visit your site - the Team tab should now appear!

