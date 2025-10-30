# DNS Setup for n8tiveio.app

## GoDaddy DNS Configuration

### Step 1: Point DNS to EC2
Log into GoDaddy DNS Management for **n8tiveio.app** and add/update these records:

#### A Records:
- **Name**: `@` (or leave blank for root domain)
- **Type**: `A`
- **Value**: `54.158.1.37`
- **TTL**: `600` (10 minutes)

- **Name**: `www`
- **Type**: `A`
- **Value**: `54.158.1.37`
- **TTL**: `600`

**OR** you can use CNAME for www:
- **Name**: `www`
- **Type**: `CNAME`
- **Value**: `n8tiveio.app`
- **TTL**: `600`

### Step 2: Wait for DNS Propagation
- DNS changes can take 5-15 minutes to propagate
- Check propagation: https://dnschecker.org/#A/n8tiveio.app
- Once DNS shows your EC2 IP, proceed to HTTPS setup

### Step 3: Set Up HTTPS (SSL Certificate)

Once DNS is pointing to your server, SSH in and install SSL:

```bash
ssh -i /Users/jon/dev/n8tiveio-backend-key.pem ec2-user@54.158.1.37

# Install certbot
sudo dnf install -y certbot python3-certbot-nginx

# Get SSL certificate (replace email with your actual email)
sudo certbot --nginx -d n8tiveio.app -d www.n8tiveio.app --redirect --agree-tos -m your-email@example.com
```

Certbot will:
- ✅ Request certificate from Let's Encrypt
- ✅ Configure Nginx for HTTPS
- ✅ Set up auto-renewal
- ✅ Redirect HTTP → HTTPS

### Step 4: Test Your Site
- HTTP: http://n8tiveio.app
- HTTPS: https://n8tiveio.app (after SSL setup)
- HTTPS: https://www.n8tiveio.app (after SSL setup)

## Important: Elastic IP Recommendation

⚠️ **Your current IP (54.158.1.37) may change if the instance restarts.**

To prevent this:
1. Go to EC2 Console → Elastic IPs
2. Click "Allocate Elastic IP address"
3. Select your instance → Actions → Networking → Associate Elastic IP address
4. Update GoDaddy DNS with the new Elastic IP

## Troubleshooting

**DNS not resolving?**
- Wait 10-15 minutes for propagation
- Check: `dig n8tiveio.app` or `nslookup n8tiveio.app`
- Verify GoDaddy DNS records are correct

**Can't get SSL certificate?**
- Ensure DNS is fully propagated
- Verify port 80 is open (for Let's Encrypt validation)
- Check: `sudo certbot certificates`

**Site not loading?**
- Verify Nginx is running: `sudo systemctl status nginx`
- Check logs: `sudo tail -f /var/log/nginx/error.log`
- Test: `curl http://n8tiveio.app`

