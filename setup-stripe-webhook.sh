#!/bin/bash
# Script to configure Stripe webhook secret on EC2

EC2_HOST="${1:-54.158.1.37}"
EC2_USER="${2:-ec2-user}"
PEM_PATH="${3:-$HOME/.ssh/n8tiveio-backend-key.pem}"

if [ -z "$4" ]; then
    echo "Usage: ./setup-stripe-webhook.sh [EC2_HOST] [EC2_USER] [PEM_PATH] [WEBHOOK_SECRET]"
    echo ""
    echo "Example:"
    echo "  ./setup-stripe-webhook.sh 54.158.1.37 ec2-user ~/.ssh/key.pem whsec_xxxxx"
    echo ""
    echo "To get your webhook secret:"
    echo "  1. Go to Stripe Dashboard → Developers → Webhooks"
    echo "  2. Create endpoint: https://yourdomain.com/api/subscription/webhook"
    echo "  3. Select events: checkout.session.completed, customer.subscription.*"
    echo "  4. Copy the signing secret (starts with whsec_)"
    exit 1
fi

WEBHOOK_SECRET="$4"

echo "🔧 Configuring Stripe webhook secret on EC2..."
echo "📡 Target: $EC2_USER@$EC2_HOST"
echo ""

# Update the service file
ssh -i "$PEM_PATH" $EC2_USER@$EC2_HOST << EOF
    sudo sed -i "s|STRIPE_WEBHOOK_SECRET=.*|STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET|" /etc/systemd/system/waitlist.service
    sudo systemctl daemon-reload
    sudo systemctl restart waitlist
    echo "✅ Webhook secret configured"
    echo "📊 Service status:"
    sudo systemctl status waitlist --no-pager | head -10
EOF

echo ""
echo "✅ Webhook configuration complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Test a subscription from your pricing page"
echo "  2. Check Stripe Dashboard → Webhooks → Your endpoint → Recent events"
echo "  3. Verify subscriptions are being saved to database"

