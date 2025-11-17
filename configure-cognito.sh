#!/bin/bash
# Interactive Cognito Configuration Helper
# This script helps you configure cognito-config.js with your AWS Cognito values

echo "🔧 AWS Cognito Configuration Helper"
echo "===================================="
echo ""
echo "This script will help you configure cognito-config.js with your AWS Cognito settings."
echo ""

# Check if cognito-config.js exists
if [ ! -f "cognito-config.js" ]; then
    echo "❌ Error: cognito-config.js not found!"
    exit 1
fi

echo "📋 You'll need the following values from AWS Console:"
echo ""
echo "1. User Pool ID (e.g., us-east-1_XXXXXXXXX)"
echo "2. App Client ID (e.g., 1a2b3c4d5e6f7g8h9i0j)"
echo "3. OAuth Domain (e.g., n8tive-auth.auth.us-east-1.amazoncognito.com)"
echo "4. AWS Region (e.g., us-east-1)"
echo ""

read -p "Do you have a Cognito User Pool created? (y/n): " has_pool

if [ "$has_pool" != "y" ] && [ "$has_pool" != "Y" ]; then
    echo ""
    echo "📖 Please follow the setup guide first:"
    echo "   See COGNITO_SETUP.md for step-by-step instructions"
    echo ""
    echo "Once you've created your User Pool, run this script again."
    exit 0
fi

echo ""
echo "Let's collect your Cognito configuration values..."
echo ""

# Get User Pool ID
read -p "Enter your User Pool ID: " user_pool_id
if [ -z "$user_pool_id" ]; then
    echo "❌ User Pool ID is required!"
    exit 1
fi

# Get App Client ID
read -p "Enter your App Client ID: " client_id
if [ -z "$client_id" ]; then
    echo "❌ App Client ID is required!"
    exit 1
fi

# Get OAuth Domain
read -p "Enter your OAuth Domain (without https://): " oauth_domain
if [ -z "$oauth_domain" ]; then
    echo "❌ OAuth Domain is required!"
    exit 1
fi

# Get Region
read -p "Enter your AWS Region [us-east-1]: " region
region=${region:-us-east-1}

# Get redirect URI
read -p "Enter your redirect URI [auto-detect from current URL]: " redirect_uri
if [ -z "$redirect_uri" ]; then
    redirect_uri="window.location.origin + '/login.html'"
else
    redirect_uri="'$redirect_uri'"
fi

echo ""
echo "📝 Updating cognito-config.js..."
echo ""

# Create backup
cp cognito-config.js cognito-config.js.backup

# Update the config file
cat > cognito-config.js << EOF
// AWS Cognito Configuration for n8tive.io
// 
// IMPORTANT: Replace these placeholder values with your actual AWS Cognito configuration
// See COGNITO_SETUP.md for detailed setup instructions

const CognitoConfig = {
    // AWS Region where your Cognito User Pool is located
    region: '$region',
    
    // Cognito User Pool ID (found in AWS Console > Cognito > User Pools > Your Pool)
    userPoolId: '$user_pool_id',
    
    // Cognito App Client ID (found in User Pool > App Integration > App Clients)
    clientId: '$client_id',
    
    // Cognito Hosted UI Domain (found in User Pool > App Integration > Domain)
    // Format: https://YOUR_DOMAIN.auth.REGION.amazoncognito.com
    oauthDomain: '$oauth_domain',
    
    // OAuth Scopes - what information to request from the identity provider
    oauthScopes: ['openid', 'email', 'profile'],
    
    // Redirect URI - where users are sent after authentication
    // This should match the callback URL configured in your Cognito User Pool
    redirectUri: $redirect_uri
};

// Note: If CognitoConfig is not properly configured, the app will fall back to mock authentication
// This allows development to continue while Cognito is being set up
EOF

echo "✅ Configuration updated successfully!"
echo ""
echo "📋 Your configuration:"
echo "   Region: $region"
echo "   User Pool ID: $user_pool_id"
echo "   App Client ID: $client_id"
echo "   OAuth Domain: $oauth_domain"
echo ""
echo "💾 Backup saved to: cognito-config.js.backup"
echo ""
echo "⚠️  Next steps:"
echo "   1. Make sure your Cognito User Pool has:"
echo "      - OAuth settings configured (Authorization code grant)"
echo "      - Callback URLs set (matching your redirect URI)"
echo "      - Google and GitHub identity providers added (optional)"
echo "   2. Test the authentication by refreshing your login page"
echo "   3. Google/GitHub buttons should now work!"
echo ""

