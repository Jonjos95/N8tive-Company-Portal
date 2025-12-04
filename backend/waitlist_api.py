#!/usr/bin/env python3
"""
Waitlist API Server
Handles waitlist form submissions and stores data in SQLite database
"""

from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime
try:
    import stripe
except ImportError:
    stripe = None  # Stripe is optional

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Stripe configuration (optional)
if stripe:
    stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')
    STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
else:
    STRIPE_WEBHOOK_SECRET = ''

# Subscription plans (price IDs from Stripe)
PLANS = {
    'free': {
        'stripe_price_id': None,
        'name': 'Free',
        'price': 0,
        'currency': 'usd'
    },
    'pro': {
        'stripe_price_id': os.environ.get('STRIPE_PRO_PRICE_ID', 'price_1SPlRyBTJt2ybYLKPxnE2bKY'),
        'name': 'Pro',
        'price': 9.99,
        'currency': 'usd'
    },
    'business': {
        'stripe_price_id': os.environ.get('STRIPE_BUSINESS_PRICE_ID', 'price_1SPlSrBTJt2ybYLKzrlEToNK'),
        'name': 'Business',
        'price': 29.99,
        'currency': 'usd'
    },
    'enterprise': {
        'stripe_price_id': os.environ.get('STRIPE_ENTERPRISE_PRICE_ID', 'price_1SPlTXBTJt2ybYLKlMMyEwdb'),
        'name': 'Enterprise',
        'price': 99.99,
        'currency': 'usd'
    }
}

# Database configuration
DB_PATH = os.path.join(os.path.dirname(__file__), 'waitlist.db')

