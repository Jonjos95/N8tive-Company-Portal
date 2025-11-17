// AWS Cognito Configuration for n8tive.io
// 
// IMPORTANT: Replace these placeholder values with your actual AWS Cognito configuration
// See COGNITO_SETUP.md for detailed setup instructions

const CognitoConfig = {
    // AWS Region where your Cognito User Pool is located
    region: 'us-east-1', // e.g., 'us-east-1', 'us-west-2', 'eu-west-1'
    
    // Cognito User Pool ID (found in AWS Console > Cognito > User Pools > Your Pool)
    userPoolId: 'YOUR_USER_POOL_ID', // e.g., 'us-east-1_XXXXXXXXX'
    
    // Cognito App Client ID (found in User Pool > App Integration > App Clients)
    clientId: 'YOUR_APP_CLIENT_ID', // e.g., '1a2b3c4d5e6f7g8h9i0j'
    
    // Cognito Hosted UI Domain (found in User Pool > App Integration > Domain)
    // Format: https://YOUR_DOMAIN.auth.REGION.amazoncognito.com
    oauthDomain: 'YOUR_DOMAIN.auth.us-east-1.amazoncognito.com', // e.g., 'n8tive.auth.us-east-1.amazoncognito.com'
    
    // OAuth Scopes - what information to request from the identity provider
    oauthScopes: ['openid', 'email', 'profile'],
    
    // Redirect URI - where users are sent after authentication
    // This should match the callback URL configured in your Cognito User Pool
    redirectUri: window.location.origin + '/login.html' // e.g., 'https://n8tive.io/login.html'
};

// Note: If CognitoConfig is not properly configured, the app will fall back to mock authentication
// This allows development to continue while Cognito is being set up
