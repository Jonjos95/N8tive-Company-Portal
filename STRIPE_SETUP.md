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

On your EC2 server, set these environment variables:

```bash
export STRIPE_SECRET_KEY="sk_live_your_secret_key"  # Or sk_test_ for testing
export STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
export STRIPE_PRO_PRICE_ID="price_xxxxx"
export STRIPE_BUSINESS_PRICE_ID="price_xxxxx"
export STRIPE_ENTERPRISE_PRICE_ID="price_xxxxx"
```

Or add them to your systemd service file at `/etc/systemd/system/waitlist.service`:

```ini
[Service]
Environment="STRIPE_SECRET_KEY=sk_live_your_key"
Environment="STRIPE_WEBHOOK_SECRET=whsec_your_secret"
Environment="STRIPE_PRO_PRICE_ID=price_xxxxx"
Environment="STRIPE_BUSINESS_PRICE_ID=price_xxxxx"
Environment="STRIPE_ENTERPRISE_PRICE_ID=price_xxxxx"
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
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Signing secret** (starts with `whsec_...`)
6. Add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

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