def init_db():
    """Initialize the database and create tables if they don't exist"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Waitlist table (linked to users)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS waitlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            product TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            UNIQUE(email)
        )
    ''')
    
    # Subscriptions table (linked to users)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            user_email TEXT NOT NULL,
            stripe_customer_id TEXT,
            stripe_subscription_id TEXT,
            stripe_price_id TEXT,
            plan_name TEXT NOT NULL,
            status TEXT NOT NULL,
            current_period_start TIMESTAMP,
            current_period_end TIMESTAMP,
            cancel_at_period_end INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    ''')
    
    # Users table (for syncing Cognito users)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cognito_user_id TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL,
            name TEXT,
            auth_provider TEXT,
            role TEXT DEFAULT 'user',
            is_dev_account INTEGER DEFAULT 0,
            subscription_tier TEXT DEFAULT 'free',
            subscription_override INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # User roles/permissions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            permission TEXT NOT NULL,
            resource TEXT,
            granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, permission, resource)
        )
    ''')
    
    conn.commit()
    conn.close()
    print(f"Database initialized at {DB_PATH}")

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # This allows column access by name
    return conn

@app.route('/api/waitlist', methods=['POST'])
@app.route('/api/waitlist/', methods=['POST'])
def submit_waitlist():
    """Handle waitlist form submission (with optional Cognito user linking)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        product = data.get('product', 'all').strip()
        cognito_user_id = data.get('cognito_user_id')  # Optional: link to authenticated user
        
        if not name:
            return jsonify({'error': 'Name is required'}), 400
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        # Basic email validation
        if '@' not in email or '.' not in email.split('@')[1]:
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Get user_id if cognito_user_id is provided
        user_id = None
        if cognito_user_id:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('SELECT id FROM users WHERE cognito_user_id = ?', (cognito_user_id,))
            user_row = cursor.fetchone()
            if user_row:
                user_id = user_row[0]
            conn.close()
        
        # Insert into database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO waitlist (user_id, name, email, product)
                VALUES (?, ?, ?, ?)
            ''', (user_id, name, email, product))
            conn.commit()
            waitlist_id = cursor.lastrowid
            conn.close()
            
            return jsonify({
                'success': True,
                'message': 'Successfully added to waitlist',
                'id': waitlist_id,
                'linked_to_user': user_id is not None
            }), 201
            
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Email already registered'
            }), 409
            
    except Exception as e:
        print(f"Error processing waitlist submission: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/waitlist', methods=['GET'])
@app.route('/api/waitlist/', methods=['GET'])
def get_waitlist():
    """Get all waitlist entries (for admin purposes)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, name, email, product, created_at
            FROM waitlist
            ORDER BY created_at DESC
        ''')
        
        entries = []
        for row in cursor.fetchall():
            entries.append({
                'id': row['id'],
                'name': row['name'],
                'email': row['email'],
                'product': row['product'],
                'created_at': row['created_at']
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'count': len(entries),
            'entries': entries
        }), 200
        
    except Exception as e:
        print(f"Error fetching waitlist: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/subscription/create-checkout-session', methods=['POST'])
def create_checkout_session():
    """Create a Stripe checkout session for subscription"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        plan_name = data.get('plan', '').strip().lower()
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        if not plan_name or plan_name not in PLANS:
            return jsonify({'error': 'Invalid plan selected'}), 400
        
        plan = PLANS[plan_name]
        
        # Free plan doesn't need Stripe
        if plan_name == 'free':
            return jsonify({
                'success': True,
                'message': 'Free plan activated',
                'plan': plan_name
            }), 200
        
        if not plan['stripe_price_id']:
            return jsonify({'error': 'Plan not configured for payments'}), 400
        
        # Create or retrieve Stripe customer
        try:
            customers = stripe.Customer.list(email=email, limit=1)
            if customers.data:
                customer = customers.data[0]
            else:
                customer = stripe.Customer.create(email=email)
        except Exception as e:
            print(f"Error creating/retrieving customer: {str(e)}")
            return jsonify({'error': 'Failed to create customer'}), 500
        
        # Create checkout session
        try:
            origin = request.headers.get('Origin', request.headers.get('Referer', 'http://localhost:5000'))
            if origin.endswith('/'):
                origin = origin[:-1]
            
            checkout_session = stripe.checkout.Session.create(
                customer=customer.id,
                payment_method_types=['card'],
                line_items=[{
                    'price': plan['stripe_price_id'],
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=origin + '/?success=true&session_id={CHECKOUT_SESSION_ID}',
                cancel_url=origin + '/pricing.html?canceled=true',
                metadata={
                    'user_email': email,
                    'plan_name': plan_name
                }
            )
            
            return jsonify({
                'success': True,
                'sessionId': checkout_session.id,
                'url': checkout_session.url
            }), 200
            
        except Exception as e:
            print(f"Error creating checkout session: {str(e)}")
            return jsonify({'error': 'Failed to create checkout session'}), 500
            
    except Exception as e:
        print(f"Error processing checkout: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/oauth/callback', methods=['GET'])
def oauth_callback():
    """
    Server-side OAuth callback handler to prevent Safari download prompts.
    Returns HTML page that completes OAuth flow via JavaScript.
    This endpoint MUST work even if other dependencies fail.
    CRITICAL: Always returns text/html Content-Type to prevent Safari download detection.
    """
    
    # Get OAuth parameters from query string
    code = request.args.get('code')
    error = request.args.get('error')
    error_description = request.args.get('error_description', '')
    state = request.args.get('state')
    
    # Log callback received for debugging
    print(f"[OAUTH CALLBACK] Received callback - code: {'present' if code else 'missing'}, error: {error}, state: {'present' if state else 'missing'}")
    print(f"[OAUTH CALLBACK] Request URL: {request.url}")
    print(f"[OAUTH CALLBACK] Request headers: {dict(request.headers)}")
    
    # HTML template that handles OAuth callback client-side
    # This prevents Safari from seeing a redirect, which triggers download prompts
    # CRITICAL: Store params in sessionStorage/localStorage instead of URL params
    html_template = '''
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-Content-Type-Options" content="nosniff">
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>Completing Sign In...</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: #0a0a0a;
                color: #fff;
            }
            .container {
                text-align: center;
            }
            .spinner {
                border: 3px solid #333;
                border-top: 3px solid #8b5cf6;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="spinner"></div>
            <p>Completing sign in...</p>
        </div>
        <script>
            console.log('[OAUTH CALLBACK] Starting callback processing...');
            
            // Extract OAuth parameters from URL BEFORE cleaning
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const error = urlParams.get('error');
            const errorDescription = urlParams.get('error_description') || '';
            const state = urlParams.get('state');
            
            console.log('[OAUTH CALLBACK] Extracted params:', { 
                hasCode: !!code, 
                hasError: !!error, 
                hasState: !!state,
                error: error,
                errorDescription: errorDescription
            });
            
            // CRITICAL: Immediately clean URL to prevent Safari download detection
            // This must happen BEFORE any async operations
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('[OAUTH CALLBACK] URL cleaned, redirecting...');
            
            if (error) {
                // Handle OAuth error - store in sessionStorage to avoid URL params
                const decodedError = decodeURIComponent(errorDescription.replace(/\\+/g, ' '));
                console.error('[OAUTH CALLBACK] OAuth error:', error, decodedError);
                
                // Store error in sessionStorage instead of URL
                sessionStorage.setItem('oauth_error', error);
                sessionStorage.setItem('oauth_error_description', decodedError);
                
                // Redirect to login page WITHOUT query params
                setTimeout(() => {
                    window.location.replace('/login.html');
                }, 100);
            } else if (code) {
                // Store OAuth code and state in localStorage/sessionStorage
                // This avoids passing params in URL which Safari might misinterpret
                console.log('[OAUTH CALLBACK] Storing OAuth code and redirecting...');
                
                if (state) {
                    sessionStorage.setItem('oauth_state', state);
                }
                localStorage.setItem('oauthCode', code);
                localStorage.setItem('oauthCodeTimestamp', Date.now().toString());
                
                // Set a flag to indicate callback was received
                sessionStorage.setItem('oauth_callback_received', 'true');
                
                // Redirect to login page WITHOUT query params
                // The login page will check localStorage for the code
                setTimeout(() => {
                    window.location.replace('/login.html');
                }, 100);
            } else {
                // No code or error - redirect to login
                console.warn('[OAUTH CALLBACK] No code or error found, redirecting to login');
                setTimeout(() => {
                    window.location.replace('/login.html');
                }, 100);
            }
        </script>
    </body>
    </html>
    '''
    
    # CRITICAL: Explicitly set Content-Type to text/html
    # This prevents Safari from misinterpreting the response as a download
    response = render_template_string(html_template)
    response.headers['Content-Type'] = 'text/html; charset=UTF-8'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    
    print(f"[OAUTH CALLBACK] Returning HTML response with Content-Type: text/html")
    return response, 200

@app.route('/api/subscription/webhook', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhook events"""
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    
    if not STRIPE_WEBHOOK_SECRET:
        return jsonify({'error': 'Webhook secret not configured'}), 500
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        print(f"Invalid payload: {str(e)}")
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError as e:
        print(f"Invalid signature: {str(e)}")
        return jsonify({'error': 'Invalid signature'}), 400
    
    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        handle_checkout_completed(session)
    elif event['type'] == 'customer.subscription.created':
        subscription = event['data']['object']
        handle_subscription_created(subscription)
    elif event['type'] == 'customer.subscription.updated':
        subscription = event['data']['object']
        handle_subscription_updated(subscription)
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        handle_subscription_deleted(subscription)
    
    return jsonify({'success': True}), 200

def handle_checkout_completed(session):
    """Handle successful checkout"""
    try:
        customer_id = session.get('customer')
        subscription_id = session.get('subscription')
        email = session.get('metadata', {}).get('user_email')
        
        if subscription_id:
            subscription = stripe.Subscription.retrieve(subscription_id)
            save_subscription(email, customer_id, subscription)
    except Exception as e:
        print(f"Error handling checkout completed: {str(e)}")

def handle_subscription_created(subscription):
    """Handle subscription creation"""
    try:
        customer = stripe.Customer.retrieve(subscription.customer)
        email = customer.email
        save_subscription(email, subscription.customer, subscription)
    except Exception as e:
        print(f"Error handling subscription created: {str(e)}")

def handle_subscription_updated(subscription):
    """Handle subscription updates"""
    try:
        customer = stripe.Customer.retrieve(subscription.customer)
        email = customer.email
        save_subscription(email, subscription.customer, subscription)
    except Exception as e:
        print(f"Error handling subscription updated: {str(e)}")

def handle_subscription_deleted(subscription):
    """Handle subscription cancellation"""
    try:
        customer = stripe.Customer.retrieve(subscription.customer)
        email = customer.email
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE subscriptions
            SET status = 'canceled',
                updated_at = CURRENT_TIMESTAMP
            WHERE stripe_subscription_id = ?
        ''', (subscription.id,))
        
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error handling subscription deleted: {str(e)}")

def save_subscription(email, customer_id, subscription):
    """Save or update subscription in database (linked to users table)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get user_id from email (link to users table)
        user_id = None
        cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
        user_row = cursor.fetchone()
        if user_row:
            user_id = user_row[0]
        
        # Get plan name from price ID
        price_id = subscription['items']['data'][0]['price']['id']
        plan_name = 'pro'  # Default, should be determined from price_id
        
        for key, plan in PLANS.items():
            if plan.get('stripe_price_id') == price_id:
                plan_name = key
                break
        
        # Check if subscription exists
        cursor.execute('''
            SELECT id FROM subscriptions
            WHERE stripe_subscription_id = ?
        ''', (subscription.id,))
        
        existing = cursor.fetchone()
        
        if existing:
            # Update existing (also update user_id if it changed)
            cursor.execute('''
                UPDATE subscriptions
                SET user_id = ?,
                    status = ?,
                    current_period_start = ?,
                    current_period_end = ?,
                    cancel_at_period_end = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE stripe_subscription_id = ?
            ''', (
                user_id,
                subscription.status,
                datetime.fromtimestamp(subscription.current_period_start).isoformat(),
                datetime.fromtimestamp(subscription.current_period_end).isoformat(),
                1 if subscription.cancel_at_period_end else 0,
                subscription.id
            ))
        else:
            # Insert new
            cursor.execute('''
                INSERT INTO subscriptions 
                (user_id, user_email, stripe_customer_id, stripe_subscription_id, stripe_price_id, plan_name, status, current_period_start, current_period_end)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id,
                email,
                customer_id,
                subscription.id,
                price_id,
                plan_name,
                subscription.status,
                datetime.fromtimestamp(subscription.current_period_start).isoformat(),
                datetime.fromtimestamp(subscription.current_period_end).isoformat()
            ))
        
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error saving subscription: {str(e)}")

