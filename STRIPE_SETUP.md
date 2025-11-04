# Stripe Subscription Setup Guide

This guide will help you set up Stripe for subscription payments on n8tive.io.

## Prerequisites

1. Stripe account (sign up at https://stripe.com)
2. Access to your EC2 server
3. Environment variables configured

## Step 1: Create Stripe Products and Prices

1. Go to Stripe Dashboard → **Products**
2. Create 4 products matching your plans:
   - **Pro** - $9.99/month
   - **Business** - $29.99/month  
   - **Enterprise** - $99.99/month

3. For each product, create a **Price**:
   - Billing period: Monthly
   - Recurring: Yes
   - Copy the **Price ID** (starts with `price_...`)

## Step 2: Configure Environment Variables

✅ **Already Configured:**
- Price IDs: Pro, Business, Enterprise (already set in code)
- Secret Key: Configured on EC2 (not in git for security)
- Publishable Key: Added to pricing.html

**Still Need to Configure:**
- Webhook Secret: See Step 4 below

The environment variables are set in `/etc/systemd/system/waitlist.service` on your EC2 server:
```ini
[Service]
Environment="STRIPE_SECRET_KEY=sk_live_..."  # Already configured
Environment="STRIPE_WEBHOOK_SECRET=whsec_..."  # Need to add this
Environment="STRIPE_PRO_PRICE_ID=price_1SPlRyBTJt2ybYLKPxnE2bKY"
Environment="STRIPE_BUSINESS_PRICE_ID=price_1SPlSrBTJt2ybYLKzrlEToNK"
Environment="STRIPE_ENTERPRISE_PRICE_ID=price_1SPlTXBTJt2ybYLKlMMyEwdb"
```

## Step 3: Configure Stripe Publishable Key

Update `pricing.html` line 313 with your Stripe publishable key:

```javascript
const STRIPE_PUBLISHABLE_KEY = 'pk_live_your_publishable_key'; // Or pk_test_ for testing
```

## Step 4: Set Up Stripe Webhook

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://yourdomain.com/api/subscription/webhook`
   - **Important**: Replace `yourdomain.com` with your actual domain
   - For testing, you can use your EC2 IP address: `https://YOUR_EC2_IP/api/subscription/webhook` (if accessible)
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_...`)

### Configure Webhook Secret on EC2

**Option 1: Use the setup script (recommended)**
```bash
./setup-stripe-webhook.sh YOUR_EC2_IP ec2-user /path/to/key.pem whsec_your_webhook_secret
```

**Option 2: Manual configuration**
```bash
ssh ec2-user@YOUR_EC2_IP
sudo nano /etc/systemd/system/waitlist.service
# Replace: STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
sudo systemctl daemon-reload
sudo systemctl restart waitlist
```

## Step 5: Test the Integration

1. Use Stripe test mode keys first
2. Test card: `4242 4242 4242 4242`
3. Any future expiry date and CVC
4. Go to pricing page and click "Subscribe Now"
5. Complete checkout
6. Check Stripe Dashboard for successful payment

## Troubleshooting

- **Webhook not working**: Check Nginx logs and ensure webhook endpoint is accessible
- **Payment fails**: Verify Stripe keys are correct and account is active
- **Subscription not saving**: Check database and backend logs

## Security Notes

- Never commit Stripe keys to Git
- Use environment variables for all secrets
- Use test mode keys during development
- Switch to live keys only in production

