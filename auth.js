// Authentication Handler for n8tive.io

class AuthManager {
    constructor() {
        // Note: Amplify is optional - OAuth works without it via manual URL building
        // Only log if we're trying to use Cognito features that require Amplify
        
        this.initializeForms();
        this.initializeTabSwitcher();
        this.initializePasswordToggles();
        this.initializeCognito();
        this.checkAuthCallback();
        
        // Delay session check to avoid race conditions
        setTimeout(() => {
            this.checkExistingSession().catch(error => {
                console.error('Error in checkExistingSession:', error);
                // Don't redirect on error - let user stay on login page
            });
        }, 100);
        
        // Reset buttons when page is restored from cache (back/forward navigation)
        window.addEventListener('pageshow', (event) => {
            // event.persisted is true when page is loaded from cache
            if (event.persisted) {
                this.resetSocialLoginButtons();
            }
        });
        
        // Reset buttons when page becomes visible (user navigates back)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Page is now visible - reset buttons in case user navigated back
                setTimeout(() => {
                    this.resetSocialLoginButtons();
                }, 100);
            }
        });
        
        // Reset buttons when window gains focus (user switches back to tab)
        window.addEventListener('focus', () => {
            this.resetSocialLoginButtons();
        });
    }

    // Initialize AWS Cognito
    initializeCognito(retryCount = 0) {
        console.log('[AUTH] Initializing Cognito (attempt ' + (retryCount + 1) + ')...');
        
        // Limit retries to prevent infinite loops
        if (retryCount > 30) {
            console.error('[AUTH] Amplify failed to load after 30 retries. Using mock authentication.');
            this.useMockAuth = true;
            // Still allow OAuth to work by building URL manually if config exists
            return;
        }

        // Wait for Amplify to load if it's not ready yet
        if (typeof Amplify === 'undefined') {
            // Check if window.amplifyLoaded is false (all CDNs failed)
            if (window.amplifyLoaded === false && retryCount > 3) {
                // All CDNs failed - this is OK, OAuth works without Amplify
                // Only set useMockAuth if Cognito isn't configured
                if (!CognitoConfig || !CognitoConfig.userPoolId || CognitoConfig.userPoolId === 'YOUR_USER_POOL_ID') {
                    this.useMockAuth = true;
                }
                return;
            }
            
            // Only log every 10th attempt to reduce console noise
            if (retryCount === 0 || (retryCount % 10 === 0 && retryCount < 30)) {
                // Silent retry - don't spam console
            }
            // Retry after a delay
            setTimeout(() => this.initializeCognito(retryCount + 1), 500);
            return;
        }

        if (!CognitoConfig) {
            console.warn('[AUTH] CognitoConfig not found. Using mock authentication.');
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
            console.warn('[AUTH] Cognito configuration contains placeholders. Using mock authentication.');
            console.warn('[AUTH] Please update cognito-config.js with your actual Cognito settings.');
            this.useMockAuth = true;
            return;
        }
        
        // Validate redirect URI configuration
        const redirectUri = typeof CognitoConfig.redirectUri === 'function' 
            ? CognitoConfig.redirectUri() 
            : CognitoConfig.redirectUri;
        
        if (!redirectUri || !redirectUri.includes('/api/oauth/callback')) {
            console.warn('[AUTH] Redirect URI may not be correctly configured:', redirectUri);
            console.warn('[AUTH] Expected redirect URI to include /api/oauth/callback');
        } else {
            console.log('[AUTH] Redirect URI configured:', redirectUri);
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
            console.log('[AUTH] AWS Cognito initialized successfully');
            console.log('[AUTH] OAuth configuration:', {
                domain: CognitoConfig.oauthDomain,
                redirectUri: redirectUri,
                responseType: 'code',
                scopes: CognitoConfig.oauthScopes
            });
        } catch (error) {
            console.error('[AUTH] Failed to initialize Cognito:', error);
            console.error('[AUTH] Error details:', error.message, error.stack);
            this.useMockAuth = true;
        }
    }

    // Check if this is an OAuth callback
    checkAuthCallback() {
        console.log('[AUTH] Checking for OAuth callback...');
        
        // Reset social login buttons first (in case user navigated back)
        this.resetSocialLoginButtons();
        
        // Check for OAuth callback flag from server-side callback handler
        // The server-side handler stores code in localStorage to avoid URL params
        const callbackReceived = sessionStorage.getItem('oauth_callback_received');
        const oauthCode = localStorage.getItem('oauthCode');
        const oauthCodeTimestamp = localStorage.getItem('oauthCodeTimestamp');
        
        // Also check URL params as fallback (for direct callbacks)
        const urlParams = new URLSearchParams(window.location.search);
        const urlCode = urlParams.get('code') || urlParams.get('oauth_code');
        const urlError = urlParams.get('error') || urlParams.get('oauth_error');
        const urlState = urlParams.get('state');
        
        // Check for error in sessionStorage (from server-side callback)
        const sessionError = sessionStorage.getItem('oauth_error');
        const sessionErrorDesc = sessionStorage.getItem('oauth_error_description');
        
        console.log('[AUTH] Callback check results:', {
            callbackReceived,
            hasOAuthCode: !!oauthCode,
            hasUrlCode: !!urlCode,
            hasUrlError: !!urlError,
            hasSessionError: !!sessionError,
            codeAge: oauthCodeTimestamp ? (Date.now() - parseInt(oauthCodeTimestamp)) / 1000 + 's' : 'N/A'
        });
        
        // CRITICAL: Immediately clean URL BEFORE any processing
        // Safari misinterprets OAuth callback URLs with query params as downloads
        // This must happen synchronously, before any async operations
        if (urlCode || urlError || callbackReceived || sessionError) {
            // Clean URL immediately
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('[AUTH] URL cleaned to prevent Safari download detection');
        }
        
        // Handle error from sessionStorage (server-side callback)
        if (sessionError) {
            console.error('[AUTH] OAuth error from sessionStorage:', sessionError, sessionErrorDesc);
            const errorDescription = sessionErrorDesc || 'Authentication failed';
            sessionStorage.removeItem('oauth_error');
            sessionStorage.removeItem('oauth_error_description');
            sessionStorage.removeItem('oauth_callback_received');
            
            setTimeout(() => {
                this.handleOAuthError(sessionError, errorDescription);
            }, 0);
            return;
        }
        
        // Handle error from URL params (fallback)
        if (urlError) {
            const errorDescription = urlParams.get('error_description') || urlParams.get('errorMessage') || 'Authentication failed';
            console.error('[AUTH] OAuth error from URL:', urlError, errorDescription);
            
            setTimeout(() => {
                this.handleOAuthError(urlError, errorDescription);
            }, 0);
            return;
        }
        
        // Handle OAuth code from localStorage (preferred - from server-side callback)
        if (callbackReceived && oauthCode) {
            // Check if code is recent (within 5 minutes)
            const codeAge = oauthCodeTimestamp ? (Date.now() - parseInt(oauthCodeTimestamp)) / 1000 : Infinity;
            if (codeAge > 300) {
                console.warn('[AUTH] OAuth code expired, clearing...');
                localStorage.removeItem('oauthCode');
                localStorage.removeItem('oauthCodeTimestamp');
                sessionStorage.removeItem('oauth_callback_received');
                this.resetSocialLoginButtons();
                return;
            }
            
            console.log('[AUTH] OAuth callback received from server-side handler, code:', oauthCode.substring(0, 10) + '...');
            const state = sessionStorage.getItem('oauth_state');
            
            // Clear callback flag
            sessionStorage.removeItem('oauth_callback_received');
            
            // Process callback asynchronously after URL is cleaned
            setTimeout(() => {
                this.handleOAuthCallback(oauthCode, state);
            }, 0);
            return;
        }
        
        // Handle OAuth code from URL params (fallback - direct callback)
        if (urlCode) {
            console.log('[AUTH] OAuth callback received from URL, code:', urlCode.substring(0, 10) + '...');
            
            setTimeout(() => {
                this.handleOAuthCallback(urlCode, urlState);
            }, 0);
            return;
        }
        
        // No callback detected - user might have navigated back
        console.log('[AUTH] No OAuth callback detected, resetting buttons');
        this.resetSocialLoginButtons();
    }

    // Handle OAuth error (called after URL is cleaned)
    handleOAuthError(error, errorDescription) {
        console.error('[AUTH] OAuth error:', error, errorDescription);
        
        // Decode URL-encoded error message
        const decodedError = decodeURIComponent((errorDescription || '').replace(/\+/g, ' '));
        
        // Show user-friendly error message
        let userMessage = decodedError || 'Authentication failed. Please try again.';
        if (decodedError.includes('not available') || decodedError.includes('Login option is not available')) {
            userMessage = 'Google/GitHub/Apple login is not configured in AWS Cognito. Please contact support or use email/password sign-in.';
        } else if (decodedError.includes('redirect_uri') || decodedError.includes('redirect')) {
            userMessage = 'Redirect URI mismatch. Please check Cognito App Client settings and ensure the redirect URI matches exactly.';
        } else if (decodedError.includes('access_denied')) {
            userMessage = 'Access denied. Please authorize the application to continue.';
        }
        
        console.error('[AUTH] Showing error to user:', userMessage);
        
        // Show error to user
        const errorElement = document.getElementById('login-error') || document.getElementById('signup-error');
        if (errorElement) {
            this.showError(errorElement.id, userMessage);
        } else {
            // If error element doesn't exist yet, show alert
            alert(userMessage);
        }
        
        // Reset buttons after error
        this.resetSocialLoginButtons();
    }
    
    // Handle OAuth callback (called after URL is cleaned)
    async handleOAuthCallback(code, state) {
        console.log('[AUTH] handleOAuthCallback called with code:', code ? code.substring(0, 10) + '...' : 'missing', 'state:', state ? 'present' : 'missing');
        
        // Validate state parameter for security
        if (state) {
            const storedState = sessionStorage.getItem('oauth_state');
            if (storedState && storedState !== state) {
                console.error('[AUTH] OAuth state mismatch - possible CSRF attack');
                console.error('[AUTH]   Expected:', storedState);
                console.error('[AUTH]   Received:', state);
                this.resetSocialLoginButtons();
                const errorId = document.getElementById('login-error') ? 'login-error' : 'signup-error';
                this.showError(errorId, 'Security validation failed. Please try again.');
                sessionStorage.removeItem('oauth_state');
                localStorage.removeItem('oauthCode');
                localStorage.removeItem('oauthCodeTimestamp');
                return;
            }
            sessionStorage.removeItem('oauth_state');
            console.log('[AUTH] State validated successfully');
        }
        
        // Clear OAuth code from localStorage (we're processing it now)
        localStorage.removeItem('oauthCode');
        localStorage.removeItem('oauthCodeTimestamp');
        
        try {
            // If we have Amplify, use it to exchange code for tokens
            if (typeof Amplify !== 'undefined' && !this.useMockAuth) {
                console.log('[AUTH] Using Amplify to exchange code for tokens...');
                
                // Use Amplify's currentAuthenticatedUser which automatically handles OAuth callback
                // This will exchange the authorization code for tokens
                const user = await Amplify.Auth.currentAuthenticatedUser();
                
                if (user) {
                    console.log('[AUTH] User authenticated via Amplify:', user.username || user.sub);
                    
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
                    
                    console.log('[AUTH] User data extracted:', { id: userData.id, email: userData.email, name: userData.name });
                    
                    // Get session token
                    try {
                        const session = await Amplify.Auth.currentSession();
                        const token = session.getIdToken().getJwtToken();
                        localStorage.setItem('authToken', token);
                        console.log('[AUTH] Session token stored');
                    } catch (tokenError) {
                        console.warn('[AUTH] Could not retrieve session token:', tokenError);
                    }
                    
                    localStorage.setItem('user', JSON.stringify(userData));
                    
                    // Sync user to backend database (optional)
                    try {
                        console.log('[AUTH] Syncing user to database...');
                        await this.syncUserToDatabase(userData);
                        console.log('[AUTH] User synced to database successfully');
                    } catch (syncError) {
                        console.warn('[AUTH] Failed to sync user to database:', syncError);
                        // Don't block authentication if sync fails
                    }
                    
                    // Clean URL and redirect to home
                    window.history.replaceState({}, document.title, window.location.pathname);
                    
                    console.log('[AUTH] Authentication successful, redirecting to home...');
                    
                    // Use direct href assignment for proper HTTP redirect
                    // Safari recognizes this as a navigation, not a download
                    // Small delay to ensure state is saved
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 100);
                    return;
                } else {
                    console.error('[AUTH] Amplify returned null user');
                }
            }
            
            // Fallback: If Amplify not available, exchange code manually via backend
            console.warn('[AUTH] Amplify not available, cannot exchange code for tokens');
            console.warn('[AUTH] This should not happen - Amplify should be loaded for OAuth');
            
            const errorId = document.getElementById('login-error') ? 'login-error' : 'signup-error';
            this.showError(errorId, 'Authentication service unavailable. Please try again.');
            
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
        } catch (error) {
            console.error('[AUTH] OAuth callback error:', error);
            console.error('[AUTH] Error stack:', error.stack);
            
            // Try to get more specific error information
            let errorMessage = 'Authentication failed. Please try again.';
            if (error.message) {
                console.error('[AUTH] Error message:', error.message);
                if (error.message.includes('not authenticated')) {
                    errorMessage = 'Authentication session expired. Please try again.';
                } else if (error.message.includes('Network')) {
                    errorMessage = 'Network error. Please check your connection and try again.';
                } else if (error.message.includes('User does not exist')) {
                    errorMessage = 'User account not found. Please sign up first.';
                }
            }
            
            const errorId = document.getElementById('login-error') ? 'login-error' : 'signup-error';
            this.showError(errorId, errorMessage);
            
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Reset buttons
            this.resetSocialLoginButtons();
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
            // Store original HTML for reset
            if (!btn.dataset.originalHtml) {
                btn.dataset.originalHtml = btn.innerHTML;
            }
            btn.addEventListener('click', (e) => this.handleSocialLogin(e));
        });
        
        // Reset all social login buttons on page load
        this.resetSocialLoginButtons();
    }
    
    // Reset all social login buttons to their original state
    resetSocialLoginButtons() {
        document.querySelectorAll('.social-login').forEach(btn => {
            const originalHtml = btn.dataset.originalHtml || this.getDefaultButtonHtml(btn);
            btn.disabled = false;
            btn.innerHTML = originalHtml;
            feather.replace();
        });
    }
    
    // Get default button HTML based on button content
    getDefaultButtonHtml(button) {
        // Try to find the provider name from the button
        const text = button.textContent.trim().toLowerCase();
        const providerMap = {
            'google': '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg><span class="text-sm">Google</span>',
            'github': '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg><span class="text-sm">GitHub</span>',
            'apple': '<svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="overflow: visible; display: block; width: 1.25rem; height: 1.25rem;"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg><span class="text-sm">Apple</span>'
        };
        
        // Check if button contains provider name
        for (const [provider, html] of Object.entries(providerMap)) {
            if (text.includes(provider)) {
                return html;
            }
        }
        
        // Fallback: return current HTML if we can't determine
        return button.innerHTML;
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
        // Prevent default behavior to avoid Safari download detection
        e.preventDefault();
        e.stopPropagation();
        
        const button = e.currentTarget;
        const provider = button.textContent.trim().toLowerCase();
        
        // Show loading state
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i data-feather="loader" class="w-5 h-5 animate-spin"></i> <span class="text-sm">Connecting...</span>';
        feather.replace();
        
        try {
            // OAuth works without Amplify - build URL directly from CognitoConfig
            // Check if Cognito is configured
            if (!CognitoConfig || !CognitoConfig.userPoolId || CognitoConfig.userPoolId === 'YOUR_USER_POOL_ID') {
                // Cognito not configured - show error
                button.disabled = false;
                button.innerHTML = originalText;
                feather.replace();
                const errorId = document.getElementById('login-error') ? 'login-error' : 'signup-error';
                this.showError(errorId, `${provider.charAt(0).toUpperCase() + provider.slice(1)} authentication requires AWS Cognito configuration. Please configure Cognito or use email/password sign-in.`);
                return;
            }
            
            // Map provider name to Cognito identity provider
            const providerMap = {
                'google': 'Google',
                'github': 'GitHub',
                'apple': 'SignInWithApple'
            };
            
            const cognitoProvider = providerMap[provider];
            
            if (!cognitoProvider) {
                throw new Error(`Unsupported provider: ${provider}`);
            }
            
            // Build OAuth URL directly from CognitoConfig (Amplify not needed)
            console.log('[AUTH] Building OAuth URL from CognitoConfig');
            
            // Get redirect URI - must match exactly what's configured in Cognito
            // CRITICAL: Ensure redirect URI is properly formatted (no trailing slash, absolute URL)
            // Handle both function and string redirectUri
            let baseRedirectUri;
            if (typeof CognitoConfig.redirectUri === 'function') {
                baseRedirectUri = CognitoConfig.redirectUri();
            } else {
                baseRedirectUri = CognitoConfig.redirectUri || (window.location.protocol + '//' + window.location.host + '/login.html');
            }
            
            // Ensure no trailing slash
            if (baseRedirectUri.endsWith('/')) {
                baseRedirectUri = baseRedirectUri.slice(0, -1);
            }
            
            const redirectUri = encodeURIComponent(baseRedirectUri);
            console.log('[AUTH] Using redirect URI:', baseRedirectUri);
            const clientId = CognitoConfig.clientId;
            const domain = CognitoConfig.oauthDomain;
            const scopes = Array.isArray(CognitoConfig.oauthScopes) 
                ? CognitoConfig.oauthScopes.join('+') 
                : 'openid+email+profile';
            
            // Build the Cognito Hosted UI URL with identity provider
            // Use proper OAuth 2.0 parameters with state for security
            // Note: access_type=offline is handled by Cognito, not needed in URL
            const state = this.generateState();
            const oauthUrl = `https://${domain}/oauth2/authorize?identity_provider=${cognitoProvider}&redirect_uri=${redirectUri}&response_type=code&client_id=${clientId}&scope=${scopes}&state=${encodeURIComponent(state)}`;
            
            // Store state for validation
            sessionStorage.setItem('oauth_state', state);
            
            // Clear any previous callback data
            localStorage.removeItem('oauthCode');
            localStorage.removeItem('oauthCodeTimestamp');
            sessionStorage.removeItem('oauth_callback_received');
            sessionStorage.removeItem('oauth_error');
            sessionStorage.removeItem('oauth_error_description');
            
            console.log('[AUTH] OAuth Configuration:');
            console.log('[AUTH]   - Provider:', cognitoProvider);
            console.log('[AUTH]   - Redirect URI:', CognitoConfig.redirectUri || window.location.origin + '/login.html');
            console.log('[AUTH]   - Client ID:', clientId);
            console.log('[AUTH]   - Domain:', domain);
            console.log('[AUTH]   - Scopes:', scopes);
            console.log('[AUTH]   - Response Type: code');
            console.log('[AUTH]   - State:', state);
            console.log('[AUTH] Redirecting to OAuth URL:', oauthUrl);
            
            // CRITICAL: Use location.replace() instead of href for Safari compatibility
            // location.replace() doesn't create a history entry and Safari handles it better
            // This prevents Safari from misinterpreting the redirect as a download
            // Use a small delay to ensure button state is saved
            setTimeout(() => {
                // Try replace first (better for Safari), fallback to href
                try {
                    window.location.replace(oauthUrl);
                } catch (e) {
                    // Fallback if replace fails
                    window.location.href = oauthUrl;
                }
            }, 50);
            
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
    
    // Generate OAuth state parameter for CSRF protection and Safari compatibility
    generateState() {
        const array = new Uint8Array(32);
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(array);
        } else {
            // Fallback for older browsers
            for (let i = 0; i < array.length; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
        }
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
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

        // If user explicitly navigated to login (not redirected), allow them to stay
        // Check for a flag that indicates user wants to login
        const wantsToLogin = sessionStorage.getItem('wantsToLogin');
        if (wantsToLogin) {
            console.log('User wants to login, skipping redirect check');
            sessionStorage.removeItem('wantsToLogin');
            return; // Don't redirect, let them login
        }

        // If Amplify failed to load, don't check session (stay on login page)
        if (window.amplifyLoaded === false || (typeof Amplify === 'undefined' && window.amplifyLoaded === false)) {
            console.log('Amplify failed to load, staying on login page');
            return; // Don't redirect, let them use mock auth
        }

        // Wait a bit for Cognito to initialize
        await new Promise(resolve => setTimeout(resolve, 500));

        if (this.useMockAuth) {
            // Check localStorage for mock auth
            const user = localStorage.getItem('user');
            const token = localStorage.getItem('authToken');
            if (user && token) {
                try {
                    // Verify the token is still valid (not expired)
                    const userData = JSON.parse(user);
                    // Only redirect if we have valid user data
                    if (userData && userData.email) {
                        // User is already authenticated, redirect to home
                        window.location.href = '/';
                    }
                } catch (e) {
                    // Invalid user data, clear it
                    localStorage.removeItem('user');
                    localStorage.removeItem('authToken');
                }
            }
            return;
        }

        try {
            // Check if user has a valid Cognito session
            if (typeof Amplify === 'undefined' || !Amplify.Auth) {
                console.log('Amplify not initialized, skipping session check');
                return;
            }

            const user = await Amplify.Auth.currentAuthenticatedUser();
            
            if (user) {
                // Verify session is still valid by trying to get the session
                try {
                    const session = await Amplify.Auth.currentSession();
                    // If we can get a session, it's valid
                    if (session) {
                        // User is already authenticated with valid session, redirect to home
                        console.log('User already authenticated, redirecting...');
                        window.location.href = '/';
                        return;
                    }
                } catch (sessionError) {
                    // Session invalid or expired, clear and stay on login page
                    console.log('Session invalid or expired, clearing...', sessionError);
                    localStorage.removeItem('user');
                    localStorage.removeItem('authToken');
                    // Don't redirect, let them login
                }
            }
        } catch (error) {
            // User is not authenticated OR error occurred, stay on login page
            console.log('No active session found or error checking session:', error);
            // Clear any stale data
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
            // IMPORTANT: Don't redirect on error - let user stay on login page
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
    // Don't auto-initialize - let the page handle initialization after Amplify loads
    // authManager = new AuthManager();
    // window.authManager = authManager; // Make available globally
});

