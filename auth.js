// Authentication Handler for n8tive.io

class AuthManager {
    constructor() {
        this.initializeForms();
        this.initializeTabSwitcher();
        this.initializePasswordToggles();
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
            // TODO: Replace with AWS Cognito authentication
            // Example AWS Cognito code (to be implemented):
            // const cognitoUser = await this.signInWithCognito(email, password);
            
            // Simulated API call for now
            const result = await this.mockLogin(email, password);
            
            if (result.success) {
                // Store auth token/session
                localStorage.setItem('authToken', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                
                // Redirect to home page
                window.location.href = '/';
            } else {
                this.showError('login-error', result.message || 'Invalid email or password');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('login-error', 'An error occurred. Please try again.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
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
            // TODO: Replace with AWS Cognito signup
            // Example AWS Cognito code (to be implemented):
            // const cognitoUser = await this.signUpWithCognito(email, password, name);
            
            // Simulated API call for now
            const result = await this.mockSignup(name, email, password);
            
            if (result.success) {
                // Show success message and redirect to login or verification
                alert('Account created successfully! Please check your email to verify your account.');
                
                // Switch to login tab
                document.getElementById('login-tab').click();
            } else {
                this.showError('signup-error', result.message || 'Failed to create account');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showError('signup-error', 'An error occurred. Please try again.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    // Handle social login
    async handleSocialLogin(e) {
        const button = e.currentTarget;
        const provider = button.textContent.trim();
        
        // TODO: Implement AWS Cognito Federated Identity
        alert(`${provider} authentication will be available soon!`);
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
        
        // For development: accept any valid input
        if (name && email && password) {
            return {
                success: true,
                user: {
                    id: 'user_' + Date.now(),
                    email: email,
                    name: name
                }
            };
        }
        
        return {
            success: false,
            message: 'Failed to create account'
        };
    }


}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});

