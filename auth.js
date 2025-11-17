// Authentication Handler for n8tive.io

class AuthManager {
    constructor() {
        // Check if AWS Amplify is loaded
        if (typeof Amplify === 'undefined') {
            console.warn('AWS Amplify SDK not loaded. Please include the Amplify script in your HTML.');
        }
        
        this.initializeForms();
        this.initializeTabSwitcher();
        this.initializePasswordToggles();
        this.initializeCognito();
        this.checkAuthCallback();
        this.checkExistingSession();
    }

    // Initialize AWS Cognito
    initializeCognito() {
        if (typeof Amplify === 'undefined' || !CognitoConfig) {
            console.warn('Cognito not configured. Using mock authentication.');
            this.useMockAuth = true;
            return;
        }

        // Check if Cognito is properly configured (not using placeholders)
        const isConfigured = CognitoConfig.userPoolId && 
                            CognitoConfig.userPoolId !== 'YOUR_USER_POOL_ID' &&
                            CognitoConfig.clientId && 
                            CognitoConfig.clientId !== 'YOUR_APP_CLIENT_ID' &&
                            CognitoConfig.oauthDomain && 
                            CognitoConfig.oauthDomain !== 'YOUR_DOMAIN.auth.us-east-1.amazoncognito.com';

        if (!isConfigured) {
            console.warn('Cognito configuration contains placeholders. Using mock authentication.');
            console.warn('Please update cognito-config.js with your actual Cognito settings.');
            this.useMockAuth = true;
            return;
        }

        try {
            // Configure Amplify Auth
            const amplifyConfig = {
                Auth: {
                    region: CognitoConfig.region,
                    userPoolId: CognitoConfig.userPoolId,
                    userPoolWebClientId: CognitoConfig.clientId,
                    oauth: {
                        domain: CognitoConfig.oauthDomain,
                        scope: CognitoConfig.oauthScopes,
                        redirectSignIn: CognitoConfig.redirectUri,
                        redirectSignOut: CognitoConfig.redirectUri,
                        responseType: 'code'
                    }
                }
            };
            
            Amplify.configure(amplifyConfig);
            
            // Store config for later use in federatedSignIn
            this.amplifyConfig = amplifyConfig;

            this.useMockAuth = false;
            console.log('AWS Cognito initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Cognito:', error);
            this.useMockAuth = true;
        }
    }

