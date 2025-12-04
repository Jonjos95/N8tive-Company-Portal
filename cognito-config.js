// AWS Cognito Configuration for n8tive.io
// 
// IMPORTANT: Replace these placeholder values with your actual AWS Cognito configuration
// See COGNITO_SETUP.md for detailed setup instructions

const CognitoConfig = {
    // AWS Region where your Cognito User Pool is located
    region: 'us-east-1',
    
    // Cognito User Pool ID (found in AWS Console > Cognito > User Pools > Your Pool)
    userPoolId: 'us-east-1_E1Ckf1qiH',
    
    // Cognito App Client ID (found in User Pool > App Integration > App Clients)
    clientId: '5ba94tcr4rv5q1a0rafm73qldo',
    
    // Cognito Hosted UI Domain (found in User Pool > App Integration > Domain)
    // Using custom domain: auth.n8tiveio.app
    oauthDomain: 'auth.n8tiveio.app',
    
    // OAuth Scopes - what information to request from the identity provider
    oauthScopes: ['openid', 'email', 'profile'],
    
    // Redirect URI - where users are sent after authentication
    // This should match the callback URL configured in your Cognito User Pool
    // CRITICAL: Use server-side handler to avoid Safari download issues
    // Server returns proper HTML instead of redirect, preventing Safari download detection
    redirectUri: (window.location.protocol + '//' + window.location.host + '/api/oauth/callback')
};

// Note: If CognitoConfig is not properly configured, the app will fall back to mock authentication
// This allows development to continue while Cognito is being set up
