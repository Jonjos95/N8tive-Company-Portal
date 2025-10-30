# EC2 Deployment Guide

## Quick Start

### 1. Prerequisites
- EC2 instance running (Ubuntu recommended)
- Elastic IP assigned to your instance
- Security group allows: 80, 443, 22
- SSH access configured

### 2. Initial Server Setup (First Time Only)

SSH into your EC2 instance:
```bash
ssh ubuntu@YOUR_EC2_IP
```

Install Nginx:
```bash
sudo apt update
sudo apt install -y nginx
```

### 3. Deploy

From your local machine (in this project directory):

```bash
# Make script executable
chmod +x deploy-to-ec2.sh

# Deploy (replace with your EC2 IP)
./deploy-to-ec2.sh YOUR_EC2_IP ubuntu
```

### 4. Configure DNS (GoDaddy)

1. Log into GoDaddy DNS Management
2. Add/Update these records:
   - **A Record**: Name = `@`, Value = `YOUR_EC2_IP`, TTL = 600
   - **A Record** (or CNAME): Name = `www`, Value = `YOUR_EC2_IP` (or `yourdomain.com`), TTL = 600

Wait 5-15 minutes for DNS propagation, then test: `http://YOUR_EC2_IP`

### 5. Set Up HTTPS (Let's Encrypt)

SSH into your EC2:
```bash
ssh ubuntu@YOUR_EC2_IP
```

Install Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
```

Get SSL certificate:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com --redirect --agree-tos -m your-email@example.com
```

Certbot will:
- Auto-configure Nginx for HTTPS
- Set up auto-renewal
- Redirect HTTP → HTTPS

### 6. Update DNS Again

Update GoDaddy DNS records (same IP, HTTPS will work once cert is issued):
- The A records stay the same, but your site will now use HTTPS

### 7. Future Deployments

Just run the deploy script again:
```bash
./deploy-to-ec2.sh YOUR_EC2_IP ubuntu
```

## Troubleshooting

**Can't connect via SSH?**
- Check security group allows port 22
- Verify you have the correct key (.pem file)

**Site not loading?**
- Check Nginx status: `sudo systemctl status nginx`
- Check Nginx config: `sudo nginx -t`
- View logs: `sudo tail -f /var/log/nginx/error.log`

**Files not updating?**
- Clear browser cache
- Check file permissions: `ls -la /var/www/n8tive`
- Verify files uploaded: `ls -la /var/www/n8tive`

**HTTPS issues?**
- Verify DNS is pointing to your EC2 IP
- Check certbot: `sudo certbot certificates`
- Test renewal: `sudo certbot renew --dry-run`

## Manual File Upload (Alternative)

If the script doesn't work, manually upload:

```bash
# From your local machine
scp -r * ubuntu@YOUR_EC2_IP:/var/www/n8tive/

# Then SSH and reload Nginx
ssh ubuntu@YOUR_EC2_IP
sudo systemctl reload nginx
```