    // Check if this is an OAuth callback
    checkAuthCallback() {
        if (typeof Amplify === 'undefined' || this.useMockAuth) return;
        
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        
        if (error) {
            // Handle OAuth error
            const errorDescription = urlParams.get('error_description') || 'Authentication failed';
            this.showError('login-error', `Authentication error: ${errorDescription}`);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
        
        if (code) {
            // Handle OAuth callback
            this.handleOAuthCallback();
        }
    }

    // Handle OAuth callback
    async handleOAuthCallback() {
        try {
            // Use Amplify's currentAuthenticatedUser which automatically handles OAuth callback
            // This will exchange the authorization code for tokens
            const user = await Amplify.Auth.currentAuthenticatedUser();
            
            if (user) {
                // Get user attributes
                const userAttributes = await Amplify.Auth.userAttributes(user);
                
                // Extract user data
                const emailAttr = userAttributes.find(attr => attr.Name === 'email');
                const nameAttr = userAttributes.find(attr => attr.Name === 'name');
                const givenNameAttr = userAttributes.find(attr => attr.Name === 'given_name');
                
                const userData = {
                    id: user.username || user.sub || user.userId || user.attributes?.sub,
                    email: emailAttr?.Value || user.email || user.attributes?.email || '',
                    name: nameAttr?.Value || givenNameAttr?.Value || user.name || user.attributes?.name || 'User'
                };
                
                // Get session token
                try {
                    const session = await Amplify.Auth.currentSession();
                    const token = session.getIdToken().getJwtToken();
                    localStorage.setItem('authToken', token);
                } catch (tokenError) {
                    console.warn('Could not retrieve session token:', tokenError);
                }
                
                localStorage.setItem('user', JSON.stringify(userData));
                
                // Sync user to backend database (optional)
                try {
                    await this.syncUserToDatabase(userData);
                } catch (syncError) {
                    console.warn('Failed to sync user to database:', syncError);
                    // Don't block authentication if sync fails
                }
                
                // Clean URL and redirect to home
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // Small delay to ensure state is saved
                setTimeout(() => {
                    window.location.href = '/';
                }, 100);
            }
        } catch (error) {
            console.error('OAuth callback error:', error);
            
            // Try to get more specific error information
            let errorMessage = 'Authentication failed. Please try again.';
            if (error.message) {
                if (error.message.includes('not authenticated')) {
                    errorMessage = 'Authentication session expired. Please try again.';
                } else if (error.message.includes('Network')) {
                    errorMessage = 'Network error. Please check your connection and try again.';
                }
            }
            
            const errorId = document.getElementById('login-error') ? 'login-error' : 'signup-error';
            this.showError(errorId, errorMessage);
            
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    // Initialize form event listeners
    initializeForms() {
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }

        // Social login buttons
        document.querySelectorAll('.social-login').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleSocialLogin(e));
        });
    }

    // Tab switcher between login and signup
    initializeTabSwitcher() {
        const loginTab = document.getElementById('login-tab');
        const signupTab = document.getElementById('signup-tab');
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const subtitle = document.getElementById('auth-subtitle');

        loginTab.addEventListener('click', () => {
            loginTab.classList.add('active');
            signupTab.classList.remove('active');
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
            subtitle.textContent = 'Sign in to your account';
            this.clearErrors();
        });

        signupTab.addEventListener('click', () => {
            signupTab.classList.add('active');
            loginTab.classList.remove('active');
            signupForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
            subtitle.textContent = 'Create your account';
            this.clearErrors();
        });
    }

    // Password visibility toggle
    initializePasswordToggles() {
        document.querySelectorAll('.toggle-password').forEach(button => {
            button.addEventListener('click', (e) => {
                const input = e.currentTarget.previousElementSibling;
                const icon = e.currentTarget.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.setAttribute('data-feather', 'eye-off');
                } else {
                    input.type = 'password';
                    icon.setAttribute('data-feather', 'eye');
                }
                
                feather.replace();
            });
        });
    }

    // Handle login form submission
    async handleLogin(e) {
        e.preventDefault();
        this.clearErrors();

        const form = e.target;
        const email = form.querySelector('#login-email').value;
        const password = form.querySelector('#login-password').value;
        const submitBtn = form.querySelector('.auth-submit');

        // Validate inputs
        if (!this.validateEmail(email)) {
            this.showError('login-error', 'Please enter a valid email address');
            return;
        }

        if (!password || password.length < 8) {
            this.showError('login-error', 'Password must be at least 8 characters');
            return;
        }

        // Show loading state
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Signing in...';
        submitBtn.disabled = true;

        try {
            let result;
            
            if (this.useMockAuth) {
                // Fallback to mock authentication if Cognito is not configured
                result = await this.mockLogin(email, password);
            } else {
                // Use AWS Cognito authentication
                result = await this.signInWithCognito(email, password);
            }
            
            if (result.success) {
                // Store auth token/session
                if (result.token) {
                    localStorage.setItem('authToken', result.token);
                }
                localStorage.setItem('user', JSON.stringify(result.user));
                
                // Sync user to backend database (optional)
                try {
                    await this.syncUserToDatabase(result.user);
                } catch (syncError) {
                    console.warn('Failed to sync user to database:', syncError);
                    // Don't block authentication if sync fails
                }
                
                // Redirect to home page
                window.location.href = '/';
            } else {
                this.showError('login-error', result.message || 'Invalid email or password');
            }
        } catch (error) {
            console.error('Login error:', error);
            const errorMessage = error.message || 'An error occurred. Please try again.';
            this.showError('login-error', this.getCognitoErrorMessage(errorMessage));
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    // Sign in with AWS Cognito
    async signInWithCognito(email, password) {
        try {
            const user = await Amplify.Auth.signIn(email, password);
            
            // Get user attributes
            const userAttributes = await Amplify.Auth.userAttributes(user);
            const userData = {
                id: user.username,
                email: userAttributes.find(attr => attr.Name === 'email')?.Value || email,
                name: userAttributes.find(attr => attr.Name === 'name')?.Value || 
                      userAttributes.find(attr => attr.Name === 'given_name')?.Value || 'User'
            };
            
            // Get session token
            const session = await Amplify.Auth.currentSession();
            const token = session.getIdToken().getJwtToken();
            
            return {
                success: true,
                token: token,
                user: userData
            };
        } catch (error) {
            console.error('Cognito sign in error:', error);
            return {
                success: false,
                message: this.getCognitoErrorMessage(error.message)
            };
        }
    }

    // Handle signup form submission
    async handleSignup(e) {
        e.preventDefault();
        this.clearErrors();

        const form = e.target;
        const name = form.querySelector('#signup-name').value;
        const email = form.querySelector('#signup-email').value;
        const password = form.querySelector('#signup-password').value;
        const confirmPassword = form.querySelector('#signup-confirm-password').value;
        const submitBtn = form.querySelector('.auth-submit');

        // Validate inputs
        if (!name || name.trim().length < 2) {
            this.showError('signup-error', 'Please enter your full name');
            return;
        }

        if (!this.validateEmail(email)) {
            this.showError('signup-error', 'Please enter a valid email address');
            return;
        }

        if (!this.validatePassword(password)) {
            this.showError('signup-error', 'Password must be at least 8 characters and contain letters and numbers');
            return;
        }

        if (password !== confirmPassword) {
            this.showError('signup-error', 'Passwords do not match');
            return;
        }

        // Show loading state
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating account...';
        submitBtn.disabled = true;

        try {
            let result;
            
            if (this.useMockAuth) {
                // Fallback to mock authentication if Cognito is not configured
                result = await this.mockSignup(name, email, password);
            } else {
                // Use AWS Cognito signup
                result = await this.signUpWithCognito(email, password, name);
            }
            
            if (result.success) {
                // Show success message and redirect to login or verification
                if (result.requiresVerification) {
                    alert('Account created successfully! Please check your email to verify your account.');
                } else {
                    alert('Account created successfully!');
                }
                
                // Switch to login tab
                document.getElementById('login-tab').click();
            } else {
                this.showError('signup-error', result.message || 'Failed to create account');
            }
        } catch (error) {
            console.error('Signup error:', error);
            const errorMessage = error.message || 'An error occurred. Please try again.';
            this.showError('signup-error', this.getCognitoErrorMessage(errorMessage));
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    // Sign up with AWS Cognito
    async signUpWithCognito(email, password, name) {
        try {
            const signUpResult = await Amplify.Auth.signUp({
                username: email,
                password: password,
                attributes: {
                    email: email,
                    name: name,
                    given_name: name.split(' ')[0] || name,
                    family_name: name.split(' ').slice(1).join(' ') || ''
                }
            });
            
            return {
                success: true,
                requiresVerification: signUpResult.userConfirmed === false,
                user: {
                    id: signUpResult.userSub,
                    email: email,
                    name: name
                }
            };
        } catch (error) {
            console.error('Cognito signup error:', error);
            return {
                success: false,
                message: this.getCognitoErrorMessage(error.message)
            };
        }
    }

    // Handle social login
    async handleSocialLogin(e) {
        const button = e.currentTarget;
        const provider = button.textContent.trim().toLowerCase();
        
        // Show loading state
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i data-feather="loader" class="w-5 h-5 animate-spin"></i> <span class="text-sm">Connecting...</span>';
        feather.replace();
        
        try {
            if (this.useMockAuth) {
                // Fallback message if Cognito is not configured
                setTimeout(() => {
                    button.disabled = false;
                    button.innerHTML = originalText;
                    feather.replace();
                    
                    // Show a better error message instead of alert
                    const errorId = document.getElementById('login-error') ? 'login-error' : 'signup-error';
                    this.showError(errorId, `${provider.charAt(0).toUpperCase() + provider.slice(1)} authentication requires AWS Cognito configuration. Please configure Cognito or use email/password sign-in.`);
                }, 500);
                return;
            }
            
            // Map provider name to Cognito identity provider
            const providerMap = {
                'google': 'Google',
                'github': 'GitHub'
            };
            
            const cognitoProvider = providerMap[provider];
            
            if (!cognitoProvider) {
                throw new Error(`Unsupported provider: ${provider}`);
            }
            
            // Initiate OAuth flow with AWS Cognito
            // Build the OAuth URL for Cognito Hosted UI
            const authConfig = this.amplifyConfig?.Auth || Amplify.configure()?.Auth;
            
            if (!authConfig || !authConfig.oauth) {
                throw new Error('OAuth configuration not found. Please check your Cognito configuration.');
            }
            
            const redirectUri = encodeURIComponent(authConfig.oauth.redirectSignIn);
            const clientId = authConfig.userPoolWebClientId;
            const domain = authConfig.oauth.domain;
            const scopes = Array.isArray(authConfig.oauth.scope) 
                ? authConfig.oauth.scope.join('+') 
                : authConfig.oauth.scope;
            
            // Build the Cognito Hosted UI URL with identity provider
            const oauthUrl = `https://${domain}/oauth2/authorize?identity_provider=${cognitoProvider}&redirect_uri=${redirectUri}&response_type=CODE&client_id=${clientId}&scope=${scopes}`;
            
            // Redirect to Cognito Hosted UI
            window.location.href = oauthUrl;
            
            // Note: The user will be redirected to the OAuth provider
            // After authentication, they'll be redirected back to the callback URL
            // The checkAuthCallback() method will handle the return
            
        } catch (error) {
            console.error('Social login error:', error);
            button.disabled = false;
            button.innerHTML = originalText;
            feather.replace();
            
            const errorMessage = error.message || 'Failed to initiate authentication';
            const errorId = document.getElementById('login-form')?.querySelector('.error-message')?.id || 
                          document.getElementById('signup-form')?.querySelector('.error-message')?.id || 
                          'login-error';
            this.showError(errorId, `Authentication error: ${errorMessage}`);
        }
    }
    
    // Get user-friendly error messages from Cognito errors
    getCognitoErrorMessage(errorMessage) {
        const errorMap = {
            'UserNotFoundException': 'User does not exist.',
            'NotAuthorizedException': 'Incorrect username or password.',
            'UserNotConfirmedException': 'User account is not confirmed. Please check your email.',
            'PasswordResetRequiredException': 'Password reset is required.',
            'TooManyRequestsException': 'Too many attempts. Please try again later.',
            'LimitExceededException': 'Attempt limit exceeded. Please try again later.',
            'InvalidParameterException': 'Invalid email or password format.',
            'UsernameExistsException': 'An account with this email already exists.',
            'InvalidPasswordException': 'Password does not meet requirements.',
            'CodeMismatchException': 'Invalid verification code.',
            'ExpiredCodeException': 'Verification code has expired.',
            'AliasExistsException': 'An account with this email already exists.'
        };
        
        // Check for exact matches
        for (const [key, value] of Object.entries(errorMap)) {
            if (errorMessage.includes(key)) {
                return value;
            }
        }
        
        // Return original message if no match found
        return errorMessage;
    }

    // Email validation
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Password validation
    validatePassword(password) {
        // At least 8 characters, contains letters and numbers
        const re = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
        return re.test(password);
    }

    // Show error message
    showError(errorId, message) {
        const errorDiv = document.getElementById(errorId);
        const errorText = errorDiv.querySelector('.error-text');
        
        errorText.textContent = message;
        errorDiv.classList.remove('hidden');
        
        // Re-initialize feather icons for the alert icon
        feather.replace();
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 5000);
    }

    // Clear all error messages
    clearErrors() {
        document.querySelectorAll('.error-message').forEach(error => {
            error.classList.add('hidden');
        });
    }

    // Check if user is already authenticated (SSO support)
    async checkExistingSession() {
        // Only check on login page
        if (!window.location.pathname.includes('login.html')) {
            return;
        }

        if (this.useMockAuth) {
            // Check localStorage for mock auth
            const user = localStorage.getItem('user');
            const token = localStorage.getItem('authToken');
            if (user && token) {
                // User is already authenticated, redirect to home
                window.location.href = '/';
            }
            return;
        }

        try {
            // Check if user has a valid Cognito session
            const user = await Amplify.Auth.currentAuthenticatedUser();
            
            if (user) {
                // User is already authenticated, redirect to home
                console.log('User already authenticated, redirecting...');
                window.location.href = '/';
            }
        } catch (error) {
            // User is not authenticated, stay on login page
            console.log('No active session found');
        }
    }

    // Sign out user (SSO support)
    async signOut() {
        try {
            if (this.useMockAuth) {
                // Clear mock auth data
                localStorage.removeItem('user');
                localStorage.removeItem('authToken');
                window.location.href = '/login.html';
                return;
            }

            // Sign out from Cognito
            await Amplify.Auth.signOut();
            
            // Clear local storage
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
            
            // Redirect to login page
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Sign out error:', error);
            // Clear local storage anyway
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
            window.location.href = '/login.html';
        }
    }

    // Sync user to backend database
    async syncUserToDatabase(userData) {
        try {
            // Determine auth provider from user data or context
            const authProvider = userData.auth_provider || 'Cognito';
            
            const response = await fetch('/api/users/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cognito_user_id: userData.id,
                    email: userData.email,
                    name: userData.name,
                    auth_provider: authProvider
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to sync user');
            }
            
            const result = await response.json();
            console.log('User synced to database:', result);
            return result;
        } catch (error) {
            console.error('Error syncing user to database:', error);
            throw error;
        }
    }

    // Get current authenticated user (for use across pages)
    async getCurrentUser() {
        if (this.useMockAuth) {
            const userStr = localStorage.getItem('user');
            const token = localStorage.getItem('authToken');
            if (userStr && token) {
                return JSON.parse(userStr);
            }
            return null;
        }

        try {
            const user = await Amplify.Auth.currentAuthenticatedUser();
            const userAttributes = await Amplify.Auth.userAttributes(user);
            
            const emailAttr = userAttributes.find(attr => attr.Name === 'email');
            const nameAttr = userAttributes.find(attr => attr.Name === 'name');
            const givenNameAttr = userAttributes.find(attr => attr.Name === 'given_name');
            
            return {
                id: user.username || user.sub || user.userId || user.attributes?.sub,
                email: emailAttr?.Value || user.email || user.attributes?.email || '',
                name: nameAttr?.Value || givenNameAttr?.Value || user.name || user.attributes?.name || 'User'
            };
        } catch (error) {
            return null;
        }
    }

    // Mock login function (replace with AWS Cognito)
    async mockLogin(email, password) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For development: accept any valid email/password
        if (email && password) {
            return {
                success: true,
                token: 'mock_jwt_token_' + Date.now(),
                user: {
                    id: 'user_123',
                    email: email,
                    name: 'Test User'
                }
            };
        }
        
        return {
            success: false,
            message: 'Invalid credentials'
        };
    }

    // Mock signup function (replace with AWS Cognito)
    async mockSignup(name, email, password) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Validate inputs
        if (!name || name.trim().length < 2) {
            return {
                success: false,
                message: 'Name must be at least 2 characters'
            };
        }
        
        if (!email || !this.validateEmail(email)) {
            return {
                success: false,
                message: 'Please enter a valid email address'
            };
        }
        
        if (!password || password.length < 8) {
            return {
                success: false,
                message: 'Password must be at least 8 characters'
            };
        }
        
        // For development: accept any valid input
        // In production, this would be replaced with Cognito
        return {
            success: true,
            requiresVerification: false, // Mock doesn't require email verification
            user: {
                id: 'mock_user_' + Date.now(),
                email: email,
                name: name
            }
        };
    }


}

// Initialize auth manager when DOM is loaded
// Make it globally accessible for SSO checks across pages
let authManager;
document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
    window.authManager = authManager; // Make available globally
});