@app.route('/api/subscription/status', methods=['GET'])
def get_subscription_status():
    """Get subscription status for a user (by email or cognito_user_id)"""
    try:
        email = request.args.get('email', '').strip().lower()
        cognito_user_id = request.args.get('cognito_user_id')
        
        if not email and not cognito_user_id:
            return jsonify({'error': 'Email or cognito_user_id is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # If cognito_user_id provided, get user_id first
        if cognito_user_id:
            cursor.execute('SELECT id FROM users WHERE cognito_user_id = ?', (cognito_user_id,))
            user_row = cursor.fetchone()
            if user_row:
                user_id = user_row[0]
                cursor.execute('''
                    SELECT * FROM subscriptions
                    WHERE user_id = ?
                    ORDER BY created_at DESC
                    LIMIT 1
                ''', (user_id,))
            else:
                # User not found in database, return no subscription
                conn.close()
                return jsonify({
                    'success': True,
                    'subscription': {
                        'plan': 'free',
                        'status': 'none'
                    }
                }), 200
        else:
            # Use email to find subscription
            cursor.execute('''
                SELECT * FROM subscriptions
                WHERE user_email = ?
                ORDER BY created_at DESC
                LIMIT 1
            ''', (email,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return jsonify({
                'success': True,
                'subscription': {
                    'plan': row['plan_name'],
                    'status': row['status'],
                    'current_period_end': row['current_period_end'],
                    'cancel_at_period_end': bool(row['cancel_at_period_end'])
                }
            }), 200
        else:
            return jsonify({
                'success': True,
                'subscription': {
                    'plan': 'free',
                    'status': 'none'
                }
            }), 200
            
    except Exception as e:
        print(f"Error fetching subscription status: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'}), 200

def sync_cognito_user(cognito_user_id, email, name=None, auth_provider=None):
    """
    Sync a Cognito user to the local database
    This can be called from your frontend after successful authentication
    Automatically upgrades to dev account if email matches dev account
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if user already exists
        cursor.execute('SELECT id, is_dev_account FROM users WHERE cognito_user_id = ?', (cognito_user_id,))
        existing = cursor.fetchone()
        
        # Check if this email should be a dev account
        cursor.execute('SELECT id, is_dev_account FROM users WHERE email = ?', (email,))
        email_match = cursor.fetchone()
        
        is_dev = False
        if email_match and email_match[1] == 1:
            is_dev = True
        
        if existing:
            user_id = existing[0]
            # Update last login and sync dev status
            cursor.execute('''
                UPDATE users 
                SET last_login = CURRENT_TIMESTAMP, 
                    updated_at = CURRENT_TIMESTAMP,
                    email = ?,
                    name = COALESCE(?, name),
                    is_dev_account = ?,
                    role = CASE WHEN ? = 1 THEN 'admin' ELSE role END
                WHERE cognito_user_id = ?
            ''', (email, name, is_dev, is_dev, cognito_user_id))
        elif email_match:
            # User exists with this email but different cognito_user_id - update it
            user_id = email_match[0]
            cursor.execute('''
                UPDATE users 
                SET cognito_user_id = ?,
                    last_login = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP,
                    name = COALESCE(?, name),
                    auth_provider = ?
                WHERE id = ?
            ''', (cognito_user_id, name, auth_provider, user_id))
        else:
            # Insert new user
            cursor.execute('''
                INSERT INTO users (cognito_user_id, email, name, auth_provider, last_login, is_dev_account, role)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CASE WHEN ? = 1 THEN 'admin' ELSE 'user' END)
            ''', (cognito_user_id, email, name, auth_provider, is_dev, is_dev))
            user_id = cursor.lastrowid
        
        # If dev account, ensure permissions are set
        if is_dev:
            permissions = [
                ('admin', 'all'),
                ('read', 'all'),
                ('write', 'all'),
                ('delete', 'all'),
                ('manage_subscriptions', 'all'),
                ('manage_users', 'all'),
                ('toggle_tiers', 'all'),
                ('access_rls', 'all')
            ]
            for permission, resource in permissions:
                cursor.execute('''
                    INSERT OR IGNORE INTO user_permissions (user_id, permission, resource)
                    VALUES (?, ?, ?)
                ''', (user_id, permission, resource))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error syncing Cognito user: {str(e)}")
        return False

@app.route('/api/users/sync', methods=['POST'])
def sync_user():
    """
    Endpoint to sync a Cognito user to the database
    Called from frontend after successful authentication
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        cognito_user_id = data.get('cognito_user_id')
        email = data.get('email')
        
        if not cognito_user_id or not email:
            return jsonify({'error': 'cognito_user_id and email are required'}), 400
        
        name = data.get('name')
        auth_provider = data.get('auth_provider')  # 'Google', 'GitHub', 'Cognito'
        
        success = sync_cognito_user(cognito_user_id, email, name, auth_provider)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'User synced successfully'
            }), 200
        else:
            return jsonify({'error': 'Failed to sync user'}), 500
            
    except Exception as e:
        print(f"Error in sync_user endpoint: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/users', methods=['GET'])
def get_users():
    """
    Get all users from the database
    Requires authentication token in header
    """
    try:
        # TODO: Add authentication check here
        # token = request.headers.get('Authorization')
        # if not verify_cognito_token(token):
        #     return jsonify({'error': 'Unauthorized'}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, cognito_user_id, email, name, auth_provider, 
                   created_at, last_login
            FROM users
            ORDER BY created_at DESC
        ''')
        
        users = []
        for row in cursor.fetchall():
            users.append({
                'id': row[0],
                'cognito_user_id': row[1],
                'email': row[2],
                'name': row[3],
                'auth_provider': row[4],
                'created_at': row[5],
                'last_login': row[6]
            })
        
        conn.close()
        return jsonify({'users': users}), 200
        
    except Exception as e:
        print(f"Error getting users: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ===== DEV ACCOUNT & ADMIN FUNCTIONS =====

def create_dev_account(email, name, cognito_user_id=None):
    """Create a dev account with admin privileges"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if user already exists
        if cognito_user_id:
            cursor.execute('SELECT id FROM users WHERE cognito_user_id = ?', (cognito_user_id,))
        else:
            cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
        
        existing = cursor.fetchone()
        
        if existing:
            # Update existing user to dev account
            user_id = existing[0]
            cursor.execute('''
                UPDATE users 
                SET role = 'admin',
                    is_dev_account = 1,
                    subscription_tier = 'enterprise',
                    subscription_override = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (user_id,))
        else:
            # Create new dev account
            cursor.execute('''
                INSERT INTO users (
                    cognito_user_id, email, name, role, is_dev_account, 
                    subscription_tier, subscription_override
                )
                VALUES (?, ?, ?, 'admin', 1, 'enterprise', 1)
            ''', (cognito_user_id or f'dev_{email}', email, name))
            user_id = cursor.lastrowid
        
        # Grant all permissions
        permissions = [
            ('admin', 'all'),
            ('read', 'all'),
            ('write', 'all'),
            ('delete', 'all'),
            ('manage_subscriptions', 'all'),
            ('manage_users', 'all'),
            ('toggle_tiers', 'all'),
            ('access_rls', 'all')
        ]
        
        for permission, resource in permissions:
            cursor.execute('''
                INSERT OR IGNORE INTO user_permissions (user_id, permission, resource)
                VALUES (?, ?, ?)
            ''', (user_id, permission, resource))
        
        conn.commit()
        conn.close()
        
        return {
            'success': True,
            'user_id': user_id,
            'message': 'Dev account created/updated successfully'
        }
    except Exception as e:
        print(f"Error creating dev account: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

@app.route('/api/admin/create-dev-account', methods=['POST'])
def create_dev_account_endpoint():
    """Create a dev account (admin only)"""
    try:
        data = request.get_json()
        
        # For security, you might want to add authentication here
        # For now, allowing direct creation for dev setup
        
        email = data.get('email', '').strip().lower()
        name = data.get('name', 'Dev Account').strip()
        cognito_user_id = data.get('cognito_user_id')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        result = create_dev_account(email, name, cognito_user_id)
        
        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 500
            
    except Exception as e:
        print(f"Error in create_dev_account_endpoint: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/toggle-subscription', methods=['POST'])
def toggle_subscription_tier():
    """Toggle subscription tier for a user (dev/admin only)"""
    try:
        data = request.get_json()
        
        email = data.get('email', '').strip().lower()
        cognito_user_id = data.get('cognito_user_id')
        tier = data.get('tier', 'free')  # free, pro, business, enterprise
        
        if tier not in ['free', 'pro', 'business', 'enterprise']:
            return jsonify({'error': 'Invalid tier. Must be: free, pro, business, enterprise'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Find user
        if cognito_user_id:
            cursor.execute('SELECT id, is_dev_account FROM users WHERE cognito_user_id = ?', (cognito_user_id,))
        else:
            cursor.execute('SELECT id, is_dev_account FROM users WHERE email = ?', (email,))
        
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return jsonify({'error': 'User not found'}), 404
        
        user_id = user[0]
        is_dev = user[1]
        
        # Only allow for dev accounts or if explicitly allowed
        if not is_dev:
            conn.close()
            return jsonify({'error': 'Only dev accounts can toggle subscription tiers'}), 403
        
        # Update subscription tier
        cursor.execute('''
            UPDATE users 
            SET subscription_tier = ?,
                subscription_override = 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (tier, user_id))
        
        # Also update or create subscription record
        cursor.execute('''
            SELECT id FROM subscriptions WHERE user_id = ?
        ''', (user_id,))
        sub = cursor.fetchone()
        
        if sub:
            cursor.execute('''
                UPDATE subscriptions
                SET plan_name = ?,
                    status = 'active',
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            ''', (tier, user_id))
        else:
            cursor.execute('''
                INSERT INTO subscriptions (
                    user_id, user_email, plan_name, status
                )
                SELECT id, email, ?, 'active'
                FROM users WHERE id = ?
            ''', (tier, user_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'Subscription tier updated to {tier}',
            'tier': tier
        }), 200
        
    except Exception as e:
        print(f"Error toggling subscription: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/user-info', methods=['GET'])
def get_user_info():
    """Get user information including roles and permissions"""
    try:
        email = request.args.get('email', '').strip().lower()
        cognito_user_id = request.args.get('cognito_user_id')
        
        if not email and not cognito_user_id:
            return jsonify({'error': 'Email or cognito_user_id is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get user info
        if cognito_user_id:
            cursor.execute('''
                SELECT id, cognito_user_id, email, name, role, is_dev_account, 
                       subscription_tier, subscription_override, created_at, last_login
                FROM users WHERE cognito_user_id = ?
            ''', (cognito_user_id,))
        else:
            cursor.execute('''
                SELECT id, cognito_user_id, email, name, role, is_dev_account, 
                       subscription_tier, subscription_override, created_at, last_login
                FROM users WHERE email = ?
            ''', (email,))
        
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return jsonify({'error': 'User not found'}), 404
        
        # Get permissions
        cursor.execute('''
            SELECT permission, resource FROM user_permissions
            WHERE user_id = ?
        ''', (user[0],))
        
        permissions = [{'permission': row[0], 'resource': row[1]} for row in cursor.fetchall()]
        
        # Get subscription info
        cursor.execute('''
            SELECT plan_name, status, current_period_start, current_period_end
            FROM subscriptions WHERE user_id = ?
            ORDER BY created_at DESC LIMIT 1
        ''', (user[0],))
        
        sub = cursor.fetchone()
        subscription = None
        if sub:
            subscription = {
                'plan': sub[0],
                'status': sub[1],
                'current_period_start': sub[2],
                'current_period_end': sub[3]
            }
        
        conn.close()
        
        return jsonify({
            'success': True,
            'user': {
                'id': user[0],
                'cognito_user_id': user[1],
                'email': user[2],
                'name': user[3],
                'role': user[4],
                'is_dev_account': bool(user[5]),
                'subscription_tier': user[6],
                'subscription_override': bool(user[7]),
                'created_at': user[8],
                'last_login': user[9],
                'permissions': permissions,
                'subscription': subscription
            }
        }), 200
        
    except Exception as e:
        print(f"Error getting user info: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def check_user_permission(user_id, permission, resource='all'):
    """Check if user has a specific permission (RLS helper)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if user is admin/dev account
        cursor.execute('SELECT role, is_dev_account FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        
        if user and (user[0] == 'admin' or user[1] == 1):
            conn.close()
            return True  # Dev accounts have all permissions
        
        # Check specific permission
        cursor.execute('''
            SELECT id FROM user_permissions
            WHERE user_id = ? AND permission = ? 
            AND (resource = ? OR resource = 'all')
        ''', (user_id, permission, resource))
        
        has_permission = cursor.fetchone() is not None
        conn.close()
        
        return has_permission
    except Exception as e:
        print(f"Error checking permission: {str(e)}")
        return False

if __name__ == '__main__':
    # Initialize database
    init_db()
    
    # Create default dev account if it doesn't exist
    # You can customize this email
    default_dev_email = 'dev@n8tive.io'
    print(f"Creating default dev account: {default_dev_email}")
    create_dev_account(default_dev_email, 'Dev Account')
    
    # Run Flask app
    app.run(host='0.0.0.0', port=5000, debug=False)
